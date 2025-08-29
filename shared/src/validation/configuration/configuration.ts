import { z } from 'zod'

import { StatusSchema } from './statuses'
import { FieldSchema } from './fields'
import { TypeSchema } from './types'
import { ApprovalDefinitionSchema } from './approvals'

export const ConfigurationSchema = z.object({
  workflowId: z.string(),
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
  approvals: z.array(ApprovalDefinitionSchema).optional(),
  fields: z.array(FieldSchema).refine(
    (arr) =>
      arr.filter((a) => a.schema.kind === 'text' && a.schema.asDocumentId === true).length <= 1, // allowed only 1 asDocumentId = true field.
    'asDocumentId may have only set once.'
  ),
  types: z.array(TypeSchema),
  statuses: z.array(StatusSchema)
}).refine(
  (config) => {
    // Validate that all approval keys referenced in status preconditions exist in approvals definitions
    const definedApprovalKeys = new Set(config.approvals?.map(approval => approval.slug) || [])
    const referencedApprovalKeys = new Set<string>()
    
    // Collect all approval keys referenced in status preconditions
    for (const status of config.statuses) {
      if (status.precondition.approvals) {
        for (const approval of status.precondition.approvals) {
          referencedApprovalKeys.add(approval.key)
        }
      }
    }
    
    // Find missing approval keys
    const missingApprovalKeys: string[] = []
    for (const referencedKey of referencedApprovalKeys) {
      if (!definedApprovalKeys.has(referencedKey)) {
        missingApprovalKeys.push(referencedKey)
      }
    }
    
    // Store missing keys for error message
    if (missingApprovalKeys.length > 0) {
      ;(config as any)._missingApprovalKeys = missingApprovalKeys
      return false
    }
    
    return true
  },
  (config) => ({
    message: `The following approval keys are referenced in status preconditions but not defined in approvals: ${(config as any)._missingApprovalKeys?.join(', ') || 'unknown'}`
  })
)
