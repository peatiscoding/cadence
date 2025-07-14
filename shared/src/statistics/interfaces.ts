export interface GroupOfCardStatistics {
  /** Number of cards currently in this group (currentCardIds.length) */
  currentCardCount: number
  /** Average elapsed time in milliseconds for cards currently in this group */
  currentAverageElapsedTime: number
  /** Total value of all cards currently in this group */
  currentTotalValue: number
  /** List of card IDs currently in this group */
  currentCardIds: string[]
}

/**
 * Statistics for a specific status within a workflow
 */
export interface StatusStatistics extends GroupOfCardStatistics {
  /** Status identifier */
  statusId: string
  /** Human-readable status name */
  statusName: string
}

/**
 * Complete statistics for a workflow
 */
export interface WorkflowStatistics {
  /** Workflow identifier */
  workflowId: string
  /** Human-readable workflow name */
  workflowName: string
  /** Workflow nouns configuration */
  nouns: {
    singular: string
    plural: string
  }
  /** Statistics per status */
  statusStats: StatusStatistics[]
  /**
   * Stats for those already active
   */
  active: GroupOfCardStatistics
  /** Timestamp when statistics were computed */
  computedAt: number
}
