import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'

import { STATUS_DRAFT, USE_SERVER_TIMESTAMP } from '$lib/persistent/constant'
import type { Configuration } from '$lib/schema'

export class WorkflowCardEngine implements IWorkflowCardEngine {
  public constructor(
    public readonly workflowId: string,
    public readonly config: Promise<Configuration>,
    protected readonly storage: IWorkflowCardStorage
  ) {
    //
  }

  async makeNewCard(
    userSsoId: string,
    creationPayload: IWorkflowCardEntryCreation
  ): Promise<string> {
    // TODO: Validate based on workflow's configuration
    return this.storage.createCard(this.workflowId, userSsoId, {
      ...creationPayload,
      status: STATUS_DRAFT,
      statusSince: USE_SERVER_TIMESTAMP
    })
  }

  async updateCardDetail(
    userSsoId: string,
    workflowCardId: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    if ((payload as any).status) {
      throw new Error(`Update status is disallowed`)
    }
    return this.storage.updateCard(this.workflowId, workflowCardId, userSsoId, payload)
  }

  async attemptToTransitCard(
    userSsoId: string,
    workflowCardId: string,
    toStatus: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    const config = await this.config
    // Validate if requested status is defined within configuration?
    const newStatusConfig = config.statuses.find((a) => a.slug === toStatus)
    if (!newStatusConfig) {
      throw new Error(`Unknown new status: ${toStatus}`)
    }
    // Validate its precondition
    const precondition = newStatusConfig.precondition
    // TODO: Validate precondition.users
    // TODO: Validate precondition.required
    // TODO: Validate precondition.from

    // TODO: Run status configuration actions (hooks)
    await this.storage.updateCard(this.workflowId, workflowCardId, userSsoId, {
      ...payload,
      status: toStatus,
      statusSince: USE_SERVER_TIMESTAMP
    })
    // TODO: Run post operations
  }

  async deleteCard(userSsoId: string, workflowCardId: string): Promise<void> {
    // TODO: Validate if user can delete the card based on workflow's configuration
    await this.storage.deleteCard(this.workflowId, workflowCardId)
  }
}
