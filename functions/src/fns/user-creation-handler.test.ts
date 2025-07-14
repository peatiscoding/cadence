/**
 * Tests for user creation handler
 */

import { createUserCreationHandler } from './user-creation-handler'
import type { UserRecord } from 'firebase-functions/v1/auth'

// Mock Firebase Admin
const mockSet = jest.fn()
const mockDoc = jest.fn(() => ({ set: mockSet }))
const mockCollection = jest.fn(() => ({ doc: mockDoc }))

jest.mock('firebase-admin/app', () => ({
  getApp: jest.fn(() => ({}))
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection
  })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1642349400, nanoseconds: 0 }))
  }
}))

describe('User Creation Handler', () => {
  let handler: (user: UserRecord) => Promise<void>

  beforeEach(() => {
    jest.clearAllMocks()
    handler = createUserCreationHandler()
  })

  test('creates user document with email-derived displayName', async () => {
    const mockUser: UserRecord = {
      uid: 'test-uid-123',
      email: 'john.doe@company.com',
      displayName: undefined
    } as UserRecord

    await handler(mockUser)

    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockDoc).toHaveBeenCalledWith('test-uid-123')
    expect(mockSet).toHaveBeenCalledWith({
      uid: 'test-uid-123',
      email: 'john.doe@company.com',
      displayName: 'john.doe',
      role: 'user',
      createdAt: { seconds: 1642349400, nanoseconds: 0 },
      lastUpdated: { seconds: 1642349400, nanoseconds: 0 }
    })
  })

  test('uses auth displayName when available', async () => {
    const mockUser: UserRecord = {
      uid: 'test-uid-456',
      email: 'jane.smith@company.com',
      displayName: 'Jane Smith'
    } as UserRecord

    await handler(mockUser)

    expect(mockSet).toHaveBeenCalledWith({
      uid: 'test-uid-456',
      email: 'jane.smith@company.com',
      displayName: 'Jane Smith',
      role: 'user',
      createdAt: { seconds: 1642349400, nanoseconds: 0 },
      lastUpdated: { seconds: 1642349400, nanoseconds: 0 }
    })
  })

  test('skips user creation when email is missing', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    const mockUser: UserRecord = {
      uid: 'test-uid-789',
      email: undefined,
      displayName: undefined
    } as UserRecord

    await handler(mockUser)

    expect(mockSet).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      'User test-uid-789 created without email, skipping user document creation'
    )
    
    consoleSpy.mockRestore()
  })

  test('handles errors gracefully without throwing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockSet.mockRejectedValue(new Error('Firestore error'))

    const mockUser: UserRecord = {
      uid: 'test-uid-error',
      email: 'error@test.com',
      displayName: undefined
    } as UserRecord

    // Should not throw
    await expect(handler(mockUser)).resolves.toBeUndefined()
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error creating user document:',
      expect.any(Error)
    )
    
    consoleSpy.mockRestore()
  })
})