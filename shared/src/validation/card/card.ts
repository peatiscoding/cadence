import { z } from 'zod'
// User validation schemas

// Approval Token schema
export const ApprovalTokenSchema = z.object({
  kind: z.literal('basic'),
  note: z.string(),
  author: z.string(),
  date: z.number(),
  isNegative: z.boolean(),
  voided: z.tuple([z.number(), z.string()]).optional()
})

export const CardSchema = z.object({
  workflowId: z.string().min(1),
  workflowCardId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().min(1),
  type: z.string().min(1),
  value: z.number().default(0),
  owner: z.string().min(0),
  fieldData: z.record(z.any()).default({}),
  approvalTokens: z.record(z.array(ApprovalTokenSchema)).default({})
})
