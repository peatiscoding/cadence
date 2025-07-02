import type { WorkflowConfiguration } from '@cadence/shared/validation'

const _helpers = {
  evalAclStatement(rawStatement: string, currentUserEmail: string): boolean {
    const stmt = rawStatement.toLowerCase().trim()
    if (stmt.startsWith('*') || stmt.startsWith('@')) {
      return currentUserEmail.endsWith(stmt.replace(/^\*/, ''))
    }
    return stmt === currentUserEmail.toLowerCase()
  }
}

/**
 * Evaluate if given currentUserEmail may access this workflow
 *
 * @returns boolean - true if user is allowed to access false otherwise.
 */
export const canAccessWorkflow = (
  workflowAccessConfig: Pick<WorkflowConfiguration, 'access'>,
  currentUserEmail: string
): boolean => {
  if (workflowAccessConfig.access) {
    const aclStatements: string[] = workflowAccessConfig.access
    return aclStatements.some((stmt) => _helpers.evalAclStatement(stmt, currentUserEmail))
  }
  return true
}
