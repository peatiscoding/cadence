import { z } from 'zod'
import { ActionUnionSchema } from '../action/action'

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
  transition: z.array(ActionUnionSchema).optional(),
  finally: z.array(ActionUnionSchema).optional()
})
