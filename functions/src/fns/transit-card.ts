import type { CallableRequest } from 'firebase-functions/https'
import type { IActionRunner, IWorkflowCard } from '@cadence/shared/types'

import { supportedWorkflows } from '@cadence/shared/defined'

/**
 * Interface for frontend to ask backend to perform hook execution for it.
 */
export interface ITransitionRequest {
  /**
   * contextual data of that card as user has entered.
   */
  destinationContext: IWorkflowCard
}

export const transitCard =
  (getActionRunner: () => IActionRunner) =>
  async (req: CallableRequest<ITransitionRequest>): Promise<void> => {
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
    } catch (e) {
      throw new Error(`Cannot transit card to ${destinationContext.status}: ${e}`)
    }
  }
