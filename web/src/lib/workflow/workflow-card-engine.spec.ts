import type { IWorkflowCardStorage, IWorkflowConfigurationStorage } from '$lib/persistent/interface'
import type { IAuthenticationProvider } from '$lib/authentication/interface'
import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { WorkflowConfiguration } from '@cadence/shared/validation'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowFactory } from './factory'
import { STATUS_DRAFT } from '$lib/models/status'
import { USE_SERVER_TIMESTAMP } from '$lib/persistent/constant'

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
      listenForCards: vi.fn()
    }

    mockConfigStore = {
      loadConfig: vi.fn(),
      listWorkflows: vi.fn(),
      isSupportDynamicWorkflows: vi.fn()
    }

    mockAuthProvider = {
      getCurrentUid: vi.fn().mockResolvedValue(testUserId),
      getCurrentSession: vi.fn().mockResolvedValue({
        uid: testUserId,
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg'
      }),
      login: vi.fn(),
      logout: vi.fn(),
      onAuthStateChanged: vi.fn()
    }

    // Create WorkflowEngine using factory
    const mockConfig: WorkflowConfiguration = {
      name: 'Test Workflow',
      fields: [],
      types: [],
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

      // Verify the transition was called correctly
      expect(mockStorage.updateCard).toHaveBeenCalledWith(testWorkflowId, cardId, testUserId, {
        ...transitPayload,
        status: newStatus,
        statusSince: USE_SERVER_TIMESTAMP
      })

      // 4. DELETE
      await engine.deleteCard(cardId)
      expect(mockStorage.deleteCard).toHaveBeenCalledWith(testWorkflowId, cardId)
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
    let mockConfig: WorkflowConfiguration

    beforeEach(() => {
      mockConfig = {
        name: 'Test Workflow',
        fields: [
          { slug: 'priority', title: 'Priority', schema: { kind: 'text' } },
          { slug: 'assignee', title: 'Assignee', schema: { kind: 'text' } }
        ],
        types: [],
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

  describe('getCardSchema', () => {
    let schemaTestConfig: WorkflowConfiguration

    beforeEach(() => {
      schemaTestConfig = {
        name: 'Schema Test Workflow',
        fields: [
          {
            slug: 'priority',
            title: 'Priority',
            description: 'Task priority level',
            schema: { kind: 'choice', choices: ['low', 'medium', 'high'], default: 'medium' }
          },
          {
            slug: 'estimate',
            title: 'Estimate',
            schema: { kind: 'number', min: 0, max: 100, default: 1 }
          },
          {
            slug: 'description_detail',
            title: 'Detailed Description',
            schema: { kind: 'text', min: 10, max: 500, regex: '^[A-Za-z0-9 .,!?-]+$' }
          },
          {
            slug: 'is_urgent',
            title: 'Is Urgent',
            schema: { kind: 'bool', default: false }
          },
          {
            slug: 'reference_url',
            title: 'Reference URL',
            schema: { kind: 'url' }
          },
          {
            slug: 'tags',
            title: 'Tags',
            schema: {
              kind: 'multi-choice',
              choices: ['frontend', 'backend', 'testing', 'docs'],
              default: 'frontend,backend'
            }
          }
        ],
        types: [],
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
            slug: 'ready',
            title: 'Ready',
            terminal: false,
            ui: { color: 'blue' },
            precondition: { from: ['draft'], required: ['priority', 'estimate'], users: [] },
            transition: [],
            finally: []
          },
          {
            slug: 'in-progress',
            title: 'In Progress',
            terminal: false,
            ui: { color: 'yellow' },
            precondition: {
              from: ['ready'],
              required: ['priority', 'estimate', 'description_detail'],
              users: []
            },
            transition: [],
            finally: []
          }
        ]
      }

      vi.mocked(mockConfigStore.loadConfig).mockResolvedValue(schemaTestConfig)
    })

    it('should generate schema with core card fields', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('draft')

      // Assert
      expect(schema).toBeDefined()
      expect(schema.shape.title).toBeDefined()
      expect(schema.shape.description).toBeDefined()
      expect(schema.shape.value).toBeDefined()
      expect(schema.shape.type).toBeDefined()
      expect(schema.shape.owner).toBeDefined()
      expect(schema.shape.fieldData).toBeDefined()

      // Core fields should not include implicit fields
      expect(schema.shape.workflowId).toBeUndefined()
      expect(schema.shape.workflowCardId).toBeUndefined()
      expect(schema.shape.statusSince).toBeUndefined()
      expect(schema.shape.createdAt).toBeUndefined()
      expect(schema.shape.createdBy).toBeUndefined()
      expect(schema.shape.updatedAt).toBeUndefined()
      expect(schema.shape.updatedBy).toBeUndefined()
    })

    it('should generate fieldData schema based on workflow fields', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('draft')

      // Assert
      const fieldDataSchema = schema.shape.fieldData
      expect(fieldDataSchema).toBeDefined()

      // Test by parsing data - if the fields are defined, this will work
      const testData = {
        title: 'Test',
        description: '',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          priority: 'high',
          estimate: 5,
          description_detail: 'test description that is long enough',
          is_urgent: true,
          reference_url: 'https://example.com',
          tags: ['frontend']
        }
      }

      expect(() => schema.parse(testData)).not.toThrow()
    })

    it('should make fields required based on status preconditions', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const draftSchema = await engine.getCardSchema('draft')
      const readySchema = await engine.getCardSchema('ready')
      const inProgressSchema = await engine.getCardSchema('in-progress')

      // Assert - Draft status has no required fields
      const draftData = {
        title: 'Test Card',
        description: 'Test description',
        value: 0,
        type: '',
        owner: '',
        fieldData: {}
      }
      expect(() => draftSchema.parse(draftData)).not.toThrow()

      // Ready status requires priority and estimate
      const readyData = {
        ...draftData,
        fieldData: {
          priority: 'high',
          estimate: 5
        }
      }
      expect(() => readySchema.parse(readyData)).not.toThrow()

      // Missing required fields should fail - try parsing data without required fields
      const incompleteData = {
        title: 'Test Card',
        description: 'Test description',
        value: 0,
        type: '',
        owner: '',
        fieldData: {} // Missing priority and estimate which should be required for 'ready' status
      }

      expect(() => readySchema.parse(incompleteData)).toThrow()

      // In-progress status requires priority, estimate, and description_detail
      const inProgressData = {
        ...readyData,
        fieldData: {
          ...readyData.fieldData,
          description_detail: 'This is a detailed description with sufficient length.'
        }
      }
      expect(() => inProgressSchema.parse(inProgressData)).not.toThrow()
    })

    it('should validate number fields with min/max constraints', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('ready')

      // Assert
      const validData = {
        title: 'Test Card',
        description: 'Test',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          priority: 'high',
          estimate: 50 // Within range 0-100
        }
      }
      expect(() => schema.parse(validData)).not.toThrow()

      // Test min constraint
      const belowMinData = {
        ...validData,
        fieldData: { ...validData.fieldData, estimate: -1 }
      }
      expect(() => schema.parse(belowMinData)).toThrow()

      // Test max constraint
      const aboveMaxData = {
        ...validData,
        fieldData: { ...validData.fieldData, estimate: 101 }
      }
      expect(() => schema.parse(aboveMaxData)).toThrow()
    })

    it('should validate text fields with length and regex constraints', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('in-progress')

      // Assert
      const validData = {
        title: 'Test Card',
        description: 'Test',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          priority: 'high',
          estimate: 5,
          description_detail: 'This is a valid description with proper length and characters.'
        }
      }
      expect(() => schema.parse(validData)).not.toThrow()

      // Test min length constraint
      const tooShortData = {
        ...validData,
        fieldData: { ...validData.fieldData, description_detail: 'Short' }
      }
      expect(() => schema.parse(tooShortData)).toThrow()

      // Test regex constraint
      const invalidCharData = {
        ...validData,
        fieldData: {
          ...validData.fieldData,
          description_detail: 'This contains invalid chars: @#$%^&*()'
        }
      }
      expect(() => schema.parse(invalidCharData)).toThrow()
    })

    it('should validate choice fields with enum values', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('ready')

      // Assert
      const validData = {
        title: 'Test Card',
        description: 'Test',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          priority: 'high', // Valid choice
          estimate: 5
        }
      }
      expect(() => schema.parse(validData)).not.toThrow()

      // Test invalid choice
      const invalidChoiceData = {
        ...validData,
        fieldData: { ...validData.fieldData, priority: 'invalid-choice' }
      }
      expect(() => schema.parse(invalidChoiceData)).toThrow()
    })

    it('should validate boolean fields', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('draft')

      // Assert
      const validData = {
        title: 'Test Card',
        description: 'Test',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          is_urgent: true
        }
      }
      expect(() => schema.parse(validData)).not.toThrow()

      // Test with false
      const falseData = {
        ...validData,
        fieldData: { is_urgent: false }
      }
      expect(() => schema.parse(falseData)).not.toThrow()

      // Test with non-boolean (should fail)
      const invalidBoolData = {
        ...validData,
        fieldData: { is_urgent: 'not-a-boolean' }
      }
      expect(() => schema.parse(invalidBoolData)).toThrow()
    })

    it('should validate URL fields', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('draft')

      // Assert
      const validData = {
        title: 'Test Card',
        description: 'Test',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          reference_url: 'https://example.com/reference'
        }
      }
      expect(() => schema.parse(validData)).not.toThrow()

      // Test invalid URL
      const invalidUrlData = {
        ...validData,
        fieldData: { reference_url: 'not-a-valid-url' }
      }
      expect(() => schema.parse(invalidUrlData)).toThrow()
    })

    it('should validate multi-choice fields as arrays', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('draft')

      // Assert
      const validData = {
        title: 'Test Card',
        description: 'Test',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          tags: ['frontend', 'backend']
        }
      }
      expect(() => schema.parse(validData)).not.toThrow()

      // Test single valid choice
      const singleChoiceData = {
        ...validData,
        fieldData: { tags: ['testing'] }
      }
      expect(() => schema.parse(singleChoiceData)).not.toThrow()

      // Test invalid choice in array
      const invalidChoiceInArrayData = {
        ...validData,
        fieldData: { tags: ['frontend', 'invalid-tag'] }
      }
      expect(() => schema.parse(invalidChoiceInArrayData)).toThrow()
    })

    it('should apply default values from field schemas', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('draft')

      // Assert
      const minimalData = {
        title: 'Test Card'
      }
      const result = schema.parse(minimalData)

      expect(result.description).toBe('')
      expect(result.value).toBe(0)
      expect(result.type).toBe('')
      expect(result.owner).toBe('')
      // For draft status (no required fields), optional fields should get their defaults
      expect(result.fieldData.priority).toBe('medium')
      expect(result.fieldData.estimate).toBe(1)
      expect(result.fieldData.is_urgent).toBe(false)
      expect(result.fieldData.tags).toEqual(['frontend', 'backend'])
    })

    it('should throw error for unknown status', async () => {
      // Arrange
      const strictConfig: WorkflowConfiguration = {
        ...schemaTestConfig,
        types: [],
        statuses: [
          {
            slug: 'defined-status',
            title: 'Defined Status',
            terminal: false,
            ui: { color: 'blue' },
            precondition: { from: [], required: [], users: [] },
            transition: [],
            finally: []
          }
        ]
      }

      vi.mocked(mockConfigStore.loadConfig).mockResolvedValue(strictConfig)

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act & Assert
      await expect(engine.getCardSchema('unknown-status')).rejects.toThrow(
        'Unknown status: unknown-status'
      )
    })

    it('should handle empty field choices gracefully', async () => {
      // Arrange
      const configWithEmptyChoices: WorkflowConfiguration = {
        ...schemaTestConfig,
        fields: [
          {
            slug: 'empty_choice',
            title: 'Empty Choice',
            schema: { kind: 'choice', choices: [] }
          }
        ],
        types: []
      }

      vi.mocked(mockConfigStore.loadConfig).mockResolvedValue(configWithEmptyChoices)

      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schema = await engine.getCardSchema('draft')

      // Assert
      expect(schema).toBeDefined()
      // Test that we can parse data with the empty choice field
      const testData = {
        title: 'Test',
        description: '',
        value: 0,
        type: '',
        owner: '',
        fieldData: {
          empty_choice: ''
        }
      }
      expect(() => schema.parse(testData)).not.toThrow()
    })

    it('should use STATUS_DRAFT as default status parameter', async () => {
      // Arrange
      const factory = WorkflowFactory.use(mockStorage, mockConfigStore, mockAuthProvider)
      const engine = factory.getWorkflowEngine(testWorkflowId)

      // Act
      const schemaWithDefault = await engine.getCardSchema()
      const schemaWithExplicit = await engine.getCardSchema('draft')

      // Assert
      expect(schemaWithDefault).toBeDefined()
      expect(schemaWithExplicit).toBeDefined()
      // Both should have the same structure since 'draft' is the default
      expect(Object.keys(schemaWithDefault.shape)).toEqual(Object.keys(schemaWithExplicit.shape))
    })
  })
})
