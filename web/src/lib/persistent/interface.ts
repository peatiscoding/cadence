import type { WorkflowConfiguration, IWorkflowCardEntry } from '@cadence/shared/types'
import type { ILiveUpdateListenerBuilder } from '$lib/models/live-update'

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
  loadConfig(workflowId: string): Promise<WorkflowConfiguration>

  /**
   * List all workflow configurations
   */
  listWorkflows(): Promise<{ workflows: Array<WorkflowConfiguration & { workflowId: string }> }>

  /**
   * @returns true if given configuration storage support dynamic workflows
   */
  isSupportDynamicWorkflows(): boolean
}

export interface IWorkflowConfigurationDynamicStorage extends IWorkflowConfigurationStorage {
  /**
   * Create a new workflow configuration
   */
  setConfig(workflowId: string, configuration: WorkflowConfiguration): Promise<void>

  /**
   * Delete all workflow ids
   */
  deleteConfig(workflowId: string): Promise<void>
  deleteConfig(...allWorkflowIds: string[]): Promise<void>
}
