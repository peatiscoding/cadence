import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'

export class WorkflowCardEngine implements IWorkflowCardEngine {
  public constructor(protected readonly storage: IWorkflowCardStorage) {
    //
  }

  makeNewCard(
    userSsoId: string,
    workflowCardId: string,
    creationPayload: IWorkflowCardEntryCreation
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }

  attemptToTransitCard(
    userSsoId: string,
    workflowCardId: string,
    toStatus: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
