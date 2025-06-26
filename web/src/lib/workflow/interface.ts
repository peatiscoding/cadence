import type { IWorkflowCardEntry } from '$lib/models/interface'

export type IWorkflowCardEntryCreation = Pick<IWorkflowCardEntry, 'title' | 'description' | 'value'>
export type IWorkflowCardEntryModification = Partial<
  Omit<
    IWorkflowCardEntry,
    | 'workflowCardId'
    | 'workflowId'
    | 'createdBy'
    | 'createdAt'
    | 'updatedBy'
    | 'updatedAt'
    | 'status'
    | 'statusSince'
  >
>

export interface IWorkflowCardEngine {
  makeNewCard(creationPayload: IWorkflowCardEntryCreation): Promise<string>

  /**
   * Update Card Detail without status changes
   */
  updateCardDetail(workflowCardId: string, payload: IWorkflowCardEntryModification): Promise<void>

  /**
   * Attempt to transit card to new status
   */
  attemptToTransitCard(
    workflowCardId: string,
    toStatus: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void>

  deleteCard(workflowCardId: string): Promise<void>
}
