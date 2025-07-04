import type { CallableRequest } from 'firebase-functions/https'
import type {
  IActionRunner,
  ITransitWorkflowItemRequest,
  ITransitWorkflowItemResponse
} from '@cadence/shared/types'

import { supportedWorkflows } from '@cadence/shared/defined'

export const transitCard =
  (getActionRunner: () => IActionRunner) =>
  async (
    req: CallableRequest<ITransitWorkflowItemRequest>
  ): Promise<ITransitWorkflowItemResponse> => {
    const start = new Date().getTime()
    const transitionStats: { executionKind: string; in: number }[] = []
    const finallyStats: { executionKind: string; in: number }[] = []
    const runner = getActionRunner()
    const destinationContext = req.data.destinationContext
    const workflow = supportedWorkflows.find(
      (wf) => wf.workflowId === destinationContext.workflowId
    )
    try {
      if (!workflow) {
        throw new Error(`Unknown workflow: ${destinationContext.workflowId}.`)
      }

      const targetStatus = workflow.statuses.find((s) => destinationContext.status === s.slug)
      if (!targetStatus) {
        throw new Error(`Unknown workflow's status: ${destinationContext.status}`)
      }

      // list hook actions.
      const beforeTransitActions = targetStatus.transition || []
      if (beforeTransitActions.length > 0) {
        await runner.run(destinationContext, beforeTransitActions, { runInParallel: false })
      }
      // TODO: Apply change to the database.
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
