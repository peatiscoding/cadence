import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'

import { STATUS_DRAFT, USE_SERVER_TIMESTAMP } from '$lib/persistent/constant'

export class WorkflowCardEngine implements IWorkflowCardEngine {
  public constructor(
    public readonly workflowId: string,
    /* Workflow Configuration File */
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
    // TODO: Validate if status was slipped in payload?
    return this.storage.updateCard(this.workflowId, workflowCardId, userSsoId, payload)
  }

  async attemptToTransitCard(
    userSsoId: string,
    workflowCardId: string,
    toStatus: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    // TODO: Validate if requested status is defined within configuration?
    // TODO: Validate based on workflow's status configurations.
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
