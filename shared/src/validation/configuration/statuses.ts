import { z } from 'zod'

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
  transition: z.array(TransitionActionUnion).optional(),
  finally: z.array(FinallyActionUnion).optional()
})

export type WorkflowStatus = z.infer<typeof StatusSchema>
