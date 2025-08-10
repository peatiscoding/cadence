import type { App } from 'firebase-admin/app'
import type {
  IActionRunner,
  TransitWorkflowItemRequest,
  ITransitWorkflowItemResponse
} from '@cadence/shared/types'

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { supportedWorkflows } from '@cadence/shared/defined'
import { paths } from '@cadence/shared/models'

const _helpers = {
  omit<T>(d: T, ...keys: (keyof T)[]): Partial<T> {
    const _d: Partial<T> = { ...d }
    for (const k of keys) {
      delete _d[k]
    }
    return _d
  }
}

export const transitWorkflowItem =
  (app: App, getActionRunner: () => IActionRunner) =>
  async (
    data: TransitWorkflowItemRequest,
    uid?: string,
    email?: string
  ): Promise<ITransitWorkflowItemResponse> => {
    const fs = getFirestore(app)
    const start = new Date().getTime()
    const transitionStats: { executionKind: string; in: number }[] = []
    const finallyStats: { executionKind: string; in: number }[] = []
    const runner = getActionRunner()
    const destinationContext = data.destinationContext
    const workflow = supportedWorkflows.find(
      (wf) => wf.workflowId === destinationContext.workflowId
    )
    const docRef = fs.doc(
      paths.WORKFLOW_CARD(destinationContext.workflowId, destinationContext.workflowCardId)
    )

    const userEmail = email || uid
    const userId = uid || 'unknown-user'
    logger.log(
      `Attempt to transit with user: ${userEmail} on ${destinationContext.workflowId}/${destinationContext.workflowCardId} to ${destinationContext.status}.`
    )
    if (!userEmail) {
      throw new Error(`Invalid session. Login is required`)
    }
    try {
      if (!workflow) {
        throw new Error(`Unknown workflow: ${destinationContext.workflowId}.`)
      }

      const targetStatus = workflow.statuses.find((s) => destinationContext.status === s.slug)
      if (!targetStatus) {
        throw new Error(`Unknown workflow's status: ${destinationContext.status}`)
      }

      const doc = await docRef.get()
      if (!doc.exists) {
        throw new Error(`Unknown workflow item`)
      }

      const currentStatus = doc.data()?.status

      if (destinationContext.status === currentStatus) {
        throw new Error(
          `No transition required. Item is already in desire status "${currentStatus}".`
        )
      }

      // Validate documents per status' requirement.
      // FIXME: implement the status transitioning validation (required.*)

      // Pre Transit
      const beforeTransitActions = targetStatus.transition || []
      if (beforeTransitActions.length > 0) {
        await runner.run(destinationContext, beforeTransitActions, { runInParallel: false })
      }

      // Update database (transit)
      const f = _helpers.omit(destinationContext, 'workflowId', 'workflowCardId')
      await docRef.update({
        ...f,
        statusSince: FieldValue.serverTimestamp(),
        updatedBy: userId,
        updatedAt: FieldValue.serverTimestamp()
      })

      // Post Transit (Finally)
      const afterTransitActions = targetStatus.finally || []
      if (afterTransitActions.length > 0) {
        await runner.run(destinationContext, afterTransitActions, { runInParallel: true })
      }

      return {
        doneIn: new Date().getTime() - start,
        transition: transitionStats,
        finally: finallyStats
      }
    } catch (e) {
      throw new Error(`Cannot transit card to ${destinationContext.status}: ${e}`)
    }
  }
