import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'

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
    return this.storage.createCard(this.workflowId, userSsoId, creationPayload)
  }

  attemptToTransitCard(
    userSsoId: string,
    workflowCardId: string,
    toStatus: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async deleteCard(userSsoId: string, workflowCardId: string): Promise<void> {
    await this.storage.deleteCard(this.workflowId, workflowCardId)
  }
}
