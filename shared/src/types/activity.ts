/**
 * Activity logging and statistics types for Cadence
 *
 * These types define the structure for tracking card changes and aggregated statistics
 */
import type { Timestamp } from 'firebase-admin/firestore'

export type ActivityAction = 'create' | 'update' | 'transit' | 'delete'

export interface ActivityChange {
  key: string
  from?: any
  to?: any
}

export interface ActivityLog {
  workflowId: string
  workflowCardId: string
  cardTitle: string
  userId: string
  timestamp: Timestamp
  action: ActivityAction
  changes: ActivityChange[]
}

export interface StatusPending {
  cardId: string
  statusSince: Timestamp
  value: number
  userId: string
  createdAt: Timestamp
}

export interface StatusStats {
  workflowId: string
  totalTransitionTime: number
  totalTransitionCount: number
  createdAt: Timestamp
  lastUpdated: Timestamp
  currentPendings: Record<string, StatusPending>
}

export interface StatsOperation {
  type: 'increment' | 'arrayUnion' | 'arrayRemove' | 'set'
  field: string
  value: any
  document: string
}

export interface ComputedStats {
  currentNetValue: number
  currentCount: number
  currentTotalDuration: number
  averageTransitionTime: number
}
