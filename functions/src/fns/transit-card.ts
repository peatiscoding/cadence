import type { Firestore } from 'firebase-admin/firestore'
import type { CallableRequest } from 'firebase-functions/https'
import type {
  IActionRunner,
  ITransitWorkflowItemRequest,
  ITransitWorkflowItemResponse
} from '@cadence/shared/types'

import { omit } from 'lodash'
import { firestore } from 'firebase-admin'
import * as logger from 'firebase-functions/logger'
import { supportedWorkflows } from '@cadence/shared/defined'
import { paths } from '@cadence/shared/models'

export const transitCard =
  (getFirestore: () => Firestore, getActionRunner: () => IActionRunner) =>
  async (
    req: CallableRequest<ITransitWorkflowItemRequest>
  ): Promise<ITransitWorkflowItemResponse> => {
    const fs = getFirestore()
    const start = new Date().getTime()
    const transitionStats: { executionKind: string; in: number }[] = []
    const finallyStats: { executionKind: string; in: number }[] = []
    const runner = getActionRunner()
    const destinationContext = req.data.destinationContext
    const workflow = supportedWorkflows.find(
      (wf) => wf.workflowId === destinationContext.workflowId
    )
    const docRef = fs.doc(
      paths.WORKFLOW_CARD(destinationContext.workflowId, destinationContext.workflowCardId)
    )

    const userEmail = req.auth?.token.email || req.auth?.uid
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
      const f = omit(destinationContext, 'workflowId', 'workflowCardId')
      await docRef.update({
        ...f,
        statusSince: firestore.FieldValue.serverTimestamp(),
        updatedBy: userEmail,
        updatedAt: firestore.FieldValue.serverTimestamp()
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
