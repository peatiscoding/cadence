export interface IWorkflowCardEntry {
  workflowId: string
  workflowCardId: string
  title: string
  description: string
  fieldData: Record<string, any>
  value: number
  type: string
  owner: string
  status: string
  /**
   * Epoch since status changed
   */
  statusSince: number
  createdBy: string
  createdAt: number
  updatedBy: string
  updatedAt: number
}

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
