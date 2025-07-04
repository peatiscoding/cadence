import type { WorkflowConfiguration } from '@cadence/shared/types'
import type { IWorkflowConfigurationStorage } from '$lib/persistent/interface'
import type { IAuthenticationProvider } from '$lib/authentication/interface'

import { canAccessWorkflow } from '@cadence/shared/models/access'
import { ConfigurationSchema } from '@cadence/shared/validation'

export class BuildTimeWorkflows implements IWorkflowConfigurationStorage {
  constructor(
    protected readonly workflows: Array<WorkflowConfiguration & { workflowId: string }>,
    protected readonly authProvider: IAuthenticationProvider
  ) {
    // Built-in Type Safety.
    workflows.map((w) => ConfigurationSchema.parse(w))
  }

  isSupportDynamicWorkflows(): boolean {
    return false
  }

  async loadConfig(workflowId: string): Promise<WorkflowConfiguration> {
    const o = this.workflows.find((f) => f.workflowId === workflowId)
    if (!o) {
      throw new Error(`Unknown workflowId: ${workflowId}`)
    }
    return o
  }

  async listWorkflows(): Promise<{
    workflows: Array<WorkflowConfiguration & { workflowId: string }>
  }> {
    const sess = await this.authProvider.getCurrentSession()
    const email = sess.email
    return { workflows: this.workflows.filter((a) => canAccessWorkflow(a, email)) }
  }
}
