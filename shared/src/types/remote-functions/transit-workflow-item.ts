import z from 'zod'
import type { TransitWorkflowItemRequestSchema } from '../../validation'

/**
 * Interface for frontend to ask backend to perform hook execution for it.
 */
export type TransitWorkflowItemRequest = z.infer<typeof TransitWorkflowItemRequestSchema>

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
