import { z } from 'zod'
import { LovDefinitionSchema } from './lovs'

// Field schema definitions
const NumberFieldSchema = z.object({
  kind: z.literal('number'),
  default: z.number().optional(),
  max: z.number(),
  min: z.number()
})

const TextFieldSchema = z.object({
  kind: z.literal('text'),
  default: z.string().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  choices: z.array(z.string()).optional(),
  lov: LovDefinitionSchema.optional(),
  asDocumentId: z.boolean().optional(),
  regex: z.string().optional()
})

const ChoiceFieldSchema = z.object({
  kind: z.literal('choice'),
  default: z.string().optional(),
  choices: z.array(z.string()).optional()
})

const MultipleChoiceFieldSchema = z.object({
  kind: z.literal('multi-choice'),
  default: z.string().optional(),
  choices: z.array(z.string()).optional()
})

const BoolFieldSchema = z.object({
  kind: z.literal('bool'),
  default: z.boolean().optional()
})

const UrlFieldSchema = z.object({
  kind: z.literal('url')
})

// List field schema that can contain items of various types
const ListFieldSchema = z.object({
  kind: z.literal('list'),
  itemSchema: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('number'),
      default: z.number().optional(),
      max: z.number(),
      min: z.number()
    }),
    z.object({
      kind: z.literal('text'),
      default: z.string().optional(),
      max: z.number().optional(),
      min: z.number().optional(),
      choices: z.array(z.string()).optional(),
      regex: z.string().optional()
    }),
    z.object({
      kind: z.literal('bool'),
      default: z.boolean().optional()
    }),
    z.object({
      kind: z.literal('url')
    })
  ])
})

const FieldSchemaUnion = z.discriminatedUnion('kind', [
  NumberFieldSchema,
  TextFieldSchema,
  ChoiceFieldSchema,
  MultipleChoiceFieldSchema,
  BoolFieldSchema,
  UrlFieldSchema,
  ListFieldSchema
])

// Field definition
export const FieldSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9_]+$/)
    .describe("Field's slug can be only `camelCase` or `snake_case`."),
  title: z.string(),
  description: z.string().optional(),
  hiddenUnlessDefinedOrRequired: z.boolean().optional(),
  schema: FieldSchemaUnion
})
