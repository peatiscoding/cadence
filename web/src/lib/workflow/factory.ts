import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type { IWorkflowCardEngine } from './interface'

import { WorkflowCardEngine } from './workflow-card-engine'

export class WorkflowFactory {
  public static use(storage: IWorkflowCardStorage): WorkflowFactory {
    return new WorkflowFactory(storage)
  }

  private constructor(protected readonly storage: IWorkflowCardStorage) {}
  /**
   * Get a workflow engine
   */
  getWorkflowEngine(workflowKey: string): IWorkflowCardEngine {
    // TODO: Load configuration from file.
    const engine = new WorkflowCardEngine(workflowKey, this.storage)
    return engine
  }
}
