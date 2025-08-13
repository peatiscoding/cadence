import { z } from 'zod'

// LoV provider schema definitions
export const LovAPIDefinitionSchema = z.object({
  kind: z.literal('api'),
  url: z.string(),
  headers: z.record(z.string()),
  listOfValueSelector: z.string(), // dot (.) separated string pointed to an array.
  valueSelector: z.string(), // from the array instance select the string | number to represent value.
  keySelector: z.string() // from the array instance select the string | number to represent key.
})

export const LovGoogleSheetDefinitionSchema = z.object({
  kind: z.literal('googlesheet'),
  sheetId: z.string(), // google sheet' id
  dir: z.enum(['LR', 'TB']), // LR = Left to Right, TB = Top to Bottom range selection should have only size of 1 on the respected orientation.
  keyRange: z.string(), // A1N range that select the key
  valueRange: z.string() // A1N range that select the value array
})

export const LovProviderDefinitionSchema = z.discriminatedUnion('kind', [
  LovAPIDefinitionSchema,
  LovGoogleSheetDefinitionSchema
])

export const LovDefinitionSchema = z.object({
  cacheKey: z.string().optional(),
  provider: LovProviderDefinitionSchema
})
