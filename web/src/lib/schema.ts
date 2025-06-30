import { z } from 'zod'

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

const FieldSchemaUnion = z.discriminatedUnion('kind', [
  NumberFieldSchema,
  TextFieldSchema,
  ChoiceFieldSchema,
  MultipleChoiceFieldSchema,
  BoolFieldSchema,
  UrlFieldSchema
])

// Field definition
const FieldSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  schema: FieldSchemaUnion
})

// Action target definitions
const FixedTargetSchema = z.object({
  kind: z.literal('fixed'),
  value: z.string() // hardcoded value
})

const FieldTargetSchema = z.object({
  kind: z.literal('field'),
  field: z.string() // referencing other fields
})

const ActionTargetUnion = z.discriminatedUnion('kind', [FixedTargetSchema, FieldTargetSchema])

// Transition actions
const SetOwnerActionSchema = z.object({
  kind: z.literal('set-owner'),
  to: ActionTargetUnion
})

// Finally actions
const SendEmailActionSchema = z.object({
  kind: z.literal('send-email'),
  to: ActionTargetUnion
})

const TransitionActionUnion = SetOwnerActionSchema
const FinallyActionUnion = SendEmailActionSchema

// Type definition
const TypeSchema = z.object({
  slug: z.string(),
  title: z.string(),
  ui: z.object({
    color: z.string()
  })
})

// Status definition
const StatusSchema = z.object({
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
  transition: z.array(TransitionActionUnion).optional(),
  finally: z.array(FinallyActionUnion).optional()
})

// Main configuration schema
export const ConfigurationSchema = z.object({
  name: z.string(), // title of the workflow
  access: z.array(z.string()).optional(), // in absence of this parameter - will allowed all users to access this workflows
  description: z.string().optional(),
  fields: z.array(FieldSchema),
  types: z.array(TypeSchema),
  statuses: z.array(StatusSchema)
})

// Type exports
export type Configuration = z.infer<typeof ConfigurationSchema>
export type Field = z.infer<typeof FieldSchema>
export type FieldSchemaType = z.infer<typeof FieldSchemaUnion>
export type Type = z.infer<typeof TypeSchema>
export type Status = z.infer<typeof StatusSchema>
export type ActionTarget = z.infer<typeof ActionTargetUnion>
export type TransitionAction = z.infer<typeof TransitionActionUnion>
export type FinallyAction = z.infer<typeof FinallyActionUnion>
