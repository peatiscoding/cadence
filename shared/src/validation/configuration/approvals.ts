import { z } from 'zod'

// Approval allowed configuration
export const ApprovalAllowedSchema = z.object({
  kind: z.literal('basic'),
  by: z.string().optional() // Pattern like "$.[field-key] | #.[standard-field] | @.[approval-key]" or hardcoded email
})

// Approval definition in configuration
export const ApprovalDefinitionSchema = z.object({
  slug: z.string(),
  allowed: z.array(ApprovalAllowedSchema)
})

// Approval requirement in status precondition
export const ApprovalRequirementSchema = z.object({
  key: z.string() // references approval slug
})