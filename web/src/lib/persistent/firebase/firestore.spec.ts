import type { IWorkflowCardStorage } from '../interface'

import { describe, it, expect, beforeEach } from 'vitest'
import { FirestoreWorkflowCardStorage } from './firestore'

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
      const payload = {
        title: 'Integration Test Card',
        description: 'Test Description for Integration',
        owner: 'test-user-123',
        status: 'todo',
        statusSince: new Date(),
        type: 'task',
        value: 150,
        fieldData: {
          priority: 'high',
          category: 'development'
        }
      }

      // Act
      const cardId = await storage.createCard(testWorkflowId, 'vitest', payload)

      // Assert
      expect(cardId).toBeDefined()
      expect(typeof cardId).toBe('string')
      expect(cardId.length).toBeGreaterThan(0)

      // Verify the card was created by reading it back
      const retrievedCard = await storage.getCard(testWorkflowId, cardId)
      expect(retrievedCard.title).toBe(payload.title)
      expect(retrievedCard.description).toBe(payload.description)
      expect(retrievedCard.owner).toBe(payload.owner)
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
        statusSince: new Date('2023-06-01'),
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

