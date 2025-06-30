import type { Configuration } from '$lib/schema'

/**
 * Evaluate if given currentUserEmail may access this workflow
 *
 * @returns boolean - true if user is allowed to access false otherwise.
 */
export const canAccessWorkflow = (
  workflowAccessConfig: Pick<Configuration, 'access'>,
  currentUserEmail: string
): boolean => {
  if (workflowAccessConfig.access) {
    const aclStatements: string[] = workflowAccessConfig.access
    return aclStatements.includes(currentUserEmail) // TODO: Enhance this to handle complex pattern
  }
  return true
}
