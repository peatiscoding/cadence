import type { IWorkflowCardEntry } from '$lib/models/interface'

/**
 * Storage Interface does not have
 * any concern about the Data Integrity.
 * It only convert data from given payload to save it correctly on DB.
 */
export interface IWorkflowCardStorage {
  /**
   * Create a new Card
   */
  createCard(workflowId: string, creationPayload: any): Promise<string>

  /**
   * Update the existing Card Detail
   */
  updateCard(workflowId: string, workflowCardId: string, payload: any): Promise<void>

  /**
   * Get Single Card
   */
  getCard(workflowId: string, workflowCardId: string): Promise<IWorkflowCardEntry>

  /**
   * Create a live-listing reference
   */
  listCards(workflowId: string): (onDataChanges: IWorkflowCardEntry[]) => void
}
