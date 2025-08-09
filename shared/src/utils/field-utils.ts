import type { WorkflowField } from '../types/common'

/**
 * Utility function to check if a field is an identifier field
 * (a text field with asDocumentId: true)
 */
export function isIdentifierField(field: WorkflowField): boolean {
  return field.schema.kind === 'text' && field.schema.asDocumentId === true
}

/**
 * Utility function to find the identifier field from a list of workflow fields
 * Returns the first identifier field found, or undefined if none exists
 */
export function findIdentifierField(fields: WorkflowField[]): WorkflowField | undefined {
  return fields.find(isIdentifierField)
}
