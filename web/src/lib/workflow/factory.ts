import type { IWorkflowCardEngine } from './interface'

export class WorkflowFactory {
  /**
   * Get a workflow engine
   */
  getWorkflowEngine(workflowKey: string): IWorkflowCardEngine {
    // TODO: Load configuration from file.
    // TODO: Init Repository
    throw new Error('Implementation required')
  }
}
