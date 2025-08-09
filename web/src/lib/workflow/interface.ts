import type { ILiveUpdateListenerBuilder } from '$lib/models/live-update'
import type {
  WorkflowConfiguration,
  WorkflowStatus,
  IWorkflowCardEntry
} from '@cadence/shared/types'
import type { z } from 'zod'

export type IWorkflowCardEntryCreation = Pick<
  IWorkflowCardEntry,
  'title' | 'description' | 'value' | 'fieldData' | 'type' | 'owner'
>
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
  /**
   * Get the configurations
   */
  configuration: Promise<WorkflowConfiguration>

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

  /**
   * Get dynamic Zod schema for card validation based on status requirements
   */
  getCardSchema(status?: string): Promise<z.ZodObject<any>>

  /**
   * Get available next statuses for a card from current status
   */
  getNextStatuses(currentCardStatus: string): Promise<WorkflowStatus[]>

  /**
   * Create a live-listing reference
   *
   * Example:
   *
   * const unsubFn = storage.listenForCards(workflowId)
   *    .onDataChanges((changes) => { // handle changes })
   *    .listen()
   *
   * unMount() {
   *    unsubFn()
   * }
   *
   * @param workflowId - listen to the which workflowId?
   * @returns the event listener builder
   */
  listenForCards(workflowId: string): ILiveUpdateListenerBuilder<IWorkflowCardEntry>
}
