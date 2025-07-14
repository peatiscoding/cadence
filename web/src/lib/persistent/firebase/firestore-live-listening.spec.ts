import type { Auth } from 'firebase/auth'
import type { IOnCallResponse } from '@cadence/shared/types'
import type { IWorkflowCardStorage, IWorkflowConfigurationStorage } from '../interface'
import { FIREBASE_REGION } from '@cadence/shared/models/firestore'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { FirestoreWorkflowCardStorage } from './firestore'

// Integration tests for Firebase Firestore live listening functionality
// These tests require Firebase emulator to be running
describe('FirestoreWorkflowCardStorage - Live Listening', () => {
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
    storage = FirestoreWorkflowCardStorage.shared({
      WORKFLOWS: 'test-workflows',
      CARDS: 'cards',
      ACTIVITIES: 'test-activities'
    })
  })

  const testCards: string[] = []

  afterEach(async () => {
    // Clean up test cards created during each test
    for (const cardId of testCards) {
      try {
        await storage.deleteCard(testWorkflowId, cardId)
      } catch (error) {
        // Ignore errors for cards that might already be deleted
      }
    }
    testCards.length = 0 // Clear the array
  })

  afterAll(async () => {
    // logout
    await signOut(auth)
  })

  describe('listenForCards', () => {
    it('should create a live listener builder with onDataChanges method', () => {
      // Act
      const listenerBuilder = storage.listenForCards(testWorkflowId)

      // Assert
      expect(listenerBuilder).toBeDefined()
      expect(typeof listenerBuilder.onDataChanges).toBe('function')
      expect(typeof listenerBuilder.listen).toBe('function')
    })

    it('should return a functioning listener builder pattern', () => {
      // Act
      const listenerBuilder = storage.listenForCards(testWorkflowId)
      const mockObserver = vi.fn()
      const builderWithObserver = listenerBuilder.onDataChanges(mockObserver)

      // Assert
      expect(builderWithObserver).toBe(listenerBuilder) // Should return same instance for chaining
      expect(typeof builderWithObserver.listen).toBe('function')
    })

    it('should listen for card additions in real-time', async () => {
      // Arrange
      const mockObserver = vi.fn()
      const listenerBuilder = storage.listenForCards(testWorkflowId)

      // Set up the listener
      const unsubscribe = listenerBuilder.onDataChanges(mockObserver).listen()

      // Wait a bit for the listener to be established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Create a new card
      const newCardPayload = {
        title: 'Live Test Card',
        description: 'Card for testing live updates',
        owner: 'live-test-user',
        status: 'new',
        type: 'test',
        value: 100
      }

      const cardId = await storage.createCard(testWorkflowId, 'live-test-author', newCardPayload)
      testCards.push(cardId)

      // Wait for the listener to receive the update
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Assert
      expect(mockObserver).toHaveBeenCalled()
      const calls = mockObserver.mock.calls
      const hasAddedChange = calls.some((call) =>
        call[0].some(
          (change: any) => change.type === 'added' && change.data.title === newCardPayload.title
        )
      )
      expect(hasAddedChange).toBe(true)

      // Cleanup
      unsubscribe()
    })

    it('should listen for card modifications in real-time', async () => {
      // Arrange - Create a card first
      const initialPayload = {
        title: 'Modifiable Card',
        description: 'Initial description',
        owner: 'initial-owner',
        status: 'new',
        type: 'test',
        value: 50
      }

      const cardId = await storage.createCard(testWorkflowId, 'test-author', initialPayload)
      testCards.push(cardId)

      // Set up listener after card creation
      const mockObserver = vi.fn()
      const unsubscribe = storage
        .listenForCards(testWorkflowId)
        .onDataChanges(mockObserver)
        .listen()

      // Wait for listener to be established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Modify the card
      const updatePayload = {
        title: 'Modified Card Title',
        description: 'Updated description'
      }

      await storage.updateCard(testWorkflowId, cardId, 'update-author', updatePayload)

      // Wait for the listener to receive the update
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Assert
      expect(mockObserver).toHaveBeenCalled()
      const calls = mockObserver.mock.calls
      const hasModifiedChange = calls.some((call) =>
        call[0].some(
          (change: any) => change.type === 'modified' && change.data.title === updatePayload.title
        )
      )
      expect(hasModifiedChange).toBe(true)

      // Cleanup
      unsubscribe()
    })

    it('should listen for card deletions in real-time', async () => {
      // Arrange - Create a card first
      const cardPayload = {
        title: 'Card to Delete',
        description: 'This card will be deleted',
        owner: 'delete-test-user',
        status: 'new',
        type: 'test',
        value: 25
      }

      const cardId = await storage.createCard(testWorkflowId, 'delete-test-author', cardPayload)

      // Set up listener
      const mockObserver = vi.fn()
      const unsubscribe = storage
        .listenForCards(testWorkflowId)
        .onDataChanges(mockObserver)
        .listen()

      // Wait for listener to be established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Delete the card
      await storage.deleteCard(testWorkflowId, cardId)

      // Wait for the listener to receive the update
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Assert
      expect(mockObserver).toHaveBeenCalled()
      const calls = mockObserver.mock.calls
      const hasRemovedChange = calls.some((call) =>
        call[0].some(
          (change: any) => change.type === 'removed' && change.data.title === cardPayload.title
        )
      )
      expect(hasRemovedChange).toBe(true)

      // Cleanup
      unsubscribe()
    })

    it('should handle multiple simultaneous listeners', async () => {
      // Arrange
      const mockObserver1 = vi.fn()
      const mockObserver2 = vi.fn()

      const unsubscribe1 = storage
        .listenForCards(testWorkflowId)
        .onDataChanges(mockObserver1)
        .listen()

      const unsubscribe2 = storage
        .listenForCards(testWorkflowId)
        .onDataChanges(mockObserver2)
        .listen()

      // Wait for listeners to be established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Create a card
      const cardPayload = {
        title: 'Multi-listener Test Card',
        description: 'Testing multiple listeners',
        owner: 'multi-test-user',
        status: 'new',
        type: 'test',
        value: 200
      }

      const cardId = await storage.createCard(testWorkflowId, 'multi-test-author', cardPayload)
      testCards.push(cardId)

      // Wait for listeners to receive updates
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Assert - Both observers should have been called
      expect(mockObserver1).toHaveBeenCalled()
      expect(mockObserver2).toHaveBeenCalled()

      // Cleanup
      unsubscribe1()
      unsubscribe2()
    })

    it('should properly unsubscribe and stop receiving updates', async () => {
      // Arrange
      const mockObserver = vi.fn()
      const unsubscribe = storage
        .listenForCards(testWorkflowId)
        .onDataChanges(mockObserver)
        .listen()

      // Wait for listener to be established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create first card - should be received
      const firstCardPayload = {
        title: 'First Card',
        description: 'Should be received',
        owner: 'unsub-test-user',
        status: 'new',
        type: 'test',
        value: 100
      }

      const firstCardId = await storage.createCard(
        testWorkflowId,
        'unsub-test-author',
        firstCardPayload
      )
      testCards.push(firstCardId)

      // Wait for first update
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Act - Unsubscribe
      unsubscribe()

      // Wait a bit to ensure unsubscribe takes effect
      await new Promise((resolve) => setTimeout(resolve, 100))

      const callCountAfterUnsubscribe = mockObserver.mock.calls.length

      // Create second card - should NOT be received
      const secondCardPayload = {
        title: 'Second Card',
        description: 'Should NOT be received',
        owner: 'unsub-test-user-2',
        status: 'new',
        type: 'test',
        value: 150
      }

      const secondCardId = await storage.createCard(
        testWorkflowId,
        'unsub-test-author-2',
        secondCardPayload
      )
      testCards.push(secondCardId)

      // Wait to see if any new calls are made
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Assert - Should not have received the second update
      expect(mockObserver.mock.calls.length).toBe(callCountAfterUnsubscribe)
    })

    it('should handle observer errors gracefully', async () => {
      // Arrange - Create an observer that throws an error
      const errorObserver = vi.fn().mockImplementation(() => {
        throw new Error('Observer error for testing')
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const unsubscribe = storage
        .listenForCards(testWorkflowId)
        .onDataChanges(errorObserver)
        .listen()

      // Wait for listener to be established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Create a card that will trigger the error
      const cardPayload = {
        title: 'Error Test Card',
        description: 'This will cause observer error',
        owner: 'error-test-user',
        status: 'new',
        type: 'test',
        value: 75
      }

      const cardId = await storage.createCard(testWorkflowId, 'error-test-author', cardPayload)
      testCards.push(cardId)

      // Wait for the listener to process
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Assert - Observer should have been called despite the error
      expect(errorObserver).toHaveBeenCalled()

      // Cleanup
      unsubscribe()
      consoleErrorSpy.mockRestore()
    })

    it('should provide correct change data structure', async () => {
      // Arrange
      let allReceivedChanges: any[] = []
      const mockObserver = vi.fn().mockImplementation((changes) => {
        allReceivedChanges.push(...changes)
      })

      const unsubscribe = storage
        .listenForCards(testWorkflowId)
        .onDataChanges(mockObserver)
        .listen()

      // Wait for listener to be established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Act - Create a card
      const cardPayload = {
        title: 'Structure Test Card',
        description: 'Testing change data structure',
        owner: 'structure-test-user',
        status: 'new',
        type: 'test',
        value: 300
      }

      const cardId = await storage.createCard(testWorkflowId, 'structure-test-author', cardPayload)
      testCards.push(cardId)

      // Wait for the listener to receive the update
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Assert - Check the structure of received changes
      expect(allReceivedChanges).toBeDefined()
      expect(Array.isArray(allReceivedChanges)).toBe(true)
      expect(allReceivedChanges.length).toBeGreaterThan(0)

      const change = allReceivedChanges.find(
        (c) => c.type === 'added' && c.data.title === cardPayload.title
      )
      expect(change).toBeDefined()
      expect(change.type).toBe('added')
      expect(change.data).toBeDefined()
      expect(change.data.title).toBe(cardPayload.title)
      expect(change.data.workflowCardId).toBe(cardId)
      expect(change.data.workflowId).toBe(testWorkflowId)
      expect(change.data.owner).toBe(cardPayload.owner)
      expect(change.data.status).toBe(cardPayload.status)
      expect(change.data.type).toBe(cardPayload.type)
      expect(change.data.value).toBe(cardPayload.value)
      expect(typeof change.data.createdAt).toBe('number')
      expect(typeof change.data.updatedAt).toBe('number')
      expect(change.data.createdBy).toBe('structure-test-author')
      expect(change.data.updatedBy).toBe('structure-test-author')

      // Cleanup
      unsubscribe()
    })
  })
})
