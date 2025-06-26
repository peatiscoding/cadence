import type { IWorkflowCardStorage, IWorkflowConfigurationStorage } from '$lib/persistent/interface'
import type { IAuthenticationProvider } from '$lib/authentication/interface'
import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { Configuration } from '$lib/schema'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowFactory } from './factory'
import { STATUS_DRAFT, USE_SERVER_TIMESTAMP } from '$lib/persistent/constant'

describe('WorkflowCardEngine with Stubbed Storage', () => {
  let mockStorage: IWorkflowCardStorage
  let mockConfigStore: IWorkflowConfigurationStorage
  let mockAuthProvider: IAuthenticationProvider
  let engine: IWorkflowCardEngine
  const testWorkflowId = 'test-workflow-123'
  const testUserId = 'test-user-456'

  beforeEach(() => {
    // Create stubbed storage service
    mockStorage = {
      createCard: vi.fn(),
      updateCard: vi.fn(),
      getCard: vi.fn(),
      deleteCard: vi.fn(),
      listCards: vi.fn()
    }

    mockConfigStore = {
      loadConfig: vi.fn()
    }

    mockAuthProvider = {
      getCurrentUid: vi.fn().mockResolvedValue(testUserId)
    }

    // Create WorkflowEngine using factory
    const mockConfig: Configuration = {
      name: 'Test Workflow',
      fields: [],
      statuses: [
        {
          slug: 'draft',
          title: 'Draft',
          terminal: false,
          ui: { color: 'gray' },
          precondition: { from: [], required: [], users: [] },
          transition: [],
          finally: []
        },
        {
          slug: 'todo',
          title: 'Todo',
          terminal: false,
          ui: { color: 'blue' },
          precondition: { from: [], required: [], users: [] },
          transition: [],
          finally: []
        },
        {
          slug: 'in-progress',
          title: 'In Progress',
          terminal: false,
          ui: { color: 'yellow' },
          precondition: { from: [], required: [], users: [] },
          transition: [],
          finally: []
        },
        {
          slug: 'review',
          title: 'Review',
          terminal: false,
          ui: { color: 'orange' },
          precondition: { from: [], required: [], users: [] },
          transition: [],
          finally: []
        },
        {
          slug: 'done',
          title: 'Done',
          terminal: true,
          ui: { color: 'green' },
          precondition: { from: [], required: [], users: [] },
          transition: [],
          finally: []
        },
        {
          slug: 'cancelled',
          title: 'Cancelled',
          terminal: true,
          ui: { color: 'red' },
          precondition: { from: [], required: [], users: [] },
          transition: [],
          finally: []
        },
        {
          slug: 'completed',
          title: 'Completed',
          terminal: true,
          ui: { color: 'green' },
          precondition: { from: [], required: [], users: [] },
          transition: [],
          finally: []
        }
      ]
    }
    vi.mocked(mockConfigStore.loadConfig).mockReturnValue(Promise.resolve(mockConfig))
    const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
    engine = factory.getWorkflowEngine(testWorkflowId)
  })

  describe('makeNewCard', () => {
    it('should create a new card with draft status', async () => {
      // Arrange
      const creationPayload: IWorkflowCardEntryCreation = {
        title: 'New Task Card',
        description: 'This is a new task to complete',
        value: 100
      }
      const expectedCardId = 'card-id-123'

      vi.mocked(mockStorage.createCard).mockResolvedValue(expectedCardId)

      // Act
      const result = await engine.makeNewCard(creationPayload)

      // Assert
      expect(result).toBe(expectedCardId)
      expect(mockStorage.createCard).toHaveBeenCalledWith(testWorkflowId, testUserId, {
        ...creationPayload,
        status: STATUS_DRAFT,
        statusSince: USE_SERVER_TIMESTAMP
      })
    })

    it('should handle creation payload with all fields', async () => {
      // Arrange
      const fullCreationPayload: IWorkflowCardEntryCreation = {
        title: 'Full Featured Card',
        description: 'Card with all creation fields',
        value: 500
      }
      const expectedCardId = 'full-card-789'

      vi.mocked(mockStorage.createCard).mockResolvedValue(expectedCardId)

      // Act
      const result = await engine.makeNewCard(fullCreationPayload)

      // Assert
      expect(result).toBe(expectedCardId)
      expect(mockStorage.createCard).toHaveBeenCalledWith(testWorkflowId, testUserId, {
        title: 'Full Featured Card',
        description: 'Card with all creation fields',
        value: 500,
        status: STATUS_DRAFT,
        statusSince: USE_SERVER_TIMESTAMP
      })
    })

    it('should handle creation with zero value', async () => {
      // Arrange
      const zeroValuePayload: IWorkflowCardEntryCreation = {
        title: 'Zero Value Card',
        description: 'Card with zero value',
        value: 0
      }
      const expectedCardId = 'zero-card-456'

      vi.mocked(mockStorage.createCard).mockResolvedValue(expectedCardId)

      // Act
      const result = await engine.makeNewCard(zeroValuePayload)

      // Assert
      expect(result).toBe(expectedCardId)
      expect(mockStorage.createCard).toHaveBeenCalledWith(testWorkflowId, testUserId, {
        ...zeroValuePayload,
        status: STATUS_DRAFT,
        statusSince: USE_SERVER_TIMESTAMP
      })
    })

    it('should propagate storage errors', async () => {
      // Arrange
      const creationPayload: IWorkflowCardEntryCreation = {
        title: 'Error Card',
        description: 'This will cause an error',
        value: 50
      }
      const storageError = new Error('Storage connection failed')

      vi.mocked(mockStorage.createCard).mockRejectedValue(storageError)

      // Act & Assert
      await expect(engine.makeNewCard(creationPayload)).rejects.toThrow('Storage connection failed')
    })
  })

  describe('updateCardDetail', () => {
    const testCardId = 'update-card-123'

    it('should update card details without changing status', async () => {
      // Arrange
      const updatePayload: IWorkflowCardEntryModification = {
        title: 'Updated Title',
        description: 'Updated description',
        owner: 'new-owner',
        type: 'bug',
        value: 250,
        fieldData: {
          priority: 'high',
          tags: ['urgent', 'critical']
        }
      }

      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Act
      await engine.updateCardDetail(testCardId, updatePayload)

      // Assert
      expect(mockStorage.updateCard).toHaveBeenCalledWith(
        testWorkflowId,
        testCardId,
        testUserId,
        updatePayload
      )
    })

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdatePayload: IWorkflowCardEntryModification = {
        title: 'Only Title Updated'
      }

      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Act
      await engine.updateCardDetail(testCardId, partialUpdatePayload)

      // Assert
      expect(mockStorage.updateCard).toHaveBeenCalledWith(
        testWorkflowId,
        testCardId,
        testUserId,
        partialUpdatePayload
      )
    })

    it('should handle empty field data updates', async () => {
      // Arrange
      const emptyFieldDataPayload: IWorkflowCardEntryModification = {
        fieldData: {}
      }

      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Act
      await engine.updateCardDetail(testCardId, emptyFieldDataPayload)

      // Assert
      expect(mockStorage.updateCard).toHaveBeenCalledWith(
        testWorkflowId,
        testCardId,
        testUserId,
        emptyFieldDataPayload
      )
    })

    it('should handle complex field data updates', async () => {
      // Arrange
      const complexUpdatePayload: IWorkflowCardEntryModification = {
        fieldData: {
          metadata: {
            assignees: ['dev1', 'dev2'],
            estimatedHours: 40,
            dependencies: ['card-a', 'card-b']
          },
          tags: ['backend', 'api'],
          customFields: {
            clientRequirement: true,
            deadline: '2024-12-31'
          }
        }
      }

      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Act
      await engine.updateCardDetail(testCardId, complexUpdatePayload)

      // Assert
      expect(mockStorage.updateCard).toHaveBeenCalledWith(
        testWorkflowId,
        testCardId,
        testUserId,
        complexUpdatePayload
      )
    })

    it('should propagate storage update errors', async () => {
      // Arrange
      const updatePayload: IWorkflowCardEntryModification = {
        title: 'Error Update'
      }
      const updateError = new Error('Update failed')

      vi.mocked(mockStorage.updateCard).mockRejectedValue(updateError)

      // Act & Assert
      await expect(engine.updateCardDetail(testCardId, updatePayload)).rejects.toThrow(
        'Update failed'
      )
    })
  })

  describe('attemptToTransitCard', () => {
    const testCardId = 'transit-card-456'

    it('should transit card to new status with payload', async () => {
      // Arrange
      const newStatus = 'in-progress'
      const transitPayload: IWorkflowCardEntryModification = {
        title: 'Updated during transit',
        description: 'Updated while changing status',
        fieldData: {
          startedAt: Date.now(),
          assignedTo: 'developer-1'
        }
      }

      const mockCard: IWorkflowCardEntry = {
        workflowCardId: testCardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {},
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)
      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Act
      await engine.attemptToTransitCard(testCardId, newStatus, transitPayload)

      // Assert
      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, testCardId, testUserId, {
        ...transitPayload,
        status: newStatus,
        statusSince: USE_SERVER_TIMESTAMP
      })
    })

    it('should transit card with empty payload', async () => {
      // Arrange
      const newStatus = 'done'
      const emptyPayload: IWorkflowCardEntryModification = {}

      const mockCard: IWorkflowCardEntry = {
        workflowCardId: testCardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {},
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)
      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Act
      await engine.attemptToTransitCard(testCardId, newStatus, emptyPayload)

      // Assert
      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, testCardId, testUserId, {
        status: newStatus,
        statusSince: USE_SERVER_TIMESTAMP
      })
    })

    it('should handle transit to various statuses', async () => {
      // Test multiple status transitions
      const statuses = ['todo', 'in-progress', 'review', 'done', 'cancelled']
      const basePayload: IWorkflowCardEntryModification = {
        fieldData: { transitionNote: 'Status changed during test' }
      }

      const mockCard: IWorkflowCardEntry = {
        workflowCardId: testCardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {},
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)
      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      for (const status of statuses) {
        await engine.attemptToTransitCard(testCardId, status, basePayload)

        expect(mockStorage.updateCard).toHaveBeenCalledWith(
          testWorkflowId,
          testCardId,
          testUserId,
          {
            ...basePayload,
            status,
            statusSince: USE_SERVER_TIMESTAMP
          }
        )
      }

      expect(mockStorage.updateCard).toHaveBeenCalledTimes(statuses.length)
    })

    it('should overwrite status even if included in payload', async () => {
      // Arrange
      const newStatus = 'completed'
      const payloadWithStatus: any = {
        title: 'Updated title',
        status: 'should-be-overwritten', // This should be ignored
        statusSince: 'should-also-be-overwritten'
      }

      const mockCard: IWorkflowCardEntry = {
        workflowCardId: testCardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {},
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)
      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Act
      await engine.attemptToTransitCard(testCardId, newStatus, payloadWithStatus)

      // Assert
      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, testCardId, testUserId, {
        title: 'Updated title',
        status: newStatus, // Should use the method parameter
        statusSince: USE_SERVER_TIMESTAMP // Should use server timestamp
      })
    })

    it('should propagate storage transit errors', async () => {
      // Arrange
      const newStatus = 'in-progress'
      const payload: IWorkflowCardEntryModification = {}
      const transitError = new Error('Transit operation failed')

      const mockCard: IWorkflowCardEntry = {
        workflowCardId: testCardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {},
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)
      vi.mocked(mockStorage.updateCard).mockRejectedValue(transitError)

      // Act & Assert
      await expect(engine.attemptToTransitCard(testCardId, newStatus, payload)).rejects.toThrow(
        'Transit operation failed'
      )
    })
  })

  describe('deleteCard', () => {
    const testCardId = 'delete-card-789'

    it('should delete a card successfully', async () => {
      // Arrange
      vi.mocked(mockStorage.deleteCard).mockResolvedValue()

      // Act
      await engine.deleteCard(testCardId)

      // Assert
      expect(mockStorage.deleteCard).toHaveBeenCalledWith(testWorkflowId, testCardId)
    })

    it('should handle deletion of multiple cards', async () => {
      // Arrange
      const cardIds = ['card-1', 'card-2', 'card-3']
      vi.mocked(mockStorage.deleteCard).mockResolvedValue()

      // Act
      for (const cardId of cardIds) {
        await engine.deleteCard(cardId)
      }

      // Assert
      expect(mockStorage.deleteCard).toHaveBeenCalledTimes(3)
      cardIds.forEach((cardId) => {
        expect(mockStorage.deleteCard).toHaveBeenCalledWith(testWorkflowId, cardId)
      })
    })

    it('should propagate storage deletion errors', async () => {
      // Arrange
      const deleteError = new Error('Deletion not allowed')
      vi.mocked(mockStorage.deleteCard).mockRejectedValue(deleteError)

      // Act & Assert
      await expect(engine.deleteCard(testCardId)).rejects.toThrow('Deletion not allowed')
    })
  })

  describe('WorkflowEngine integration scenarios', () => {
    it('should demonstrate complete card lifecycle', async () => {
      const cardCreationPayload: IWorkflowCardEntryCreation = {
        title: 'Lifecycle Test Card',
        description: 'Testing complete lifecycle',
        value: 300
      }
      const createdCardId = 'lifecycle-card-123'

      // Setup mocks
      vi.mocked(mockStorage.createCard).mockResolvedValue(createdCardId)
      vi.mocked(mockStorage.updateCard).mockResolvedValue()
      vi.mocked(mockStorage.deleteCard).mockResolvedValue()

      // 1. CREATE
      const cardId = await engine.makeNewCard(cardCreationPayload)
      expect(cardId).toBe(createdCardId)
      expect(mockStorage.createCard).toHaveBeenCalledWith(testWorkflowId, testUserId, {
        ...cardCreationPayload,
        status: STATUS_DRAFT,
        statusSince: USE_SERVER_TIMESTAMP
      })

      // 2. UPDATE DETAILS
      const updatePayload: IWorkflowCardEntryModification = {
        title: 'Updated Lifecycle Card',
        description: 'Description updated during lifecycle',
        fieldData: { updated: true }
      }
      await engine.updateCardDetail(cardId, updatePayload)
      expect(mockStorage.updateCard).toHaveBeenCalledWith(
        testWorkflowId,
        cardId,
        testUserId,
        updatePayload
      )

      // 3. TRANSIT STATUS
      const newStatus = 'in-progress'
      const transitPayload: IWorkflowCardEntryModification = {
        fieldData: { startedWork: true }
      }
      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Lifecycle Test Card',
        description: 'Testing complete lifecycle',
        fieldData: {},
        value: 300,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }
      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)
      await engine.attemptToTransitCard(cardId, newStatus, transitPayload)
      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, cardId, testUserId, {
        ...transitPayload,
        status: newStatus,
        statusSince: USE_SERVER_TIMESTAMP
      })

      // 4. DELETE
      await engine.deleteCard(cardId)
      expect(mockStorage.deleteCard).toHaveBeenCalledWith(testWorkflowId, cardId)
    })

    it('should handle multiple users operating on different cards', async () => {
      const user1 = 'user-1'
      const user2 = 'user-2'
      const card1Payload: IWorkflowCardEntryCreation = {
        title: 'User 1 Card',
        description: 'Card created by user 1',
        value: 100
      }
      const card2Payload: IWorkflowCardEntryCreation = {
        title: 'User 2 Card',
        description: 'Card created by user 2',
        value: 200
      }

      vi.mocked(mockStorage.createCard)
        .mockResolvedValueOnce('card-1')
        .mockResolvedValueOnce('card-2')
      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      // Setup auth provider to return different users
      vi.mocked(mockAuthProvider.getCurrentUid)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2)
        .mockResolvedValueOnce(user2)

      // User 1 creates and updates their card
      const card1Id = await engine.makeNewCard(card1Payload)
      await engine.updateCardDetail(card1Id, { title: 'Updated by User 1' })

      // User 2 creates and transits their card
      const card2Id = await engine.makeNewCard(card2Payload)
      const mockCard2: IWorkflowCardEntry = {
        workflowCardId: card2Id,
        workflowId: testWorkflowId,
        title: 'User 2 Card',
        description: 'Card created by user 2',
        fieldData: {},
        value: 200,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }
      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard2)
      await engine.attemptToTransitCard(card2Id, 'completed', {
        fieldData: { completedBy: user2 }
      })

      // Verify correct user attribution
      expect(mockStorage.createCard).toHaveBeenCalledWith(
        testWorkflowId,
        user1,
        expect.objectContaining(card1Payload)
      )
      expect(mockStorage.createCard).toHaveBeenCalledWith(
        testWorkflowId,
        user2,
        expect.objectContaining(card2Payload)
      )
      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, card1Id, user1, {
        title: 'Updated by User 1'
      })
      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, card2Id, user2, {
        fieldData: { completedBy: user2 },
        status: 'completed',
        statusSince: USE_SERVER_TIMESTAMP
      })
    })

    it('should handle rapid status transitions', async () => {
      const cardId = 'rapid-transit-card'
      const statusSequence = ['todo', 'in-progress', 'review', 'done']

      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Rapid Transit Card',
        description: 'Testing rapid transitions',
        fieldData: {},
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }
      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)

      // Perform rapid status transitions
      for (let i = 0; i < statusSequence.length; i++) {
        const status = statusSequence[i]
        const payload: IWorkflowCardEntryModification = {
          fieldData: { transitionStep: i + 1 }
        }
        await engine.attemptToTransitCard(cardId, status, payload)
      }

      // Verify all transitions were called
      expect(mockStorage.updateCard).toHaveBeenCalledTimes(statusSequence.length)
      statusSequence.forEach((status, index) => {
        expect(mockStorage.updateCard).toHaveBeenNthCalledWith(
          index + 1,
          testWorkflowId,
          cardId,
          testUserId,
          {
            fieldData: { transitionStep: index + 1 },
            status,
            statusSince: USE_SERVER_TIMESTAMP
          }
        )
      })
    })
  })

  describe('WorkflowFactory', () => {
    it('should create engine with correct workflow ID', () => {
      // Arrange
      const customWorkflowId = 'custom-workflow-abc'

      // Act
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const customEngine = factory.getWorkflowEngine(customWorkflowId)

      // Assert
      expect(customEngine).toBeDefined()
      // Engine should be configured with the correct workflow ID
      // (This is verified through the behavior in other tests where workflowId is passed to storage methods)
    })

    it('should create multiple engines with different workflow IDs', () => {
      // Arrange
      const workflowIds = ['workflow-1', 'workflow-2', 'workflow-3']

      // Act
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engines = workflowIds.map((id) => factory.getWorkflowEngine(id))

      // Assert
      expect(engines).toHaveLength(3)
      engines.forEach((engine) => {
        expect(engine).toBeDefined()
      })
    })
  })

  describe('Precondition validation with actual config', () => {
    let mockConfig: Configuration

    beforeEach(() => {
      mockConfig = {
        name: 'Test Workflow',
        fields: [
          { slug: 'priority', title: 'Priority', schema: { kind: 'text' } },
          { slug: 'assignee', title: 'Assignee', schema: { kind: 'text' } }
        ],
        statuses: [
          {
            slug: 'draft',
            title: 'Draft',
            terminal: false,
            ui: { color: 'gray' },
            precondition: { from: [], required: [], users: [] },
            transition: [],
            finally: []
          },
          {
            slug: 'in-progress',
            title: 'In Progress',
            terminal: false,
            ui: { color: 'blue' },
            precondition: {
              from: ['draft', 'todo'],
              required: ['assignee'],
              users: ['dev1', 'dev2']
            },
            transition: [],
            finally: []
          },
          {
            slug: 'review',
            title: 'Review',
            terminal: false,
            ui: { color: 'orange' },
            precondition: {
              from: ['in-progress'],
              required: ['assignee', 'priority', 'description'],
              users: ['dev1', 'dev2', 'reviewer1']
            },
            transition: [],
            finally: []
          }
        ]
      }

      vi.mocked(mockConfigStore.loadConfig).mockResolvedValue(mockConfig)
    })

    it('should throw error when user not authorized', async () => {
      const cardId = 'test-card'
      const unauthorizedUser = 'unauthorized-user'
      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: { assignee: 'dev1' },
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      vi.mocked(mockAuthProvider.getCurrentUid).mockResolvedValue(unauthorizedUser)

      await expect(engine.attemptToTransitCard(cardId, 'in-progress', {})).rejects.toThrow(
        "User 'unauthorized-user' is not authorized to perform this transition"
      )
    })

    it('should throw error when required field missing', async () => {
      const cardId = 'test-card'
      const authorizedUser = 'dev1'
      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {}, // Missing required 'assignee' field
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      vi.mocked(mockAuthProvider.getCurrentUid).mockResolvedValue(authorizedUser)

      await expect(engine.attemptToTransitCard(cardId, 'in-progress', {})).rejects.toThrow(
        "Required field 'assignee' is missing or empty"
      )
    })

    it('should throw error when multiple required fields are missing', async () => {
      const cardId = 'test-card'
      const authorizedUser = 'dev1'
      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {}, // Missing all required fields: assignee, priority, description
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'in-progress',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      vi.mocked(mockAuthProvider.getCurrentUid).mockResolvedValue(authorizedUser)

      await expect(engine.attemptToTransitCard(cardId, 'review', {})).rejects.toThrow(
        "Required fields 'assignee', 'priority', 'description' are missing or empty"
      )
    })

    it('should throw error when some required fields are missing', async () => {
      const cardId = 'test-card'
      const authorizedUser = 'reviewer1'
      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: {
          assignee: 'dev1' // Missing priority and description fields
        },
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'in-progress',
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      vi.mocked(mockAuthProvider.getCurrentUid).mockResolvedValue(authorizedUser)

      await expect(engine.attemptToTransitCard(cardId, 'review', {})).rejects.toThrow(
        "Required fields 'priority', 'description' are missing or empty"
      )
    })

    it('should throw error when transition from invalid status', async () => {
      const cardId = 'test-card'
      const authorizedUser = 'dev1'
      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: { assignee: 'dev1' },
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'completed', // Invalid 'from' status
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      vi.mocked(mockAuthProvider.getCurrentUid).mockResolvedValue(authorizedUser)

      await expect(engine.attemptToTransitCard(cardId, 'in-progress', {})).rejects.toThrow(
        "Cannot transition from status 'completed' to this status"
      )
    })

    it('should successfully transit when all preconditions are met', async () => {
      const cardId = 'test-card'
      const authorizedUser = 'dev1'
      const mockCard: IWorkflowCardEntry = {
        workflowCardId: cardId,
        workflowId: testWorkflowId,
        title: 'Test Card',
        description: 'Test',
        fieldData: { assignee: 'dev1' },
        value: 100,
        type: 'task',
        owner: 'owner1',
        status: 'draft', // Valid 'from' status
        statusSince: Date.now(),
        createdBy: 'creator',
        createdAt: Date.now(),
        updatedBy: 'updater',
        updatedAt: Date.now()
      }

      vi.mocked(mockStorage.getCard).mockResolvedValue(mockCard)
      vi.mocked(mockStorage.updateCard).mockResolvedValue()

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      vi.mocked(mockAuthProvider.getCurrentUid).mockResolvedValue(authorizedUser)

      await expect(engine.attemptToTransitCard(cardId, 'in-progress', {})).resolves.not.toThrow()

      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, cardId, authorizedUser, {
        status: 'in-progress',
        statusSince: USE_SERVER_TIMESTAMP
      })
    })

    it('should throw error for unknown status', async () => {
      const cardId = 'test-card'
      const authorizedUser = 'dev1'

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      vi.mocked(mockAuthProvider.getCurrentUid).mockResolvedValue(authorizedUser)

      await expect(engine.attemptToTransitCard(cardId, 'unknown-status', {})).rejects.toThrow(
        'Unknown new status: unknown-status'
      )
    })
  })
})
