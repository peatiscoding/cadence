import { supportedEmailSenderSuffixes } from '../../defined/supported-constants'
import { z } from 'zod'

/**
 * Post a webhook message
 */
const SendWebhookActionSchema = z.object({
  kind: z.literal('send-webhook'),
  url: z.string(),
  method: z.enum(['post', 'get', 'patch', 'put', 'delete']).default('post'),
  headers: z.map(z.string(), z.string()).optional(),
  body: z.string().optional()
})

/**
 * Set current card's owner
 */
const SetOwnerActionSchema = z.object({
  kind: z.literal('set-owner'),
  to: z.string()
})

/**
 * Send an email
 */
const SendEmailActionSchema = z.object({
  kind: z.literal('send-email'),
  from: z.string().refine((email) => {
    const suffix = email.replace(/^[^@]@/, '').toLowerCase()
    return supportedEmailSenderSuffixes.indexOf(suffix)
  }, `Unsupported email sender`),
  to: z.string(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string(),
  message: z.string()
})

export const ActionUnionSchema = z.discriminatedUnion('kind', [
  SetOwnerActionSchema,
  SendEmailActionSchema,
  SendWebhookActionSchema
])
