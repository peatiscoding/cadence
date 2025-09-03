import type {
  ApprovalToken,
  ApprovalRequirement,
  ApprovalDefinition,
  IWorkflowCard,
  WorkflowConfiguration
} from '../types'
import { withContext } from './replaceValue'

/**
 * Gets all non-voided approval tokens for a given approval key
 */
export function getActiveApprovalTokens(card: IWorkflowCard, approvalKey: string): ApprovalToken[] {
  const tokens = (card.approvalTokens || {})[approvalKey] || []
  return tokens.filter((token) => !token.voided)
}

/**
 * Gets the latest non-voided approval token for a given approval key
 */
export function getLatestApprovalToken(
  card: IWorkflowCard,
  approvalKey: string
): ApprovalToken | null {
  const activeTokens = getActiveApprovalTokens(card, approvalKey)
  if (activeTokens.length === 0) return null

  // Sort by date descending and return the latest
  return activeTokens.sort((a, b) => b.date - a.date)[0]
}

/**
 * Checks if an approval requirement is satisfied by checking for valid approval tokens
 */
export function isApprovalRequirementSatisfied(
  card: IWorkflowCard,
  requirement: ApprovalRequirement
): boolean {
  const latestToken = getLatestApprovalToken(card, requirement.key)

  // No approval token means requirement is not satisfied
  if (!latestToken) return false

  // Negative approval means requirement is not satisfied
  if (latestToken.isNegative) return false

  return true
}

/**
 * Validates all approval requirements for a status transition
 */
export function validateApprovalRequirements(
  card: IWorkflowCard,
  requirements: ApprovalRequirement[]
): { valid: boolean; missingApprovals: string[] } {
  const missingApprovals: string[] = []

  for (const requirement of requirements) {
    if (!isApprovalRequirementSatisfied(card, requirement)) {
      missingApprovals.push(requirement.key)
    }
  }

  return {
    valid: missingApprovals.length === 0,
    missingApprovals
  }
}

/**
 * Checks if a user is authorized to provide approval for a given approval key
 */
export function canUserApprove(
  userUid: string,
  approvalKey: string,
  card: IWorkflowCard,
  configuration: WorkflowConfiguration
): boolean {
  const approvalDef = configuration.approvals?.find((a) => a.slug === approvalKey)
  if (!approvalDef) return false

  const replacer = withContext(card)

  // Check each allowed approval type
  for (const allowed of approvalDef.allowed) {
    if (allowed.kind === 'basic') {
      // If no 'by' restriction is set, anyone can approve
      if (!allowed.by) return true

      // Use context replacement to resolve patterns like:
      // $.[field-key] | #.[standard-field] | @.[approval-key]
      try {
        const resolvedBy = replacer.replace(allowed.by)
        if (resolvedBy === userUid) return true
      } catch (error) {
        // If context replacement fails, continue to next allowed approval
        continue
      }
    }
  }

  return false
}

/**
 * Gets the display name for an approval (title with fallback to slug)
 */
export function getApprovalDisplayName(approval: ApprovalDefinition): string {
  return approval.title || approval.slug
}

/**
 * Gets the display name for an approval by key from configuration
 */
export function getApprovalDisplayNameByKey(
  configuration: WorkflowConfiguration,
  approvalKey: string
): string {
  const approval = configuration.approvals?.find((a) => a.slug === approvalKey)
  return approval ? getApprovalDisplayName(approval) : approvalKey
}
