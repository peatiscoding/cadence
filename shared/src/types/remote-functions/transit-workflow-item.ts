import type { IWorkflowCard } from '../common'

/**
 * Interface for frontend to ask backend to perform hook execution for it.
 */
export interface ITransitWorkflowItemRequest {
  /**
   * contextual data of that card as user has entered.
   */
  destinationContext: IWorkflowCard
}

export interface ITransitWorkflowItemResponse {
  /**
   * number of milliseconds server takes to complete each executions
   */
  doneIn: number
  /**
   * Number of milliseconds server takes to complete the execution
   */
  transition: { executionKind: string; in: number }[]
  /**
   * Number of milliseconds server takes to complete the execution
   */
  finally: { executionKind: string; in: number }[]
}
