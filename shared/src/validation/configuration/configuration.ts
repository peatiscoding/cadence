import { z } from 'zod'

import { StatusSchema } from './statuses'
import { FieldSchema } from './fields'
import { TypeSchema } from './types'

export const ConfigurationSchema = z.object({
  name: z.string(), // title of the workflow
  nouns: z
    .object({
      singular: z.string(),
      plural: z.string()
    })
    .default({
      singular: 'Post',
      plural: 'Posts'
    }),
  access: z.array(z.string()).optional(), // in absence of this parameter - will allowed all users to access this workflows
  description: z.string().optional(),
  fields: z.array(FieldSchema),
  types: z.array(TypeSchema),
  statuses: z.array(StatusSchema)
})
