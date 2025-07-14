/**
 * Tests for Workflow Statistics Computation
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  type StatusStatistics,
  type WorkflowStatistics,
  computeStatusStatistics,
  computeWorkflowStatistics,
  computeAllWorkflowStatistics,
  formatElapsedTime,
  getStatusStatistics
} from './workflow-stats'
import type { IWorkflowCardEntry, WorkflowConfiguration } from '../types/common'

describe('Workflow Statistics', () => {
  let mockWorkflow: WorkflowConfiguration & { workflowId: string }
  let mockCards: IWorkflowCardEntry[]

  beforeEach(() => {
    // Mock workflow configuration
    mockWorkflow = {
      workflowId: 'test-workflow',
      name: 'Test Workflow',
      access: [],
      nouns: { singular: 'Task', plural: 'Tasks' },
      types: [
        { slug: 'bug', title: 'Bug', ui: { color: '#ff0000' } },
        { slug: 'feature', title: 'Feature', ui: { color: '#00ff00' } }
      ],
      fields: [],
      statuses: [
        { slug: 'todo', title: 'To Do', terminal: false, ui: { color: '#gray' } },
        { slug: 'progress', title: 'In Progress', terminal: false, ui: { color: '#blue' } },
        { slug: 'done', title: 'Done', terminal: true, ui: { color: '#green' } }
      ]
    }

    // Mock cards with different statuses and ages
    const now = Date.now()
    mockCards = [
      {
        workflowId: 'test-workflow',
        workflowCardId: 'card-1',
        title: 'Task 1',
        status: 'todo',
        type: 'bug',
        value: 10,
        owner: 'user1',
        fieldData: {},
        statusSince: now - 60000, // 1 minute ago
        createdBy: 'user1',
        createdAt: now - 60000,
        updatedBy: 'user1',
        updatedAt: now - 60000
      },
      {
        workflowId: 'test-workflow',
        workflowCardId: 'card-2',
        title: 'Task 2',
        status: 'todo',
        type: 'feature',
        value: 20,
        owner: 'user2',
        fieldData: {},
        statusSince: now - 120000, // 2 minutes ago
        createdBy: 'user2',
        createdAt: now - 120000,
        updatedBy: 'user2',
        updatedAt: now - 120000
      },
      {
        workflowId: 'test-workflow',
        workflowCardId: 'card-3',
        title: 'Task 3',
        status: 'progress',
        type: 'bug',
        value: 30,
        owner: 'user3',
        fieldData: {},
        statusSince: now - 300000, // 5 minutes ago
        createdBy: 'user3',
        createdAt: now - 300000,
        updatedBy: 'user3',
        updatedAt: now - 300000
      },
      {
        workflowId: 'test-workflow',
        workflowCardId: 'card-4',
        title: 'Task 4',
        status: 'done',
        type: 'feature',
        value: 40,
        owner: 'user4',
        fieldData: {},
        statusSince: now - 600000, // 10 minutes ago
        createdBy: 'user4',
        createdAt: now - 600000,
        updatedBy: 'user4',
        updatedAt: now - 600000
      }
    ]
  })

  describe('computeStatusStatistics', () => {
    it('should compute statistics for a status with cards', () => {
      const todoCards = mockCards.filter((card) => card.status === 'todo')
      const stats = computeStatusStatistics('todo', 'To Do', todoCards)

      expect(stats.statusId).toBe('todo')
      expect(stats.statusName).toBe('To Do')
      expect(stats.currentCardCount).toBe(2)
      expect(stats.currentTotalValue).toBe(30) // 10 + 20
      expect(stats.currentCardIds).toEqual(['card-1', 'card-2'])
      expect(stats.currentAverageElapsedTime).toBeCloseTo(90000, -2) // Average of 60000 and 120000
    })

    it('should compute statistics for a status with no cards', () => {
      const stats = computeStatusStatistics('empty', 'Empty Status', [])

      expect(stats.statusId).toBe('empty')
      expect(stats.statusName).toBe('Empty Status')
      expect(stats.currentCardCount).toBe(0)
      expect(stats.currentTotalValue).toBe(0)
      expect(stats.currentCardIds).toEqual([])
      expect(stats.currentAverageElapsedTime).toBe(0)
    })

    it('should compute statistics for a status with one card', () => {
      const progressCards = mockCards.filter((card) => card.status === 'progress')
      const stats = computeStatusStatistics('progress', 'In Progress', progressCards)

      expect(stats.statusId).toBe('progress')
      expect(stats.statusName).toBe('In Progress')
      expect(stats.currentCardCount).toBe(1)
      expect(stats.currentTotalValue).toBe(30)
      expect(stats.currentCardIds).toEqual(['card-3'])
      expect(stats.currentAverageElapsedTime).toBeCloseTo(300000, -2) // Approximately 5 minutes
    })
  })

  describe('computeWorkflowStatistics', () => {
    it('should compute complete workflow statistics', () => {
      const stats = computeWorkflowStatistics(mockWorkflow, mockCards)

      expect(stats.workflowId).toBe('test-workflow')
      expect(stats.workflowName).toBe('Test Workflow')
      expect(stats.nouns).toEqual({ singular: 'Task', plural: 'Tasks' })
      expect(stats.totalCardCount).toBe(4)
      expect(stats.values.totalValue).toBe(100) // 10 + 20 + 30 + 40
      expect(stats.values.currentValue).toBe(60) // todo (10 + 20) + progress (30)
      expect(stats.values.terminalValuesByStatus).toEqual({ done: 40 })
      expect(stats.statusStats).toHaveLength(3)
      expect(stats.computedAt).toBeGreaterThan(0)

      // Check specific status statistics
      const todoStats = stats.statusStats.find((s) => s.statusId === 'todo')
      expect(todoStats?.currentCardCount).toBe(2)
      expect(todoStats?.currentTotalValue).toBe(30)

      const progressStats = stats.statusStats.find((s) => s.statusId === 'progress')
      expect(progressStats?.currentCardCount).toBe(1)
      expect(progressStats?.currentTotalValue).toBe(30)

      const doneStats = stats.statusStats.find((s) => s.statusId === 'done')
      expect(doneStats?.currentCardCount).toBe(1)
      expect(doneStats?.currentTotalValue).toBe(40)
    })

    it('should handle workflow with no cards', () => {
      const stats = computeWorkflowStatistics(mockWorkflow, [])

      expect(stats.workflowId).toBe('test-workflow')
      expect(stats.workflowName).toBe('Test Workflow')
      expect(stats.nouns).toEqual({ singular: 'Task', plural: 'Tasks' })
      expect(stats.totalCardCount).toBe(0)
      expect(stats.values.totalValue).toBe(0)
      expect(stats.values.currentValue).toBe(0)
      expect(stats.values.terminalValuesByStatus).toEqual({ done: 0 })
      expect(stats.statusStats).toHaveLength(3)

      // All status stats should be empty
      stats.statusStats.forEach((statusStat) => {
        expect(statusStat.currentCardCount).toBe(0)
        expect(statusStat.currentTotalValue).toBe(0)
        expect(statusStat.currentAverageElapsedTime).toBe(0)
      })
    })

    it('should filter cards by workflow ID', () => {
      const cardsWithOtherWorkflow = [
        ...mockCards,
        {
          workflowId: 'other-workflow',
          workflowCardId: 'card-5',
          title: 'Other Task',
          status: 'todo',
          type: 'bug',
          value: 50,
          owner: 'user5',
          fieldData: {},
          statusSince: Date.now() - 60000,
          createdBy: 'user5',
          createdAt: Date.now() - 60000,
          updatedBy: 'user5',
          updatedAt: Date.now() - 60000
        }
      ]

      const stats = computeWorkflowStatistics(mockWorkflow, cardsWithOtherWorkflow)

      // Should only count cards from the target workflow
      expect(stats.totalCardCount).toBe(4)
      expect(stats.values.totalValue).toBe(100) // Should not include the 50 from other workflow
    })
  })

  describe('computeAllWorkflowStatistics', () => {
    it('should compute statistics for multiple workflows', () => {
      const secondWorkflow: WorkflowConfiguration & { workflowId: string } = {
        ...mockWorkflow,
        workflowId: 'second-workflow',
        name: 'Second Workflow'
      }

      const allWorkflows = [mockWorkflow, secondWorkflow]
      const allStats = computeAllWorkflowStatistics(allWorkflows, mockCards)

      expect(allStats).toHaveLength(2)
      expect(allStats[0].workflowId).toBe('test-workflow')
      expect(allStats[1].workflowId).toBe('second-workflow')

      // First workflow should have all cards
      expect(allStats[0].totalCardCount).toBe(4)

      // Second workflow should have no cards
      expect(allStats[1].totalCardCount).toBe(0)
    })

    it('should handle empty workflows array', () => {
      const allStats = computeAllWorkflowStatistics([], mockCards)
      expect(allStats).toEqual([])
    })
  })

  describe('formatElapsedTime', () => {
    it('should format seconds', () => {
      expect(formatElapsedTime(5000)).toBe('5s')
      expect(formatElapsedTime(45000)).toBe('45s')
    })

    it('should format minutes and seconds', () => {
      expect(formatElapsedTime(90000)).toBe('1m 30s')
      expect(formatElapsedTime(300000)).toBe('5m 0s')
    })

    it('should format hours and minutes', () => {
      expect(formatElapsedTime(3600000)).toBe('1h 0m')
      expect(formatElapsedTime(5400000)).toBe('1h 30m')
    })

    it('should format days and hours', () => {
      expect(formatElapsedTime(86400000)).toBe('1d 0h')
      expect(formatElapsedTime(90000000)).toBe('1d 1h')
    })

    it('should handle zero time', () => {
      expect(formatElapsedTime(0)).toBe('0s')
    })
  })

  describe('getStatusStatistics', () => {
    it('should find status statistics by ID', () => {
      const stats = computeWorkflowStatistics(mockWorkflow, mockCards)
      const todoStats = getStatusStatistics(stats, 'todo')

      expect(todoStats).toBeDefined()
      expect(todoStats?.statusId).toBe('todo')
      expect(todoStats?.statusName).toBe('To Do')
      expect(todoStats?.currentCardCount).toBe(2)
    })

    it('should return undefined for non-existent status', () => {
      const stats = computeWorkflowStatistics(mockWorkflow, mockCards)
      const nonExistentStats = getStatusStatistics(stats, 'non-existent')

      expect(nonExistentStats).toBeUndefined()
    })
  })
})

