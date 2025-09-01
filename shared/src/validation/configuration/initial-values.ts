import z from 'zod'

export const InitialValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string())
])
