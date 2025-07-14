/**
 * Firebase Function to log card activities and update statistics
 *
 * This function triggers on any card document changes and:
 * 1. Creates activity logs for audit purposes
 * 2. Updates aggregated statistics for dashboard display
 */

import type { App } from 'firebase-admin/app'
import type {
  ActivityLog,
  ActivityChange,
  StatusPending,
  ActivityAction,
  IWorkflowCardEntry
} from '@cadence/shared/types'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { paths } from '@cadence/shared/models'

export const _helpers = {
  determineActionType(
    beforeData: IWorkflowCardEntry | null,
    afterData: IWorkflowCardEntry | null
  ): ActivityAction {
    if (!beforeData && afterData) {
      return 'create'
    } else if (beforeData && !afterData) {
      return 'delete'
    } else if (beforeData && afterData) {
      // Check if status changed
      if (beforeData.status !== afterData.status) {
        return 'transit'
      } else {
        return 'update'
      }
    }

    throw new Error('Invalid data state for activity logging')
  },
  generateChanges(
    beforeData: IWorkflowCardEntry | null,
    afterData: IWorkflowCardEntry | null,
    action: ActivityAction
  ): ActivityChange[] {
    const changes: ActivityChange[] = []

    if (action === 'create' && afterData) {
      // For create, only record 'to' values
      _helpers.addChange(changes, 'title', undefined, afterData.title)
      _helpers.addChange(changes, 'status', undefined, afterData.status)
      _helpers.addChange(changes, 'value', undefined, afterData.value)
      _helpers.addChange(changes, 'type', undefined, afterData.type)

      // Add field data changes
      Object.entries(afterData.fieldData || {}).forEach(([key, value]) => {
        _helpers.addChange(changes, `fieldData.${key}`, undefined, value)
      })
    } else if (action === 'delete' && beforeData) {
      // For delete, only record 'from' values
      _helpers.addChange(changes, 'status', beforeData.status, undefined)
      Object.entries(beforeData.fieldData || {}).forEach(([key, value]) => {
        _helpers.addChange(changes, `fieldData.${key}`, value, undefined)
      })
    } else if ((action === 'update' || action === 'transit') && beforeData && afterData) {
      // For update/transit, compare all fields
      _helpers.compareAndAddChange(changes, 'title', beforeData.title, afterData.title)
      _helpers.compareAndAddChange(changes, 'status', beforeData.status, afterData.status)
      _helpers.compareAndAddChange(changes, 'value', beforeData.value, afterData.value)
      _helpers.compareAndAddChange(changes, 'type', beforeData.type, afterData.type)

      // Compare field data
      const beforeFieldData = beforeData.fieldData || {}
      const afterFieldData = afterData.fieldData || {}

      const allKeys = new Set([...Object.keys(beforeFieldData), ...Object.keys(afterFieldData)])

      allKeys.forEach((key) => {
        _helpers.compareAndAddChange(
          changes,
          `fieldData.${key}`,
          beforeFieldData[key],
          afterFieldData[key]
        )
      })
    }

    return changes
  },
  addChange(changes: ActivityChange[], key: string, from: any, to: any): void {
    const change: ActivityChange = { key }
    if (from !== undefined) change.from = from
    if (to !== undefined) change.to = to
    changes.push(change)
  },
  compareAndAddChange(
    changes: ActivityChange[],
    key: string,
    beforeValue: any,
    afterValue: any
  ): void {
    if (beforeValue !== afterValue) {
      _helpers.addChange(changes, key, beforeValue, afterValue)
    }
  }
}

/**
 * Compute the update stats object
 */
export class UpdateTransitionTracker {
  public constructor(
    public batch: FirebaseFirestore.WriteBatch,
    public db: FirebaseFirestore.Firestore,
    public readonly workflowId: string,
    public readonly cardId: string
  ) {}

  public compute(
    action: ActivityAction,
    beforeData: IWorkflowCardEntry | null,
    afterData: IWorkflowCardEntry | null,
    authorUserId: string
  ) {
    const now = Timestamp.now()
    const fromStatus = (!!beforeData && beforeData.status) || null
    const toStatus = (!!afterData && afterData.status) || null

    // nothing to do here
    if (fromStatus === toStatus) {
      return
    }

    if (toStatus && afterData) {
      this.updateStatsForTransitIn(afterData, authorUserId, now)
    }

    if (fromStatus && beforeData) {
      this.updateStatsForTransitOut(beforeData, now)
    }
  }

  /**
   * Tasks
   * ==
   *
   * * Add `currentPendings` record
   * * set timestamp
   */
  private updateStatsForTransitIn(
    cardData: IWorkflowCardEntry,
    userId: string,
    timestamp: Timestamp
  ) {
    const db = this.db
    const workflowId = this.workflowId
    const cardId = this.cardId
    const statsPath = paths.STATS_PER_STATUS(workflowId, cardData.status)
    const statsRef = db.doc(statsPath)

    const newPending: StatusPending = {
      cardId,
      statusSince: timestamp,
      value: cardData.value || 0,
      userId
    }

    this.batch.set(
      statsRef,
      {
        workflowId,
        lastUpdated: timestamp,
        currentPendings: FieldValue.arrayUnion(newPending)
      },
      { merge: true }
    )
  }

  /**
   * TASKS
   *
   * compare time left
   * - set timestamp
   */
  private async updateStatsForTransitOut(
    beforeData: IWorkflowCardEntry,
    timestamp: Timestamp
  ): Promise<void> {
    const workflowId = this.workflowId
    const cardId = this.cardId
    const statsPath = paths.STATS_PER_STATUS(workflowId, beforeData.status)
    const statsRef = this.db.doc(statsPath)

    // Handle statusSince - it could be a Timestamp object or a number (epoch)
    // Check if it has toMillis method (indicating it's a Timestamp object)
    const statusSinceValue = beforeData.statusSince as any
    const statusSinceTimestamp = (statusSinceValue && typeof statusSinceValue.toMillis === 'function')
      ? statusSinceValue as Timestamp
      : Timestamp.fromMillis(beforeData.statusSince as number)

    // Calculate time spent in status
    const timeSpent = timestamp.toMillis() - statusSinceTimestamp.toMillis()

    // Remove from current pendings
    const oldPending: StatusPending = {
      cardId,
      statusSince: statusSinceTimestamp,
      value: beforeData.value || 0,
      userId: beforeData.updatedBy || 'system'
    }

    this.batch.update(statsRef, {
      totalTransitionTime: FieldValue.increment(timeSpent),
      totalTransitionCount: FieldValue.increment(1),
      currentPendings: FieldValue.arrayRemove(oldPending),
      lastUpdated: timestamp
    })
  }
}

export function createCardActivityLogger(app: App) {
  const db = getFirestore(app)

  return async (
    workflowId: string,
    cardId: string,
    beforeData: IWorkflowCardEntry | null,
    afterData: IWorkflowCardEntry | null,
    userId: string = 'system'
  ): Promise<void> => {
    try {
      // Determine action type
      const action = _helpers.determineActionType(beforeData, afterData)

      // Generate change list
      const changes = _helpers.generateChanges(beforeData, afterData, action)

      if (changes.length === 0 && action !== 'delete') {
        return // No changes to log
      }

      // Extract card title - prefer afterData, fallback to beforeData
      const cardTitle = afterData?.title || beforeData?.title || 'Untitled Card'

      // Create activity log entry
      const activityLog: ActivityLog = {
        workflowId,
        workflowCardId: cardId,
        cardTitle,
        userId,
        timestamp: Timestamp.now(),
        action,
        changes
      }

      // Start batch operation for atomic writes
      const batch = db.batch()

      // Add activity log
      const activityRef = db.collection(paths.ACTIVITIES).doc()
      batch.set(activityRef, activityLog)

      // Update statistics
      const differ = new UpdateTransitionTracker(batch, db, workflowId, cardId)
      differ.compute(action, beforeData, afterData, userId)

      // Commit all changes atomically
      await batch.commit()
    } catch (error) {
      console.error('Error logging card activity:', error)
      throw error
    }
  }
}
