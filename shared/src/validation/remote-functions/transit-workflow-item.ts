/**
 * Transit Workflow Item Remote Function Validation Schemas
 */

import { z } from 'zod'
import { CardSchema } from '../card/card'

/**
 * Schema for ITransitWorkflowItemRequest
 */
export const TransitWorkflowItemRequestSchema = z.object({
  destinationContext: CardSchema
})

/**
 * Schema for execution stats
 */
const ExecutionStatsSchema = z.array(
  z.object({
    executionKind: z.string(),
    in: z.number().int().min(0)
  })
)

/**
 * Schema for ITransitWorkflowItemResponse
 */
export const TransitWorkflowItemResponseSchema = z.object({
  doneIn: z.number().int().min(0),
  transition: ExecutionStatsSchema,
  finally: ExecutionStatsSchema
})

/**
 * Type inference from schemas
 */
export type ITransitWorkflowItemRequest = z.infer<typeof TransitWorkflowItemRequestSchema>
export type ITransitWorkflowItemResponse = z.infer<typeof TransitWorkflowItemResponseSchema>

/**
 * Validation helper functions
 */
export function validateTransitWorkflowItemRequest(data: unknown): ITransitWorkflowItemRequest {
  return TransitWorkflowItemRequestSchema.parse(data)
}

export function validateTransitWorkflowItemResponse(data: unknown): ITransitWorkflowItemResponse {
  return TransitWorkflowItemResponseSchema.parse(data)
}

