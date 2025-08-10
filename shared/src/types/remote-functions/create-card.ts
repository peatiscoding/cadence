import { z } from 'zod'

import { CreateCardRequestSchema, CreateCardResponseSchema } from '../../validation'

export type CreateCardRequest = z.infer<typeof CreateCardRequestSchema>
export type CreateCardResponse = z.infer<typeof CreateCardResponseSchema>
