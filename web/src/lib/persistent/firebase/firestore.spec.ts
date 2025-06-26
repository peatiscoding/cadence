import type { IWorkflowCardStorage, IWorkflowConfigurationStorage } from '../interface'
import { getAuth, signInWithCustomToken, signOut, type Auth } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { FirestoreWorkflowCardStorage } from './firestore'
import { USE_SERVER_TIMESTAMP } from '../constant'
import { app } from '../../firebase-app'

// Integration tests for Firebase Firestore storage
// These tests require Firebase emulator to be running
describe('FirestoreWorkflowCardStorage Integration Tests', () => {
  let storage: IWorkflowCardStorage & IWorkflowConfigurationStorage
  const testWorkflowId = `test-workflow-${Date.now()}`
  let auth: Auth

  beforeAll(async () => {
    // Login firebase
    const fns = getFunctions(undefined, 'asia-southeast2')
    auth = getAuth()
    const loginFn = httpsCallable<
      undefined,
      { success: true; result: string } | { success: false; reason: Error }
    >(fns, 'loginFn')
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

  afterAll(async () => {
    // Clean up created cards
    await Promise.all(
      createdCardIds.map((cardId) =>
        storage.deleteCard(testWorkflowId, cardId).catch(() => {
          // Ignore errors for cards that might already be deleted
        })
      )
    )
    createdCardIds.length = 0 // Clear the array
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
      // Test with minimal payload
      const minimalPayload = {
        title: 'Minimal Card',
        description: 'Minimal description',
        owner: 'test-user',
        status: 'new',
        type: 'bug',
        value: 0
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-creator', minimalPayload)
      createdCardIds.push(cardId) // Track for cleanup
      expect(cardId).toBeDefined()

      const retrievedCard = await storage.getCard(testWorkflowId, cardId)
      expect(retrievedCard.title).toBe(minimalPayload.title)
      expect(retrievedCard.value).toBe(minimalPayload.value)
    })

    it('should create cards with complex field data', async () => {
      const testAuthor = 'vitest'
      const complexPayload = {
        title: 'Complex Card',
        description: 'Card with complex data',
        owner: 'complex-user',
        status: 'in-progress',
        type: 'feature',
        value: 500,
        createdBy: testAuthor,
        updatedBy: testAuthor,
        statusSince: USE_SERVER_TIMESTAMP,
        fieldData: {
          tags: ['urgent', 'backend'],
          estimatedHours: 40,
          assignedTeam: 'backend-team',
          dependencies: ['card-1', 'card-2']
        }
      }

      const cardId = await storage.createCard(testWorkflowId, testAuthor, complexPayload)
      createdCardIds.push(cardId) // Track for cleanup
      const retrievedCard = await storage.getCard(testWorkflowId, cardId)

      expect(retrievedCard.fieldData).toEqual(complexPayload.fieldData) // Current implementation returns empty object
      expect(retrievedCard.type).toBe(complexPayload.type)
      expect(retrievedCard.value).toBe(complexPayload.value)
    })
  })

  describe('updateCard', () => {
    let testCardId: string
    const originalPayload = {
      title: 'Original Card Title',
      description: 'Original description',
      owner: 'original-owner',
      status: 'todo',
      type: 'task',
      value: 100,
      fieldData: {
        priority: 'medium',
        category: 'backend'
      }
    }

    beforeEach(async () => {
      // Create a test card for update tests
      testCardId = await storage.createCard(testWorkflowId, 'test-creator', originalPayload)
    })

    it('should update card fields successfully', async () => {
      // Arrange
      const updatePayload = {
        title: 'Updated Card Title',
        description: 'Updated description',
        value: 200,
        fieldData: {
          priority: 'high',
          category: 'frontend',
          tags: ['urgent', 'bug-fix']
        }
      }
      const updateAuthor = 'test-updater'

      // Act
      await storage.updateCard(testWorkflowId, testCardId, updateAuthor, updatePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.title).toBe(updatePayload.title)
      expect(updatedCard.description).toBe(updatePayload.description)
      expect(updatedCard.value).toBe(updatePayload.value)
      expect(updatedCard.fieldData).toEqual(updatePayload.fieldData)
      expect(updatedCard.updatedBy).toBe(updateAuthor)

      // Verify original fields that weren't updated remain unchanged
      expect(updatedCard.owner).toBe(originalPayload.owner)
      expect(updatedCard.status).toBe(originalPayload.status)
      expect(updatedCard.type).toBe(originalPayload.type)
    })

    it('should update only specified fields (partial update)', async () => {
      // Arrange
      const partialUpdatePayload = {
        title: 'Partially Updated Title'
      }
      const updateAuthor = 'partial-updater'

      // Act
      await storage.updateCard(testWorkflowId, testCardId, updateAuthor, partialUpdatePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.title).toBe(partialUpdatePayload.title)
      expect(updatedCard.updatedBy).toBe(updateAuthor)

      // Verify other fields remain unchanged
      expect(updatedCard.description).toBe(originalPayload.description)
      expect(updatedCard.owner).toBe(originalPayload.owner)
      expect(updatedCard.status).toBe(originalPayload.status)
      expect(updatedCard.value).toBe(originalPayload.value)
    })

    it('should update status and statusSince timestamp', async () => {
      // Arrange
      const statusUpdatePayload = {
        status: 'in-progress',
        statusSince: USE_SERVER_TIMESTAMP
      }
      const updateAuthor = 'status-updater'

      // Act
      await storage.updateCard(testWorkflowId, testCardId, updateAuthor, statusUpdatePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.status).toBe(statusUpdatePayload.status)
      expect(updatedCard.statusSince / 10000).toBeCloseTo(new Date().getTime() / 10000, 0)
      expect(updatedCard.updatedBy).toBe(updateAuthor)
    })

    it('should update complex field data', async () => {
      // Arrange
      const complexUpdatePayload = {
        fieldData: {
          priority: 'critical',
          assignees: ['dev1', 'dev2'],
          dueDate: '2024-12-31',
          tags: ['security', 'performance'],
          metadata: {
            estimatedHours: 40,
            complexity: 'high',
            dependencies: ['card-a', 'card-b']
          }
        }
      }
      const updateAuthor = 'complex-updater'

      // Act
      await storage.updateCard(testWorkflowId, testCardId, updateAuthor, complexUpdatePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.fieldData).toEqual(expect.objectContaining(complexUpdatePayload.fieldData))
      expect(updatedCard.updatedBy).toBe(updateAuthor)
    })

    it('should handle empty field data update', async () => {
      // Arrange
      const emptyFieldDataPayload = {
        fieldData: {}
      }
      const updateAuthor = 'empty-field-updater'

      // Act
      await storage.updateCard(testWorkflowId, testCardId, updateAuthor, emptyFieldDataPayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.fieldData).toEqual({})
      expect(updatedCard.updatedBy).toBe(updateAuthor)
    })

    it('should update multiple fields at once', async () => {
      // Arrange
      const multiFieldUpdatePayload = {
        title: 'Multi-field Updated Title',
        description: 'Multi-field updated description',
        owner: 'new-owner',
        status: 'done',
        type: 'bug',
        value: 500,
        fieldData: {
          resolution: 'fixed',
          testStatus: 'passed'
        }
      }
      const updateAuthor = 'multi-field-updater'

      // Act
      await storage.updateCard(testWorkflowId, testCardId, updateAuthor, multiFieldUpdatePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.title).toBe(multiFieldUpdatePayload.title)
      expect(updatedCard.description).toBe(multiFieldUpdatePayload.description)
      expect(updatedCard.owner).toBe(multiFieldUpdatePayload.owner)
      expect(updatedCard.status).toBe(multiFieldUpdatePayload.status)
      expect(updatedCard.type).toBe(multiFieldUpdatePayload.type)
      expect(updatedCard.value).toBe(multiFieldUpdatePayload.value)
      expect(updatedCard.fieldData).toEqual(
        expect.objectContaining(multiFieldUpdatePayload.fieldData)
      )
      expect(updatedCard.updatedBy).toBe(updateAuthor)
    })

    it('should handle update with zero and false values', async () => {
      // Arrange
      const zeroValuePayload = {
        value: 0,
        fieldData: {
          isComplete: false,
          priority: 0,
          emptyString: ''
        }
      }
      const updateAuthor = 'zero-value-updater'

      // Act
      await storage.updateCard(testWorkflowId, testCardId, updateAuthor, zeroValuePayload)

      // Assert
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.value).toBe(0)
      expect(updatedCard.fieldData.isComplete).toBe(false)
      expect(updatedCard.fieldData.priority).toBe(0)
      expect(updatedCard.fieldData.emptyString).toBe('')
    })

    it('should throw error when updating non-existent card', async () => {
      // Arrange
      const nonExistentCardId = 'non-existent-card-id'
      const updatePayload = { title: 'Should not work' }
      const updateAuthor = 'error-tester'

      // Act & Assert
      await expect(
        storage.updateCard(testWorkflowId, nonExistentCardId, updateAuthor, updatePayload)
      ).rejects.toThrow()
    })

    it('should preserve timestamps correctly', async () => {
      // Get the original card
      const originalCard = await storage.getCard(testWorkflowId, testCardId)
      const originalCreatedAt = originalCard.createdAt
      const originalUpdatedAt = originalCard.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Update the card
      const updatePayload = { title: 'Timestamp Test Update' }
      await storage.updateCard(testWorkflowId, testCardId, 'timestamp-tester', updatePayload)

      // Verify timestamps
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.createdAt).toBe(originalCreatedAt) // Should remain unchanged
      expect(updatedCard.updatedAt).toBeGreaterThan(originalUpdatedAt) // Should be updated
    })
  })

  describe('deleteCard', () => {
    let testCardId: string
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

    beforeEach(async () => {
      // Create a test card for deletion tests
      testCardId = await storage.createCard(testWorkflowId, 'test-creator', cardPayload)
    })

    it('should delete an existing card successfully', async () => {
      // Verify the card exists before deletion
      const cardBeforeDeletion = await storage.getCard(testWorkflowId, testCardId)
      expect(cardBeforeDeletion.title).toBe(cardPayload.title)

      // Act - Delete the card
      await storage.deleteCard(testWorkflowId, testCardId)

      // Assert - Card should no longer exist
      await expect(storage.getCard(testWorkflowId, testCardId)).rejects.toThrow(
        `Unable to retrieve card ${testWorkflowId}/${testCardId}`
      )
    })

    it('should handle deletion of non-existent card gracefully', async () => {
      // Arrange
      const nonExistentCardId = 'non-existent-card-id'

      // Act & Assert - Should not throw error for non-existent cards
      await expect(storage.deleteCard(testWorkflowId, nonExistentCardId)).resolves.not.toThrow()
    })

    it('should handle deletion from non-existent workflow', async () => {
      // Arrange
      const nonExistentWorkflowId = 'non-existent-workflow'

      // Act & Assert - Should not throw error
      await expect(storage.deleteCard(nonExistentWorkflowId, testCardId)).resolves.not.toThrow()
    })

    it('should delete card with complex field data', async () => {
      // Create a card with complex data
      const complexPayload = {
        title: 'Complex Card for Deletion',
        description: 'Card with nested data structures',
        owner: 'complex-owner',
        status: 'in-progress',
        type: 'feature',
        value: 1000,
        fieldData: {
          tags: ['complex', 'nested'],
          metadata: {
            estimatedHours: 80,
            dependencies: ['card-x', 'card-y'],
            assignees: ['dev1', 'dev2', 'dev3']
          },
          history: [
            { action: 'created', timestamp: Date.now() },
            { action: 'updated', timestamp: Date.now() + 1000 }
          ]
        }
      }

      const complexCardId = await storage.createCard(
        testWorkflowId,
        'complex-creator',
        complexPayload
      )

      // Verify complex card exists
      const complexCard = await storage.getCard(testWorkflowId, complexCardId)
      expect(complexCard.fieldData.metadata.estimatedHours).toBe(80)

      // Delete the complex card
      await storage.deleteCard(testWorkflowId, complexCardId)

      // Verify it's deleted
      await expect(storage.getCard(testWorkflowId, complexCardId)).rejects.toThrow()
    })

    it('should allow deletion of recently updated card', async () => {
      // Update the card first
      const updatePayload = {
        title: 'Updated Before Deletion',
        status: 'in-progress',
        value: 999
      }
      await storage.updateCard(testWorkflowId, testCardId, 'updater', updatePayload)

      // Verify the update worked
      const updatedCard = await storage.getCard(testWorkflowId, testCardId)
      expect(updatedCard.title).toBe(updatePayload.title)

      // Delete the updated card
      await storage.deleteCard(testWorkflowId, testCardId)

      // Verify it's deleted
      await expect(storage.getCard(testWorkflowId, testCardId)).rejects.toThrow()
    })

    it('should handle multiple deletions in sequence', async () => {
      // Create multiple cards
      const cardsToDelete = ['Card 1', 'Card 2', 'Card 3'].map((title) => ({
        title,
        description: `Description for ${title}`,
        owner: 'multi-delete-owner',
        status: 'todo',
        type: 'task',
        value: 100
      }))

      const cardIds = await Promise.all(
        cardsToDelete.map((card) => storage.createCard(testWorkflowId, 'multi-creator', card))
      )

      // Verify all cards exist
      const retrievedCards = await Promise.all(
        cardIds.map((id) => storage.getCard(testWorkflowId, id))
      )
      expect(retrievedCards).toHaveLength(3)

      // Delete all cards sequentially
      for (const cardId of cardIds) {
        await storage.deleteCard(testWorkflowId, cardId)
      }

      // Verify all cards are deleted
      for (const cardId of cardIds) {
        await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
      }
    })

    it('should handle concurrent deletions', async () => {
      // Create multiple cards for concurrent deletion
      const concurrentCards = ['Concurrent 1', 'Concurrent 2', 'Concurrent 3', 'Concurrent 4'].map(
        (title) => ({
          title,
          description: `Concurrent deletion test for ${title}`,
          owner: 'concurrent-owner',
          status: 'todo',
          type: 'task',
          value: 150
        })
      )

      const concurrentCardIds = await Promise.all(
        concurrentCards.map((card) =>
          storage.createCard(testWorkflowId, 'concurrent-creator', card)
        )
      )

      // Delete all cards concurrently
      await Promise.all(
        concurrentCardIds.map((cardId) => storage.deleteCard(testWorkflowId, cardId))
      )

      // Verify all cards are deleted
      const verificationPromises = concurrentCardIds.map((cardId) =>
        expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
      )

      await Promise.all(verificationPromises)
    })

    it('should not affect other cards when deleting one card', async () => {
      // Create additional cards
      const otherCard1Id = await storage.createCard(testWorkflowId, 'other-creator', {
        title: 'Other Card 1',
        description: 'This should remain',
        owner: 'other-owner',
        status: 'todo',
        type: 'task',
        value: 200
      })

      const otherCard2Id = await storage.createCard(testWorkflowId, 'other-creator', {
        title: 'Other Card 2',
        description: 'This should also remain',
        owner: 'other-owner',
        status: 'done',
        type: 'bug',
        value: 300
      })

      // Delete only the test card
      await storage.deleteCard(testWorkflowId, testCardId)

      // Verify test card is deleted
      await expect(storage.getCard(testWorkflowId, testCardId)).rejects.toThrow()

      // Verify other cards still exist
      const otherCard1 = await storage.getCard(testWorkflowId, otherCard1Id)
      const otherCard2 = await storage.getCard(testWorkflowId, otherCard2Id)

      expect(otherCard1.title).toBe('Other Card 1')
      expect(otherCard2.title).toBe('Other Card 2')
      expect(otherCard1.value).toBe(200)
      expect(otherCard2.value).toBe(300)

      // Clean up the other cards
      await storage.deleteCard(testWorkflowId, otherCard1Id)
      await storage.deleteCard(testWorkflowId, otherCard2Id)
    })
  })

  describe('end-to-end workflow', () => {
    it('should create multiple cards and retrieve them', async () => {
      // Create multiple cards
      const author = 'vitest'
      const cards = [
        {
          title: 'First Card',
          description: 'First card description',
          owner: 'user1',
          status: 'todo',
          type: 'task',
          value: 100
        },
        {
          title: 'Second Card',
          description: 'Second card description',
          owner: 'user2',
          status: 'in-progress',
          type: 'bug',
          value: 200
        },
        {
          title: 'Third Card',
          description: 'Third card description',
          owner: 'user3',
          status: 'done',
          type: 'feature',
          value: 300
        }
      ]

      // Create all cards
      const cardIds = await Promise.all(
        cards.map((card) => storage.createCard(testWorkflowId, author, card))
      )

      // Verify all cards were created
      expect(cardIds).toHaveLength(3)
      cardIds.forEach((id) => expect(id).toBeDefined())

      // Retrieve all cards and verify data
      const retrievedCards = await Promise.all(
        cardIds.map((id) => storage.getCard(testWorkflowId, id))
      )

      expect(retrievedCards).toHaveLength(3)

      // Verify each card has correct data
      cards.forEach((originalCard, index) => {
        const retrievedCard = retrievedCards[index]
        expect(retrievedCard.title).toBe(originalCard.title)
        expect(retrievedCard.owner).toBe(originalCard.owner)
        expect(retrievedCard.status).toBe(originalCard.status)
        expect(retrievedCard.type).toBe(originalCard.type)
        expect(retrievedCard.value).toBe(originalCard.value)
        expect(retrievedCard.workflowId).toBe(testWorkflowId)
      })

      // Clean up test cards
      await Promise.all(cardIds.map((cardId) => storage.deleteCard(testWorkflowId, cardId)))

      // Verify cleanup worked
      for (const cardId of cardIds) {
        await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow()
      }
    })

    it('should demonstrate full CRUD operations lifecycle', async () => {
      // CREATE
      const createPayload = {
        title: 'CRUD Test Card',
        description: 'Testing full lifecycle',
        owner: 'crud-tester',
        status: 'todo',
        type: 'task',
        value: 400,
        fieldData: {
          priority: 'medium',
          tags: ['lifecycle', 'test']
        }
      }

      const cardId = await storage.createCard(testWorkflowId, 'crud-author', createPayload)
      expect(cardId).toBeDefined()

      // READ
      const createdCard = await storage.getCard(testWorkflowId, cardId)
      expect(createdCard.title).toBe(createPayload.title)
      expect(createdCard.value).toBe(createPayload.value)

      // UPDATE
      const updatePayload = {
        title: 'Updated CRUD Card',
        status: 'in-progress',
        value: 600,
        fieldData: {
          priority: 'high',
          tags: ['lifecycle', 'test', 'updated'],
          comments: ['Updated during test']
        }
      }

      await storage.updateCard(testWorkflowId, cardId, 'crud-updater', updatePayload)

      const updatedCard = await storage.getCard(testWorkflowId, cardId)
      expect(updatedCard.title).toBe(updatePayload.title)
      expect(updatedCard.status).toBe(updatePayload.status)
      expect(updatedCard.value).toBe(updatePayload.value)
      expect(updatedCard.fieldData.priority).toBe('high')
      expect(updatedCard.fieldData.tags).toContain('updated')

      // DELETE
      await storage.deleteCard(testWorkflowId, cardId)

      // Verify deletion
      await expect(storage.getCard(testWorkflowId, cardId)).rejects.toThrow(
        `Unable to retrieve card ${testWorkflowId}/${cardId}`
      )
    })
  })
})
