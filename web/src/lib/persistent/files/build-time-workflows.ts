import type { Configuration } from '$lib/schema'
import type { IWorkflowConfigurationStorage } from '$lib/persistent/interface'

export class BuildTimeWorkflows implements IWorkflowConfigurationStorage {
  constructor(protected readonly workflows: Array<Configuration & { workflowId: string }>) {}
  isSupportDynamicWorkflows(): boolean {
    return false
  }

  async loadConfig(workflowId: string): Promise<Configuration> {
    const o = this.workflows.find((f) => f.workflowId === workflowId)
    if (!o) {
      throw new Error(`Unknown workflowId: ${workflowId}`)
    }
    return o
  }

  async listWorkflows(): Promise<{ workflows: Array<Configuration & { workflowId: string }> }> {
    return { workflows: this.workflows }
  }
}
