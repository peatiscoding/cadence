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
export class UpdateStatisticsDiffer {
  public constructor(
    public batch: FirebaseFirestore.WriteBatch,
    public db: FirebaseFirestore.Firestore,
    public readonly workflowId: string,
    public readonly cardId: string
  ) {}

  public compute(
    beforeData: IWorkflowCardEntry | null,
    afterData: IWorkflowCardEntry | null,
    action: ActivityAction,
    userId: string
  ) {
    const now = Timestamp.now()

    switch (action) {
      case 'create':
        if (afterData) {
          this.updateStatsForCreate(afterData, userId, now)
        }
        break

      case 'update':
        if (beforeData && afterData) {
          this.updateStatsForUpdate(beforeData, afterData, userId, now)
        }
        break

      case 'transit':
        if (beforeData && afterData) {
          this.updateStatsForTransit(beforeData, afterData, userId, now)
        }
        break

      case 'delete':
        if (beforeData) {
          this.updateStatsForDelete(beforeData, now)
        }
        break
    }
  }

  private updateStatsForCreate(cardData: IWorkflowCardEntry, userId: string, timestamp: Timestamp) {
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
        totalTransitionTime: 0,
        totalTransitionCount: 0,
        lastUpdated: timestamp,
        currentPendings: [newPending]
      },
      { merge: true }
    )

    this.batch.update(statsRef, {
      currentPendings: FieldValue.arrayUnion(newPending),
      lastUpdated: timestamp
    })
  }

  private updateStatsForUpdate(
    beforeData: IWorkflowCardEntry,
    afterData: IWorkflowCardEntry,
    userId: string,
    timestamp: Timestamp
  ) {
    const db = this.db
    const workflowId = this.workflowId
    const cardId = this.cardId
    // Only update if value changed and status remained the same
    if (beforeData.value !== afterData.value && beforeData.status === afterData.status) {
      const statsPath = paths.STATS_PER_STATUS(workflowId, afterData.status)
      const statsRef = db.doc(statsPath)

      // Remove old pending entry
      const oldPending: StatusPending = {
        cardId,
        statusSince: Timestamp.fromMillis(beforeData.statusSince),
        value: beforeData.value || 0,
        userId: beforeData.updatedBy || userId
      }

      // Add new pending entry
      const newPending: StatusPending = {
        cardId,
        statusSince: Timestamp.fromMillis(beforeData.statusSince), // Keep original status time
        value: afterData.value || 0,
        userId
      }

      this.batch.update(statsRef, {
        currentPendings: FieldValue.arrayRemove(oldPending),
        lastUpdated: timestamp
      })

      this.batch.update(statsRef, {
        currentPendings: FieldValue.arrayUnion(newPending),
        lastUpdated: timestamp
      })
    }
  }

  private updateStatsForTransit(
    beforeData: IWorkflowCardEntry,
    afterData: IWorkflowCardEntry,
    userId: string,
    timestamp: Timestamp
  ) {
    const db = this.db
    const workflowId = this.workflowId
    const cardId = this.cardId
    const oldStatsPath = paths.STATS_PER_STATUS(workflowId, beforeData.status)
    const newStatsPath = paths.STATS_PER_STATUS(workflowId, afterData.status)

    const oldStatsRef = db.doc(oldStatsPath)
    const newStatsRef = db.doc(newStatsPath)

    // Calculate time spent in old status
    const timeSpent = timestamp.toMillis() - beforeData.statusSince

    // Remove from old status stats
    const oldPending: StatusPending = {
      cardId,
      statusSince: Timestamp.fromMillis(beforeData.statusSince),
      value: beforeData.value || 0,
      userId: beforeData.updatedBy || userId
    }

    this.batch.update(oldStatsRef, {
      totalTransitionTime: FieldValue.increment(timeSpent),
      totalTransitionCount: FieldValue.increment(1),
      currentPendings: FieldValue.arrayRemove(oldPending),
      lastUpdated: timestamp
    })

    // Add to new status stats
    const newPending: StatusPending = {
      cardId,
      statusSince: timestamp,
      value: afterData.value || 0,
      userId
    }

    // Initialize new stats document if it doesn't exist
    this.batch.set(
      newStatsRef,
      {
        workflowId,
        totalTransitionTime: 0,
        totalTransitionCount: 0,
        lastUpdated: timestamp,
        currentPendings: []
      },
      { merge: true }
    )

    this.batch.update(newStatsRef, {
      currentPendings: FieldValue.arrayUnion(newPending),
      lastUpdated: timestamp
    })
  }

  private async updateStatsForDelete(
    beforeData: IWorkflowCardEntry,
    timestamp: Timestamp
  ): Promise<void> {
    const workflowId = this.workflowId
    const cardId = this.cardId
    const statsPath = paths.STATS_PER_STATUS(workflowId, beforeData.status)
    const statsRef = this.db.doc(statsPath)

    // Calculate time spent in status
    const timeSpent = timestamp.toMillis() - beforeData.statusSince

    // Remove from current pendings
    const oldPending: StatusPending = {
      cardId,
      statusSince: Timestamp.fromMillis(beforeData.statusSince),
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

      // Create activity log entry
      const activityLog: ActivityLog = {
        workflowId,
        workflowCardId: cardId,
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
      const differ = new UpdateStatisticsDiffer(batch, db, workflowId, cardId)
      differ.compute(beforeData, afterData, action, userId)

      // Commit all changes atomically
      await batch.commit()
    } catch (error) {
      console.error('Error logging card activity:', error)
      throw error
    }
  }
}
