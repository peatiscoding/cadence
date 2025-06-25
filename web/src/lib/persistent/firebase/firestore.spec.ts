import type { IWorkflowCardStorage } from '../interface'

import { describe, it, expect, beforeEach } from 'vitest'
import { FirestoreWorkflowCardStorage } from './firestore'
import { USE_SERVER_TIMESTAMP } from '../constant'

// Integration tests for Firebase Firestore storage
// These tests require Firebase emulator to be running
describe('FirestoreWorkflowCardStorage Integration Tests', () => {
  let storage: IWorkflowCardStorage
  const testWorkflowId = `test-workflow-${Date.now()}`

  beforeEach(() => {
    // Use shared instance for integration tests
    storage = FirestoreWorkflowCardStorage.shared()
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
    })
  })
})
