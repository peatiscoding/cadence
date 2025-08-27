import { z } from 'zod'
// User validation schemas

export const CardSchema = z.object({
  workflowId: z.string().min(1),
  workflowCardId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().min(1),
  type: z.string().min(1),
  value: z.number().default(0),
  owner: z.string().min(0),
  fieldData: z.record(z.any()).default({})
})
