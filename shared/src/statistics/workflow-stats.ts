/**
 * Workflow Statistics Computation
 *
 * This module provides functionality to compute comprehensive statistics
 * for workflows, including card counts per status and average elapsed times.
 */
import type { WorkflowConfiguration } from '../types/common'
import type { StatusStats } from '../types/activity'
import type { GroupOfCardStatistics, StatusStatistics, WorkflowStatistics } from './interfaces'

/** Helper class to help aggregate the value
 */
class GroupOfCardStatisticsAggregator {
  private cardIds = new Set<string>()
  public totalValue: number = 0

  constructor() {}

  public collect(cardId: string, value: number) {
    if (this.cardIds.has(cardId)) {
      throw new Error(`Invalid cardId: ${cardId} already added in this group`)
    }

    this.cardIds.add(cardId)
    this.totalValue += value
  }

  toGroupOfCardStatistics(): GroupOfCardStatistics {
    return {
      currentAverageElapsedTime: 0,
      currentCardCount: this.cardIds.size,
      currentCardIds: [...this.cardIds],
      currentTotalValue: this.totalValue
    }
  }
}

/**
 * Computes workflow statistics from Firestore stats documents
 * This is more efficient than loading all cards
 *
 * @param workflow the workflow configurations
 * @param statsPerStatus the raw value collected per Status key
 */
export function computeWorkflowStatisticsFromStats(
  workflow: WorkflowConfiguration & { workflowId: string },
  statsPerStatus: Record<string, StatusStats | null>
): WorkflowStatistics {
  const now = Date.now()

  // for All non-terminal statuses
  const activeAggregator = new GroupOfCardStatisticsAggregator()

  // Compute statistics for each status
  const statusStats: StatusStatistics[] = workflow.statuses.map((status) => {
    const statusRawData = statsPerStatus[status.slug]

    // No actual data
    if (!statusRawData || !statusRawData.currentPendings) {
      return {
        statusId: status.slug,
        statusName: status.title,
        currentCardCount: 0,
        currentAverageElapsedTime: 0,
        currentTotalValue: 0,
        currentCardIds: []
      }
    }

    // Process `currentPendings`
    const pendings = Object.values(statusRawData.currentPendings)
    const cardCount = pendings.length

    // Calculate total elapsed time and value
    let totalElapsedTime = 0
    let totalValue = 0
    const cardIds: string[] = []

    pendings.forEach((pending) => {
      // For terminal statuses, use createdAt to show total elapsed time from creation
      // For non-terminal statuses, use statusSince to show time in current status
      const timestampToUse = status.terminal ? pending.createdAt : pending.statusSince

      const timestampMs =
        typeof timestampToUse === 'object' && timestampToUse && 'toMillis' in timestampToUse
          ? (timestampToUse as any).toMillis()
          : (timestampToUse as unknown as number)
      totalElapsedTime += now - timestampMs
      totalValue += pending.value
      cardIds.push(pending.cardId)

      // collect active cards
      if (!status.terminal) {
        activeAggregator.collect(pending.cardId, pending.value)
      }
    })

    const averageElapsedTime = cardCount > 0 ? totalElapsedTime / cardCount : 0

    return {
      statusId: status.slug,
      statusName: status.title,
      currentCardCount: cardCount,
      currentAverageElapsedTime: averageElapsedTime,
      currentTotalValue: totalValue,
      currentCardIds: cardIds
    }
  })

  return {
    workflowId: workflow.workflowId,
    workflowName: workflow.name,
    nouns: workflow.nouns,
    statusStats,
    active: activeAggregator.toGroupOfCardStatistics(),
    computedAt: now
  }
}
