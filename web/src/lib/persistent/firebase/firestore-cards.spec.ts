import type { Auth } from 'firebase/auth'
import type { IOnCallResponse } from '@cadence/shared/types'
import type { IWorkflowCardStorage, IWorkflowConfigurationStorage } from '../interface'
import { FIREBASE_REGION } from '@cadence/shared/models/firestore'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest'
import { FirestoreWorkflowCardStorage } from './firestore'
import { USE_SERVER_TIMESTAMP } from '../constant'

// Integration tests for Firebase Firestore card storage
// These tests require Firebase emulator to be running
describe('FirestoreWorkflowCardStorage - Card Operations', () => {
  let storage: IWorkflowCardStorage & IWorkflowConfigurationStorage
  const testWorkflowId = `test-workflow-${Date.now()}`
  let auth: Auth

  beforeAll(async () => {
    // Login firebase
    auth = getAuth()
    const fns = getFunctions(undefined, FIREBASE_REGION)
    const loginFn = httpsCallable<undefined, IOnCallResponse<string>>(fns, 'loginFn')
    const res = await loginFn()
    if (!res.data.success) {
      throw new Error('Unable to initiate test, authentication failed', res.data.reason)
    }
    // the app is now logged in.
    await signInWithCustomToken(auth, res.data.result)
  })

  beforeEach(() => {
    // Use shared instance for integration tests
    storage = FirestoreWorkflowCardStorage.shared()
  })

  const createdCardIds: string[] = []

  afterEach(async () => {
    // Clean up created cards
    await Promise.all(
      createdCardIds.map((cardId) =>
        storage.deleteCard(testWorkflowId, cardId).catch(() => {
          // Ignore errors for cards that might already be deleted
        })
      )
    )
    createdCardIds.length = 0 // Clear the array
  })

  afterAll(async () => {
    // logout
    await signOut(auth)
  })

  describe('createCard', () => {
    it('should create a card and return document ID', async () => {
      // Arrange
      const creationPayload = {
        title: 'Integration Test Card',
        description: 'Test Description for Integration',
        owner: 'test-user-123',
        status: 'todo',
        type: 'task',
        value: 150,
        fieldData: {
          priority: 'high',
          category: 'development'
        }
      }

      // Act
      const cardId = await storage.createCard(testWorkflowId, 'vitest', creationPayload)
      createdCardIds.push(cardId) // Track for cleanup

      // Assert
      expect(cardId).toBeDefined()
      expect(typeof cardId).toBe('string')
      expect(cardId.length).toBeGreaterThan(0)

      // Verify the card was created by reading it back
      const retrievedCard = await storage.getCard(testWorkflowId, cardId)
      expect(retrievedCard.title).toBe(creationPayload.title)
      expect(retrievedCard.description).toBe(creationPayload.description)
      expect(retrievedCard.owner).toBe(creationPayload.owner)
      expect(retrievedCard.updatedBy).toBe('vitest')
      expect(retrievedCard.workflowId).toBe(testWorkflowId)
      expect(retrievedCard.workflowCardId).toBe(cardId)
    })

    it('should handle different payload types', async () => {
      // Arrange
      const creationPayload = {
        title: 'Minimal Card',
        description: 'Minimal description',
        owner: 'test-user',
        status: 'new',
        type: 'bug',
        value: 0,
        fieldData: {}
      }

      // Act
      const cardId = await storage.createCard(testWorkflowId, 'test-creator', creationPayload)
      createdCardIds.push(cardId)

      // Assert
      const retrievedCard = await storage.getCard(testWorkflowId, cardId)
      expect(retrievedCard.value).toBe(0)
      expect(retrievedCard.fieldData).toEqual({})
      expect(retrievedCard.type).toBe('bug')
    })

    it('should create cards with complex field data', async () => {
      // Arrange
      const complexFieldData = {
        estimatedHours: 40,
        dependencies: ['card-1', 'card-2'],
        tags: ['urgent', 'backend'],
        assignedTeam: 'backend-team'
      }

      const creationPayload = {
        title: 'Complex Card',
        description: 'Card with complex data',
        owner: 'complex-user',
        status: 'in-progress',
        type: 'feature',
        value: 500,
        fieldData: complexFieldData
      }

      // Act
      const cardId = await storage.createCard(testWorkflowId, 'vitest', creationPayload)
      createdCardIds.push(cardId)

      // Assert
      const retrievedCard = await storage.getCard(testWorkflowId, cardId)
      expect(retrievedCard.fieldData).toEqual(complexFieldData)
      expect(retrievedCard.fieldData.estimatedHours).toBe(40)
      expect(retrievedCard.fieldData.dependencies).toEqual(['card-1', 'card-2'])
      expect(retrievedCard.fieldData.tags).toEqual(['urgent', 'backend'])
    })
  })

  describe('updateCard', () => {
    it('should update card fields successfully', async () => {
      // Arrange - Create a card first
      const initialPayload = {
        title: 'Original Card Title',
        description: 'Original description',
        owner: 'original-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: {}
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      // Act - Update the card
      const updatePayload = {
        title: 'Updated Card Title',
        description: 'Updated description',
        value: 200
      }

      await storage.updateCard(testWorkflowId, cardId, 'test-updater', updatePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.title).toBe('Updated Card Title')
      expect(updatedCard.description).toBe('Updated description')
      expect(updatedCard.value).toBe(200)
      expect(updatedCard.updatedBy).toBe('test-updater')
      // Original fields should remain unchanged
      expect(updatedCard.owner).toBe('original-owner')
      expect(updatedCard.status).toBe('todo')
      expect(updatedCard.type).toBe('task')
    })

    it('should update only specified fields (partial update)', async () => {
      // Arrange
      const initialPayload = {
        title: 'Original Card Title',
        description: 'Original description',
        owner: 'original-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: { priority: 'low' }
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      // Act - Update only the title
      const partialUpdate = {
        title: 'Partially Updated Title'
      }

      await storage.updateCard(testWorkflowId, cardId, 'partial-updater', partialUpdate)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.title).toBe('Partially Updated Title')
      // All other fields should remain unchanged
      expect(updatedCard.description).toBe('Original description')
      expect(updatedCard.owner).toBe('original-owner')
      expect(updatedCard.status).toBe('todo')
      expect(updatedCard.type).toBe('task')
      expect(updatedCard.value).toBe(100)
      expect(updatedCard.fieldData.priority).toBe('low')
      expect(updatedCard.updatedBy).toBe('partial-updater')
    })

    it('should update status and statusSince timestamp', async () => {
      // Arrange
      const initialPayload = {
        title: 'Status Test Card',
        description: 'Card for testing status updates',
        owner: 'status-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: {}
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      const originalCard = await storage.getCard(testWorkflowId, cardId)
      const originalStatusSince = originalCard.statusSince

      // Wait a moment to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Update status
      const statusUpdate = {
        status: 'in-progress',
        statusSince: USE_SERVER_TIMESTAMP
      }

      await storage.updateCard(testWorkflowId, cardId, 'status-updater', statusUpdate)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.status).toBe('in-progress')
      expect(updatedCard.statusSince).toBeGreaterThan(originalStatusSince)
      expect(updatedCard.updatedBy).toBe('status-updater')
    })

    it('should update complex field data', async () => {
      // Arrange
      const initialPayload = {
        title: 'Field Data Test Card',
        description: 'Card for testing field data updates',
        owner: 'field-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: {
          priority: 'low',
          tags: ['initial']
        }
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      // Act - Update field data
      const fieldDataUpdate = {
        fieldData: {
          priority: 'high',
          tags: ['updated', 'urgent'],
          assignee: 'new-assignee'
        }
      }

      await storage.updateCard(testWorkflowId, cardId, 'field-updater', fieldDataUpdate)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.fieldData.priority).toBe('high')
      expect(updatedCard.fieldData.tags).toEqual(['updated', 'urgent'])
      expect(updatedCard.fieldData.assignee).toBe('new-assignee')
      expect(updatedCard.updatedBy).toBe('field-updater')
    })

    it('should handle empty field data update', async () => {
      // Arrange
      const initialPayload = {
        title: 'Original Card Title',
        description: 'Original description',
        owner: 'original-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: { priority: 'high' }
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      // Act - Update with empty field data
      const emptyFieldDataUpdate = {
        fieldData: {}
      }

      await storage.updateCard(testWorkflowId, cardId, 'empty-field-updater', emptyFieldDataUpdate)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.fieldData).toEqual({})
      expect(updatedCard.updatedBy).toBe('empty-field-updater')
    })

    it('should update multiple fields at once', async () => {
      // Arrange
      const initialPayload = {
        title: 'Original Card Title',
        description: 'Original description',
        owner: 'original-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: { priority: 'low' }
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      // Act - Update multiple fields
      const multiFieldUpdate = {
        title: 'Multi-field Updated Title',
        description: 'Multi-field updated description',
        value: 250,
        status: 'in-progress',
        fieldData: {
          priority: 'high',
          category: 'urgent'
        }
      }

      await storage.updateCard(testWorkflowId, cardId, 'multi-field-updater', multiFieldUpdate)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.title).toBe('Multi-field Updated Title')
      expect(updatedCard.description).toBe('Multi-field updated description')
      expect(updatedCard.value).toBe(250)
      expect(updatedCard.status).toBe('in-progress')
      expect(updatedCard.fieldData.priority).toBe('high')
      expect(updatedCard.fieldData.category).toBe('urgent')
      expect(updatedCard.updatedBy).toBe('multi-field-updater')
      // Unchanged fields
      expect(updatedCard.owner).toBe('original-owner')
      expect(updatedCard.type).toBe('task')
    })

    it('should handle update with zero and false values', async () => {
      // Arrange
      const initialPayload = {
        title: 'Original Card Title',
        description: 'Original description',
        owner: 'original-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: { isActive: true, count: 5 }
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      // Act - Update with zero and false values
      const zeroFalseUpdate = {
        value: 0,
        fieldData: {
          isActive: false,
          count: 0
        }
      }

      await storage.updateCard(testWorkflowId, cardId, 'zero-false-updater', zeroFalseUpdate)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.value).toBe(0)
      expect(updatedCard.fieldData.isActive).toBe(false)
      expect(updatedCard.fieldData.count).toBe(0)
      expect(updatedCard.updatedBy).toBe('zero-false-updater')
    })

    it('should throw error when updating non-existent card', async () => {
      // Arrange
      const nonExistentCardId = 'non-existent-card-id'
      const updatePayload = {
        title: 'Should not work',
        updatedBy: 'error-tester'
      }

      // Act & Assert
      await expect(
        storage.updateCard(testWorkflowId, nonExistentCardId, 'error-tester', updatePayload)
      ).rejects.toThrow()
    })

    it('should preserve timestamps correctly', async () => {
      // Arrange
      const initialPayload = {
        title: 'Timestamp Test Card',
        description: 'Card for testing timestamp preservation',
        owner: 'timestamp-owner',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: {}
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)
      createdCardIds.push(cardId)

      const originalCard = await storage.getCard(testWorkflowId, cardId)
      const originalCreatedAt = originalCard.createdAt
      const originalUpdatedAt = originalCard.updatedAt

      // Wait to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Update the card
      const updatePayload = {
        title: 'Timestamp Test Update'
      }

      await storage.updateCard(testWorkflowId, cardId, 'timestamp-updater', updatePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.createdAt).toBe(originalCreatedAt) // Should be preserved
      expect(updatedCard.updatedAt).toBeGreaterThan(originalUpdatedAt) // Should be updated
      expect(updatedCard.createdBy).toBe('test-creator') // Should be preserved
      expect(updatedCard.updatedBy).toBe('timestamp-updater') // Should be updated
    })
  })

  describe('deleteCard', () => {
    it('should delete an existing card successfully', async () => {
      // Arrange - Create a card first
      const cardPayload = {
        title: 'Card to Delete',
        description: 'This card will be deleted',
        owner: 'delete-test-user',
        status: 'todo',
        type: 'task',
        value: 50,
        fieldData: {
          priority: 'low',
          category: 'test'
        }
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', cardPayload)

      // Verify card exists before deletion
      const cardBeforeDeletion = await storage.getCard(testWorkflowId, cardId)
      expect(cardBeforeDeletion.title).toBe('Card to Delete')

      // Act - Delete the card
      await storage.deleteCard(testWorkflowId, cardId)

      // Assert - Card should no longer exist
      await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
    })

    it('should handle deletion of non-existent card gracefully', async () => {
      // Arrange
      const nonExistentCardId = 'non-existent-card-for-deletion'

      // Act & Assert - Should not throw an error
      await expect(storage.deleteCard(testWorkflowId, nonExistentCardId)).resolves.not.toThrow()
    })

    it('should handle deletion from non-existent workflow', async () => {
      // Arrange
      const nonExistentWorkflowId = 'non-existent-workflow'
      const someCardId = 'some-card-id'

      // Act & Assert - Should not throw an error
      await expect(storage.deleteCard(nonExistentWorkflowId, someCardId)).resolves.not.toThrow()
    })

    it('should delete card with complex field data', async () => {
      // Arrange
      const complexCardPayload = {
        title: 'Complex Card to Delete',
        description: 'Complex card with nested data',
        owner: 'complex-delete-user',
        status: 'in-progress',
        type: 'feature',
        value: 300,
        fieldData: {
          tags: ['complex', 'nested'],
          metadata: {
            priority: 'high',
            dependencies: ['card-1', 'card-2']
          },
          estimatedHours: 24
        }
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', complexCardPayload)

      // Act - Delete the complex card
      await storage.deleteCard(testWorkflowId, cardId)

      // Assert - Card should be deleted
      await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
    })

    it('should allow deletion of recently updated card', async () => {
      // Arrange - Create and update a card
      const initialPayload = {
        title: 'Card for Update and Delete',
        description: 'Will be updated then deleted',
        owner: 'update-delete-user',
        status: 'todo',
        type: 'task',
        value: 150,
        fieldData: {}
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', initialPayload)

      // Update the card
      const updatePayload = {
        title: 'Updated Before Delete',
        status: 'in-progress'
      }
      await storage.updateCard(testWorkflowId, cardId, 'test-updater', updatePayload)

      // Act - Delete the recently updated card
      await storage.deleteCard(testWorkflowId, cardId)

      // Assert - Card should be deleted
      await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
    })

    it('should handle multiple deletions in sequence', async () => {
      // Arrange - Create multiple cards
      const cardIds: string[] = []
      for (let i = 0; i < 3; i++) {
        const cardPayload = {
          title: `Sequential Delete Card ${i + 1}`,
          description: `Card ${i + 1} for sequential deletion`,
          owner: `sequential-user-${i + 1}`,
          status: 'todo',
          type: 'task',
          value: (i + 1) * 50,
          fieldData: { index: i + 1 }
        }

        const cardId = await storage.createCard(testWorkflowId, 'test-creator', cardPayload)
        cardIds.push(cardId)
      }

      // Act - Delete cards sequentially
      for (const cardId of cardIds) {
        await storage.deleteCard(testWorkflowId, cardId)
      }

      // Assert - All cards should be deleted
      for (const cardId of cardIds) {
        await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
      }
    })

    it('should handle concurrent deletions', async () => {
      // Arrange - Create multiple cards
      const cardIds: string[] = []
      const createPromises = []

      for (let i = 0; i < 3; i++) {
        const cardPayload = {
          title: `Concurrent Delete Card ${i + 1}`,
          description: `Card ${i + 1} for concurrent deletion`,
          owner: `concurrent-user-${i + 1}`,
          status: 'todo',
          type: 'task',
          value: (i + 1) * 75,
          fieldData: { index: i + 1 }
        }

        createPromises.push(storage.createCard(testWorkflowId, 'test-creator', cardPayload))
      }

      const createdCardIds = await Promise.all(createPromises)
      cardIds.push(...createdCardIds)

      // Act - Delete cards concurrently
      const deletePromises = cardIds.map((cardId) => storage.deleteCard(testWorkflowId, cardId))
      await Promise.all(deletePromises)

      // Assert - All cards should be deleted
      const verificationPromises = cardIds.map((cardId) =>
        expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
      )
      await Promise.all(verificationPromises)
    })

    it('should not affect other cards when deleting one card', async () => {
      // Arrange - Create multiple cards
      const cardPayload1 = {
        title: 'Card to Keep 1',
        description: 'This card should remain',
        owner: 'keep-user-1',
        status: 'todo',
        type: 'task',
        value: 100,
        fieldData: { keep: true }
      }

      const cardPayload2 = {
        title: 'Card to Delete',
        description: 'This card will be deleted',
        owner: 'delete-user',
        status: 'in-progress',
        type: 'bug',
        value: 200,
        fieldData: { delete: true }
      }

      const cardPayload3 = {
        title: 'Card to Keep 2',
        description: 'This card should also remain',
        owner: 'keep-user-2',
        status: 'done',
        type: 'feature',
        value: 300,
        fieldData: { keep: true }
      }

      const keepCardId1 = await storage.createCard(testWorkflowId, 'test-creator', cardPayload1)
      const deleteCardId = await storage.createCard(testWorkflowId, 'test-creator', cardPayload2)
      const keepCardId2 = await storage.createCard(testWorkflowId, 'test-creator', cardPayload3)

      createdCardIds.push(keepCardId1, keepCardId2) // Only add cards we want to keep for cleanup

      // Act - Delete only the middle card
      await storage.deleteCard(testWorkflowId, deleteCardId)

      // Assert - Deleted card should be gone, others should remain
      await expect(storage.getCard(testWorkflowId, deleteCardId)).rejects.toThrow()

      const remainingCard1 = await storage.getCard(testWorkflowId, keepCardId1)
      const remainingCard2 = await storage.getCard(testWorkflowId, keepCardId2)

      expect(remainingCard1.title).toBe('Card to Keep 1')
      expect(remainingCard1.fieldData.keep).toBe(true)

      expect(remainingCard2.title).toBe('Card to Keep 2')
      expect(remainingCard2.fieldData.keep).toBe(true)
    })
  })

  describe('end-to-end workflow', () => {
    it('should create multiple cards and retrieve them', async () => {
      // Arrange - Create multiple cards with different data
      const cardPayloads = [
        {
          title: 'E2E Card 1',
          description: 'First end-to-end test card',
          owner: 'e2e-user-1',
          status: 'todo',
          type: 'task',
          value: 100,
          fieldData: { priority: 'high' }
        },
        {
          title: 'E2E Card 2',
          description: 'Second end-to-end test card',
          owner: 'e2e-user-2',
          status: 'in-progress',
          type: 'bug',
          value: 200,
          fieldData: { severity: 'critical' }
        },
        {
          title: 'E2E Card 3',
          description: 'Third end-to-end test card',
          owner: 'e2e-user-3',
          status: 'done',
          type: 'feature',
          value: 300,
          fieldData: { category: 'ui' }
        }
      ]

      // Act - Create all cards
      const cardIds: string[] = []
      for (const payload of cardPayloads) {
        const cardId = await storage.createCard(testWorkflowId, 'e2e-creator', payload)
        cardIds.push(cardId)
        createdCardIds.push(cardId) // Track for cleanup
      }

      // Assert - Retrieve and verify each card
      for (let i = 0; i < cardIds.length; i++) {
        const retrievedCard = await storage.getCard(testWorkflowId, cardIds[i])
        const originalPayload = cardPayloads[i]

        expect(retrievedCard.title).toBe(originalPayload.title)
        expect(retrievedCard.description).toBe(originalPayload.description)
        expect(retrievedCard.owner).toBe(originalPayload.owner)
        expect(retrievedCard.status).toBe(originalPayload.status)
        expect(retrievedCard.type).toBe(originalPayload.type)
        expect(retrievedCard.value).toBe(originalPayload.value)
        expect(retrievedCard.fieldData).toEqual(originalPayload.fieldData)
        expect(retrievedCard.workflowId).toBe(testWorkflowId)
        expect(retrievedCard.workflowCardId).toBe(cardIds[i])
        expect(retrievedCard.createdBy).toBe('e2e-creator')
        expect(retrievedCard.updatedBy).toBe('e2e-creator')
        expect(typeof retrievedCard.createdAt).toBe('number')
        expect(typeof retrievedCard.updatedAt).toBe('number')
      }
    })

    it('should demonstrate full CRUD operations lifecycle', async () => {
      // Create
      const initialPayload = {
        title: 'CRUD Lifecycle Card',
        description: 'Testing full CRUD lifecycle',
        owner: 'crud-user',
        status: 'todo',
        type: 'task',
        value: 150,
        fieldData: { stage: 'initial' }
      }

      const cardId = await storage.createCard(testWorkflowId, 'crud-creator', initialPayload)
      createdCardIds.push(cardId)

      // Read (after create)
      let card = await storage.getCard(testWorkflowId, cardId)
      expect(card.title).toBe('CRUD Lifecycle Card')
      expect(card.fieldData.stage).toBe('initial')

      // Update
      const updatePayload = {
        title: 'Updated CRUD Card',
        description: 'Updated during CRUD testing',
        value: 250,
        fieldData: { stage: 'updated', priority: 'high' }
      }

      await storage.updateCard(testWorkflowId, cardId, 'crud-updater', updatePayload)

      // Read (after update)
      card = await storage.getCard(testWorkflowId, cardId)
      expect(card.title).toBe('Updated CRUD Card')
      expect(card.description).toBe('Updated during CRUD testing')
      expect(card.value).toBe(250)
      expect(card.fieldData.stage).toBe('updated')
      expect(card.fieldData.priority).toBe('high')
      expect(card.updatedBy).toBe('crud-updater')
      // Original fields should be preserved
      expect(card.owner).toBe('crud-user')
      expect(card.status).toBe('todo')
      expect(card.type).toBe('task')

      // Delete
      await storage.deleteCard(testWorkflowId, cardId)

      // Read (after delete) - should fail
      await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()

      // Remove from cleanup list since it's already deleted
      const index = createdCardIds.indexOf(cardId)
      if (index > -1) {
        createdCardIds.splice(index, 1)
      }
    })
  })
})
