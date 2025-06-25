import type { IWorkflowCardStorage, IWorkflowConfigurationStorage } from '$lib/persistent/interface'
import type { IWorkflowCardEngine } from './interface'

import { WorkflowCardEngine } from './workflow-card-engine'

export class WorkflowFactory {
  public static use(
    cardStore: IWorkflowCardStorage,
    configStore: IWorkflowConfigurationStorage
  ): WorkflowFactory {
    return new WorkflowFactory(cardStore, configStore)
  }

  private constructor(
    protected readonly storage: IWorkflowCardStorage,
    protected readonly configStore: IWorkflowConfigurationStorage
  ) {}

  /**
   * Get a workflow engine
   */
  getWorkflowEngine(workflowKey: string): IWorkflowCardEngine {
    const configuration = this.configStore.loadConfig(workflowKey)
    const engine = new WorkflowCardEngine(workflowKey, configuration, this.storage)
    return engine
  }
}
