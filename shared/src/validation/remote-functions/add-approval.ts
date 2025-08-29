/**
 * Add Approval Remote Function Validation Schemas
 */
import { z } from 'zod'
import { ApprovalTokenSchema } from '../card/card'

/**
 * Schema for AddApprovalRequest
 */
export const AddApprovalRequestSchema = z.object({
  workflowId: z.string().min(1),
  cardId: z.string().min(1),
  approvalKey: z.string().min(1),
  note: z.string(),
  isNegative: z.boolean().default(false)
})

/**
 * Schema for AddApprovalResponse
 */
export const AddApprovalResponseSchema = z.object({
  success: z.boolean(),
  approvalToken: ApprovalTokenSchema
})

/**
 * Type inference from schemas
 */
export type AddApprovalRequest = z.infer<typeof AddApprovalRequestSchema>
export type AddApprovalResponse = z.infer<typeof AddApprovalResponseSchema>