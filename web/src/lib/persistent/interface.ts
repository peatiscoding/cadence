import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { Configuration } from '$lib/schema'

export interface ILiveUpdateChange<T> {
  type: 'added' | 'removed' | 'modified'
  data: T
}

export interface ILiveUpdateListenerBuilder<T> {
  onDataChanges: (
    observer: (changes: ILiveUpdateChange<T>[]) => any
  ) => ILiveUpdateListenerBuilder<T>
  listen(): () => void
}

/**
 * Storage Interface does not have
 * any concern about the Data Integrity.
 * It only convert data from given payload to save it correctly on DB.
 */
export interface IWorkflowCardStorage {
  /**
   * Create a new Card
   */
  createCard(workflowId: string, author: string, creationPayload: any): Promise<string>

  /**
   * Update the existing Card Detail
   */
  updateCard(
    workflowId: string,
    workflowCardId: string,
    author: string,
    payload: any
  ): Promise<void>

  /**
   * Get Single Card
   */
  getCard(workflowId: string, workflowCardId: string): Promise<IWorkflowCardEntry>

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

  /**
   * Delete card
   */
  deleteCard(workflowId: string, workflowCardId: string): Promise<void>
}

export interface IWorkflowConfigurationStorage {
  /**
   * Fetch configuration
   */
  loadConfig(workflowId: string): Promise<Configuration>

  /**
   * Create a new workflow configuration
   */
  setConfig(workflowId: string, configuration: Configuration): Promise<void>

  /**
   * List all workflow configurations
   */
  listWorkflows(): Promise<{ workflows: Array<Configuration & { workflowId: string }> }>

  /**
   * Delete all workflow ids
   */
  deleteConfig(workflowId: string): Promise<void>
  deleteConfig(...allWorkflowIds: string[]): Promise<void>
}
