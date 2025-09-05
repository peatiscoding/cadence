import type { WorkflowStatus, IWorkflowCard, ITransitWorkflowItemRequest } from '../types'
import { validateApprovalRequirements } from './approval-validation'

/**
 * Validates if transition from current status to target status is allowed
 */
function validateFromStatus(
  precondition: WorkflowStatus['precondition'],
  currentStatus: string,
  targetStatus: string
): void {
  if (precondition.from && precondition.from.length > 0) {
    if (!precondition.from.includes(currentStatus)) {
      throw new Error(
        `Invalid transition from status "${currentStatus}" to "${targetStatus}". ` +
          `Allowed source statuses: ${precondition.from.join(', ')}`
      )
    }
  }
}

/**
 * Validates if current user is authorized to perform the transition
 */
function validateUserAuthorization(
  precondition: WorkflowStatus['precondition'],
  userEmail: string,
  userId: string,
  currentDocData: IWorkflowCard,
  targetStatus: string
): void {
  if (precondition.users && precondition.users.length > 0) {
    const isAuthorized = precondition.users.some((user: string) => {
      if (user === '*') return true // Allow everyone
      if (user === 'owner') return currentDocData?.owner === userId // Only owner
      return user === userEmail || user === userId // Specific user
    })

    if (!isAuthorized) {
      throw new Error(
        `User "${userEmail}" is not authorized to transition to status "${targetStatus}"`
      )
    }
  }
}

/**
 * Validates if all required fields are present and non-empty
 * Supports both backend (ITransitWorkflowItemRequest) and frontend contexts
 */
function validateRequiredFields(
  precondition: WorkflowStatus['precondition'],
  currentDocData: IWorkflowCard,
  destinationContext:
    | ITransitWorkflowItemRequest['destinationContext']
    | { fieldData?: Record<string, any> },
  targetStatus: string
): void {
  if (precondition.required && precondition.required.length > 0) {
    const currentFieldData = currentDocData?.fieldData || {}
    const updatedFieldData = { ...currentFieldData, ...destinationContext.fieldData }
    const missingFields: string[] = []

    for (const requiredField of precondition.required) {
      // Handle special fields that start with '$' (like $.value)
      if (requiredField.startsWith('$')) {
        const fieldKey = requiredField.substring(2) // Remove '$.'
        const value = (currentDocData as any)?.[fieldKey]
        if (value === undefined || value === null || value === '') {
          missingFields.push(requiredField)
        }
      } else {
        // Handle regular field data
        const value = updatedFieldData[requiredField]
        if (value === undefined || value === null || value === '') {
          missingFields.push(requiredField)
        }
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields for status "${targetStatus}": ${missingFields.join(', ')}`
      )
    }
  }
}

/**
 * Validates if all required approvals are satisfied
 */
function validateApprovalRequirementsForStatus(
  precondition: WorkflowStatus['precondition'],
  currentDocData: IWorkflowCard,
  targetStatus: string
): void {
  if (precondition.approvals && precondition.approvals.length > 0) {
    const validationResult = validateApprovalRequirements(currentDocData, precondition.approvals)

    if (!validationResult.valid) {
      throw new Error(
        `Missing required approvals for status "${targetStatus}": <br/>* ${validationResult.missingApprovals.join(',<br/>')}`
      )
    }
  }
}

/**
 * Validates all preconditions for a status transition
 * This is a convenience function that calls all individual validators
 */
export function validateAllPreconditions(
  targetStatus: WorkflowStatus,
  currentStatus: string,
  userEmail: string,
  userId: string,
  currentDocData: IWorkflowCard,
  destinationContext:
    | ITransitWorkflowItemRequest['destinationContext']
    | { fieldData?: Record<string, any> }
): void {
  if (!targetStatus.precondition) {
    return
  }
  validateFromStatus(targetStatus.precondition, currentStatus, targetStatus.slug)
  validateUserAuthorization(
    targetStatus.precondition,
    userEmail,
    userId,
    currentDocData,
    targetStatus.slug
  )
  validateRequiredFields(
    targetStatus.precondition,
    currentDocData,
    destinationContext,
    targetStatus.slug
  )
  validateApprovalRequirementsForStatus(
    targetStatus.precondition,
    currentDocData,
    targetStatus.slug
  )
}

