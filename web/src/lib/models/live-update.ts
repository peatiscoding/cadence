export interface ILiveUpdateChange<T> {
  type: 'added' | 'removed' | 'modified'
  data: T
}

export interface ILiveUpdateListenerBuilder<T> {
  onDataChanges: (
    observer: (changes: ILiveUpdateChange<T>[]) => any
  ) => ILiveUpdateListenerBuilder<T>
  /**
   * Tap changes into the data changes stream
   */
  map: <M>(
    transformer: (changes: ILiveUpdateChange<T>) => ILiveUpdateChange<M>
  ) => ILiveUpdateListenerBuilder<M>
  listen(): () => void
}
