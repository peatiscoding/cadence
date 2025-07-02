import { z } from 'zod'

export const TypeSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  ui: z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
  })
})

export type WorkflowType = z.infer<typeof TypeSchema>
