import { z } from 'zod'
import { ActionUnion } from '../action/action.js'

// Status definition
export const StatusSchema = z.object({
  slug: z.string(),
  title: z.string(),
  terminal: z.boolean().default(false),
  ui: z.object({
    color: z.string()
  }),
  precondition: z.object({
    from: z.array(z.string()),
    required: z.array(z.string()).optional(),
    users: z.array(z.string()).optional()
  }),
  transition: z.array(ActionUnion).optional(),
  finally: z.array(ActionUnion).optional()
})

export type WorkflowStatus = z.infer<typeof StatusSchema>
