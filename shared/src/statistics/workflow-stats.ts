/**
 * Workflow Statistics Computation
 *
 * This module provides functionality to compute comprehensive statistics
 * for workflows, including card counts per status and average elapsed times.
 */

import type { IWorkflowCardEntry } from '../types/common'
import type { WorkflowConfiguration } from '../types/common'

/**
 * Statistics for a specific status within a workflow
 */
export interface StatusStatistics {
  /** Status identifier */
  statusId: string
  /** Human-readable status name */
  statusName: string
  /** Number of cards currently in this status */
  currentCardCount: number
  /** Average elapsed time in milliseconds for cards currently in this status */
  currentAverageElapsedTime: number
  /** Total value of all cards currently in this status */
  currentTotalValue: number
  /** List of card IDs currently in this status */
  currentCardIds: string[]
}

/**
 * Value categorization for workflow statistics
 */
export interface ValueCategorization {
  /** Sum of values for cards in current (non-terminal) statuses */
  currentValue: number
  /** Sum of values for cards in terminal statuses, grouped by status */
  terminalValuesByStatus: Record<string, number>
  /** Total value (current + all terminal) */
  totalValue: number
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
  /** Total number of cards in the workflow */
  totalCardCount: number
  /** Value categorization by terminal/non-terminal status */
  values: ValueCategorization
  /** Statistics per status */
  statusStats: StatusStatistics[]
  /** Timestamp when statistics were computed */
  computedAt: number
}

/**
 * Computes statistics for a single workflow status
 */
export function computeStatusStatistics(
  statusId: string,
  statusName: string,
  cardsInStatus: IWorkflowCardEntry[]
): StatusStatistics {
  const now = Date.now()
  const cardCount = cardsInStatus.length

  // Calculate average elapsed time for cards currently in this status
  const totalElapsedTime = cardsInStatus.reduce((sum, card) => {
    return sum + (now - card.statusSince)
  }, 0)

  const averageElapsedTime = cardCount > 0 ? totalElapsedTime / cardCount : 0

  // Calculate total value of cards in this status
  const totalValue = cardsInStatus.reduce((sum, card) => sum + card.value, 0)

  return {
    statusId,
    statusName,
    currentCardCount: cardCount,
    currentAverageElapsedTime: averageElapsedTime,
    currentTotalValue: totalValue,
    currentCardIds: cardsInStatus.map((card) => card.workflowCardId)
  }
}

/**
 * Computes comprehensive statistics for a workflow
 */
export function computeWorkflowStatistics(
  workflow: WorkflowConfiguration & { workflowId: string },
  allCards: IWorkflowCardEntry[]
): WorkflowStatistics {
  // Filter cards for this workflow
  const workflowCards = allCards.filter((card) => card.workflowId === workflow.workflowId)

  // Group cards by status
  const cardsByStatus = workflowCards.reduce(
    (groups, card) => {
      if (!groups[card.status]) {
        groups[card.status] = []
      }
      groups[card.status].push(card)
      return groups
    },
    {} as Record<string, IWorkflowCardEntry[]>
  )

  // Compute statistics for each status
  const statusStats: StatusStatistics[] = workflow.statuses.map((status) => {
    const cardsInStatus = cardsByStatus[status.slug] || []
    return computeStatusStatistics(status.slug, status.title, cardsInStatus)
  })

  // Calculate total workflow statistics
  const totalCardCount = workflowCards.length
  const totalValue = workflowCards.reduce((sum, card) => sum + card.value, 0)

  // Calculate value categorization
  let currentValue = 0
  const terminalValuesByStatus: Record<string, number> = {}

  workflow.statuses.forEach((status) => {
    const cardsInStatus = cardsByStatus[status.slug] || []
    const statusValue = cardsInStatus.reduce((sum, card) => sum + card.value, 0)

    if (status.terminal) {
      terminalValuesByStatus[status.slug] = statusValue
    } else {
      currentValue += statusValue
    }
  })

  const values: ValueCategorization = {
    currentValue,
    terminalValuesByStatus,
    totalValue
  }

  return {
    workflowId: workflow.workflowId,
    workflowName: workflow.name,
    nouns: workflow.nouns,
    totalCardCount,
    values,
    statusStats,
    computedAt: Date.now()
  }
}

/**
 * Computes statistics for all supported workflows
 */
export function computeAllWorkflowStatistics(
  workflows: (WorkflowConfiguration & { workflowId: string })[],
  allCards: IWorkflowCardEntry[]
): WorkflowStatistics[] {
  return workflows.map((workflow) => computeWorkflowStatistics(workflow, allCards))
}

/**
 * Formats elapsed time in milliseconds to human-readable format
 */
export function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Utility function to find status statistics by status ID
 */
export function getStatusStatistics(
  workflowStats: WorkflowStatistics,
  statusId: string
): StatusStatistics | undefined {
  return workflowStats.statusStats.find((stat) => stat.statusId === statusId)
}
