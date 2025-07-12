/**
 * Tests for card activity logger helpers and UpdateTransitionTracker
 */

import { Timestamp } from 'firebase-admin/firestore'
import type { IWorkflowCardEntry } from '@cadence/shared/types'
import { _helpers, UpdateTransitionTracker } from './card-activity-logger'

// Mock data helpers
const createMockCard = (overrides: Partial<IWorkflowCardEntry> = {}): IWorkflowCardEntry => ({
  workflowId: 'test-workflow',
  workflowCardId: 'test-card',
  title: 'Test Card',
  status: 'draft',
  value: 1000,
  type: 'feature',
  owner: 'user1',
  fieldData: {},
  statusSince: Date.now(),
  createdBy: 'user1',
  createdAt: Date.now(),
  updatedBy: 'user1',
  updatedAt: Date.now(),
  ...overrides
})

// Mock Firestore batch and db
const createMockBatch = () => {
  const operations: any[] = []
  return {
    set: jest.fn((ref, data, options) => operations.push({ type: 'set', ref, data, options })),
    update: jest.fn((ref, data) => operations.push({ type: 'update', ref, data })),
    commit: jest.fn(),
    _operations: operations
  }
}

const createMockDb = () => ({
  doc: jest.fn((path) => ({ path }))
})

describe('_helpers', () => {
  describe('determineActionType', () => {
    it('should return "create" when beforeData is null and afterData exists', () => {
      const result = _helpers.determineActionType(null, createMockCard())
      expect(result).toBe('create')
    })

    it('should return "delete" when beforeData exists and afterData is null', () => {
      const result = _helpers.determineActionType(createMockCard(), null)
      expect(result).toBe('delete')
    })

    it('should return "transit" when status changes', () => {
      const before = createMockCard({ status: 'draft' })
      const after = createMockCard({ status: 'in-progress' })
      const result = _helpers.determineActionType(before, after)
      expect(result).toBe('transit')
    })

    it('should return "update" when status remains the same', () => {
      const before = createMockCard({ status: 'draft', title: 'Old Title' })
      const after = createMockCard({ status: 'draft', title: 'New Title' })
      const result = _helpers.determineActionType(before, after)
      expect(result).toBe('update')
    })

    it('should throw error for invalid data state', () => {
      expect(() => _helpers.determineActionType(null, null)).toThrow('Invalid data state for activity logging')
    })
  })

  describe('generateChanges', () => {
    it('should generate changes for create action', () => {
      const card = createMockCard({
        title: 'New Card',
        status: 'draft',
        value: 5000,
        type: 'bug',
        fieldData: { priority: 'high', assignee: 'user1' }
      })

      const changes = _helpers.generateChanges(null, card, 'create')

      expect(changes).toEqual([
        { key: 'title', to: 'New Card' },
        { key: 'status', to: 'draft' },
        { key: 'value', to: 5000 },
        { key: 'type', to: 'bug' },
        { key: 'fieldData.priority', to: 'high' },
        { key: 'fieldData.assignee', to: 'user1' }
      ])
    })

    it('should generate changes for delete action', () => {
      const card = createMockCard({
        status: 'in-progress',
        fieldData: { priority: 'high', assignee: 'user1' }
      })

      const changes = _helpers.generateChanges(card, null, 'delete')

      expect(changes).toEqual([
        { key: 'status', from: 'in-progress' },
        { key: 'fieldData.priority', from: 'high' },
        { key: 'fieldData.assignee', from: 'user1' }
      ])
    })

    it('should generate changes for update action', () => {
      const before = createMockCard({
        title: 'Old Title',
        value: 1000,
        fieldData: { priority: 'low', assignee: 'user1' }
      })
      const after = createMockCard({
        title: 'New Title',
        value: 2000,
        fieldData: { priority: 'high', assignee: 'user1' }
      })

      const changes = _helpers.generateChanges(before, after, 'update')

      expect(changes).toEqual([
        { key: 'title', from: 'Old Title', to: 'New Title' },
        { key: 'value', from: 1000, to: 2000 },
        { key: 'fieldData.priority', from: 'low', to: 'high' }
      ])
    })

    it('should generate changes for transit action', () => {
      const before = createMockCard({
        status: 'draft',
        fieldData: { reviewedBy: undefined }
      })
      const after = createMockCard({
        status: 'in-review',
        fieldData: { reviewedBy: 'user2' }
      })

      const changes = _helpers.generateChanges(before, after, 'transit')

      expect(changes).toEqual([
        { key: 'status', from: 'draft', to: 'in-review' },
        { key: 'fieldData.reviewedBy', to: 'user2' }
      ])
    })

    it('should handle fieldData additions and removals', () => {
      const before = createMockCard({
        fieldData: { oldField: 'value1', sharedField: 'old' }
      })
      const after = createMockCard({
        fieldData: { newField: 'value2', sharedField: 'new' }
      })

      const changes = _helpers.generateChanges(before, after, 'update')

      expect(changes).toContainEqual({ key: 'fieldData.oldField', from: 'value1' })
      expect(changes).toContainEqual({ key: 'fieldData.newField', to: 'value2' })
      expect(changes).toContainEqual({ key: 'fieldData.sharedField', from: 'old', to: 'new' })
    })
  })

  describe('addChange', () => {
    it('should add change with both from and to values', () => {
      const changes: any[] = []
      _helpers.addChange(changes, 'test', 'old', 'new')
      expect(changes).toEqual([{ key: 'test', from: 'old', to: 'new' }])
    })

    it('should add change with only to value', () => {
      const changes: any[] = []
      _helpers.addChange(changes, 'test', undefined, 'new')
      expect(changes).toEqual([{ key: 'test', to: 'new' }])
    })

    it('should add change with only from value', () => {
      const changes: any[] = []
      _helpers.addChange(changes, 'test', 'old', undefined)
      expect(changes).toEqual([{ key: 'test', from: 'old' }])
    })
  })

  describe('compareAndAddChange', () => {
    it('should add change when values are different', () => {
      const changes: any[] = []
      _helpers.compareAndAddChange(changes, 'test', 'old', 'new')
      expect(changes).toEqual([{ key: 'test', from: 'old', to: 'new' }])
    })

    it('should not add change when values are the same', () => {
      const changes: any[] = []
      _helpers.compareAndAddChange(changes, 'test', 'same', 'same')
      expect(changes).toEqual([])
    })

    it('should handle null and undefined values', () => {
      const changes: any[] = []
      _helpers.compareAndAddChange(changes, 'test1', null, undefined)
      _helpers.compareAndAddChange(changes, 'test2', undefined, null)
      _helpers.compareAndAddChange(changes, 'test3', null, null)
      _helpers.compareAndAddChange(changes, 'test4', undefined, undefined)

      expect(changes).toEqual([
        { key: 'test1', from: null, to: undefined },
        { key: 'test2', from: undefined, to: null }
      ])
    })
  })
})

describe('UpdateTransitionTracker', () => {
  let mockBatch: any
  let mockDb: any
  let tracker: UpdateTransitionTracker

  beforeEach(() => {
    mockBatch = createMockBatch()
    mockDb = createMockDb()
    tracker = new UpdateTransitionTracker(mockBatch, mockDb, 'test-workflow', 'test-card')
  })

  describe('compute', () => {
    it('should handle create action', () => {
      const card = createMockCard({ status: 'draft', value: 1000 })
      
      tracker.compute('create', null, card, 'user1')

      expect(mockBatch.set).toHaveBeenCalledWith(
        { path: 'stats/test-workflow/per/draft' },
        expect.objectContaining({
          workflowId: 'test-workflow',
          lastUpdated: expect.any(Timestamp),
          currentPendings: expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                cardId: 'test-card',
                userId: 'user1',
                value: 1000
              })
            ])
          })
        }),
        { merge: true }
      )
    })

    it('should handle transit action', () => {
      const beforeCard = createMockCard({ 
        status: 'draft', 
        value: 1000,
        statusSince: Date.now() - 60000, // 1 minute ago
        updatedBy: 'user1'
      })
      const afterCard = createMockCard({ 
        status: 'in-progress', 
        value: 1000 
      })

      tracker.compute('transit', beforeCard, afterCard, 'user1')

      // Should call both transitOut and transitIn
      expect(mockBatch.update).toHaveBeenCalledWith(
        { path: 'stats/test-workflow/per/draft' },
        expect.objectContaining({
          totalTransitionTime: expect.objectContaining({
            operand: expect.any(Number)
          }),
          totalTransitionCount: expect.objectContaining({
            operand: 1
          }),
          currentPendings: expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                cardId: 'test-card',
                userId: 'user1'
              })
            ])
          }),
          lastUpdated: expect.any(Timestamp)
        })
      )

      expect(mockBatch.set).toHaveBeenCalledWith(
        { path: 'stats/test-workflow/per/in-progress' },
        expect.objectContaining({
          workflowId: 'test-workflow',
          lastUpdated: expect.any(Timestamp),
          currentPendings: expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                cardId: 'test-card',
                userId: 'user1'
              })
            ])
          })
        }),
        { merge: true }
      )
    })

    it('should handle delete action', () => {
      const beforeCard = createMockCard({ 
        status: 'draft', 
        value: 1000,
        statusSince: Date.now() - 120000, // 2 minutes ago
        updatedBy: 'user1'
      })

      tracker.compute('delete', beforeCard, null, 'user1')

      expect(mockBatch.update).toHaveBeenCalledWith(
        { path: 'stats/test-workflow/per/draft' },
        expect.objectContaining({
          totalTransitionTime: expect.objectContaining({
            operand: expect.any(Number)
          }),
          totalTransitionCount: expect.objectContaining({
            operand: 1
          }),
          currentPendings: expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                cardId: 'test-card',
                userId: 'user1'
              })
            ])
          }),
          lastUpdated: expect.any(Timestamp)
        })
      )
    })

    it('should not perform operations for update action', () => {
      const beforeCard = createMockCard({ title: 'Old' })
      const afterCard = createMockCard({ title: 'New' })

      tracker.compute('update', beforeCard, afterCard, 'user1')

      expect(mockBatch.set).not.toHaveBeenCalled()
      expect(mockBatch.update).not.toHaveBeenCalled()
    })
  })

  describe('updateStatsForTransitIn', () => {
    it('should create correct pending entry', () => {
      const card = createMockCard({ 
        status: 'in-progress', 
        value: 2500 
      })
      const timestamp = Timestamp.now()

      // Access private method for testing
      ;(tracker as any).updateStatsForTransitIn(card, 'user2', timestamp)

      expect(mockBatch.set).toHaveBeenCalledWith(
        { path: 'stats/test-workflow/per/in-progress' },
        {
          workflowId: 'test-workflow',
          lastUpdated: timestamp,
          currentPendings: expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                cardId: 'test-card',
                userId: 'user2',
                value: 2500
              })
            ])
          })
        },
        { merge: true }
      )
    })
  })

  describe('updateStatsForTransitOut', () => {
    it('should calculate correct time spent when statusSince is a number', async () => {
      const startTime = Date.now() - 180000 // 3 minutes ago
      const beforeCard = createMockCard({ 
        status: 'draft', 
        value: 1500,
        statusSince: startTime, // number (epoch)
        updatedBy: 'user1'
      })
      const timestamp = Timestamp.now()

      // Access private method for testing
      await (tracker as any).updateStatsForTransitOut(beforeCard, timestamp)

      const expectedTimeSpent = timestamp.toMillis() - startTime

      expect(mockBatch.update).toHaveBeenCalledWith(
        { path: 'stats/test-workflow/per/draft' },
        {
          totalTransitionTime: expect.objectContaining({
            operand: expectedTimeSpent
          }),
          totalTransitionCount: expect.objectContaining({
            operand: 1
          }),
          currentPendings: expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                cardId: 'test-card',
                userId: 'user1',
                value: 1500
              })
            ])
          }),
          lastUpdated: timestamp
        }
      )
    })

    it('should calculate correct time spent when statusSince is a Timestamp', async () => {
      const startTime = Date.now() - 240000 // 4 minutes ago
      const statusSinceTimestamp = Timestamp.fromMillis(startTime)
      const beforeCard = createMockCard({ 
        status: 'draft', 
        value: 2000,
        statusSince: statusSinceTimestamp as any, // Timestamp object (as it comes from Firestore)
        updatedBy: 'user2'
      })
      const timestamp = Timestamp.now()

      // Access private method for testing
      await (tracker as any).updateStatsForTransitOut(beforeCard, timestamp)

      const expectedTimeSpent = timestamp.toMillis() - startTime

      expect(mockBatch.update).toHaveBeenCalledWith(
        { path: 'stats/test-workflow/per/draft' },
        {
          totalTransitionTime: expect.objectContaining({
            operand: expectedTimeSpent
          }),
          totalTransitionCount: expect.objectContaining({
            operand: 1
          }),
          currentPendings: expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                cardId: 'test-card',
                userId: 'user2',
                value: 2000
              })
            ])
          }),
          lastUpdated: timestamp
        }
      )
    })

    it('should handle missing updatedBy with system fallback', async () => {
      const startTime = Date.now() - 120000 // 2 minutes ago
      const beforeCard = createMockCard({ 
        status: 'draft',
        statusSince: Timestamp.fromMillis(startTime) as any, // Use Timestamp object
        updatedBy: undefined as any
      })

      await (tracker as any).updateStatsForTransitOut(beforeCard, Timestamp.now())

      // Verify that system user is used when updatedBy is missing
      const updateCall = mockBatch.update.mock.calls[0]
      const pendingItem = updateCall[1].currentPendings.elements[0]
      expect(pendingItem.userId).toBe('system')
    })
  })
})