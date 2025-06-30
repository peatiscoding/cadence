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
