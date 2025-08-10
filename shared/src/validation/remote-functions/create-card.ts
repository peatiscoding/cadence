import { z } from 'zod'

/**
 * Schema for CreateCardRequest
 */
export const CreateCardRequestSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  cardId: z.string().min(1).optional(),
  payload: z
    .record(z.string(), z.any())
    .refine((payload) => Object.keys(payload).length > 0, { message: 'Payload cannot be empty' })
})

/**
 * Schema for CreateCardResponse
 */
export const CreateCardResponseSchema = z.object({
  cardId: z.string().min(1),
  workflowId: z.string().min(1),
  success: z.boolean()
})

