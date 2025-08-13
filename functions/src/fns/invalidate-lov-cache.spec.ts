/**
 * Tests for LOV cache invalidation function
 */

import { invalidateLovCache } from './invalidate-lov-cache'
import { ListOfValueFactory } from '../lovs/factory'
import type { App } from 'firebase-admin/app'
import type { InvalidateLovCacheRequest } from '@cadence/shared/validation'

// Mock Firebase Admin
const mockDoc = jest.fn()
const mockCollection = jest.fn()
const mockBatch = jest.fn()
const mockGet = jest.fn()
const mockDelete = jest.fn()
const mockCommit = jest.fn()

const mockFirestore = {
  collection: mockCollection,
  doc: mockDoc,
  batch: mockBatch
}

const mockApp = {} as App

// Mock Firestore collection and document references
const createMockDocRef = (exists: boolean = false, data: any = null) => ({
  get: mockGet.mockResolvedValue({
    exists,
    data: () => data,
    id: 'test-cache-key'
  }),
  delete: mockDelete.mockResolvedValue(undefined)
})

const createMockCollectionRef = (docs: any[] = []) => ({
  get: mockGet.mockResolvedValue({
    docs: docs.map((doc) => ({
      ref: { delete: jest.fn() },
      id: doc.id,
      data: () => doc.data
    }))
  })
})

// Mock ListOfValueFactory providers
const createMockProvider = (cacheKey: string) => ({
  list: jest.fn(),
  cacheKey
})

const mockProvider1 = createMockProvider('test-cache-key-1')
const mockProvider2 = createMockProvider('mocked-hash')
const mockProvider3 = createMockProvider('another-cache-key')

// Mock supported workflows module
jest.mock('@cadence/shared/defined', () => ({
  supportedWorkflows: [
    {
      workflowId: 'test-workflow',
      fields: [
        {
          slug: 'field1',
          schema: {
            kind: 'text',
            lov: {
              provider: { kind: 'api', url: 'test-url' },
              cacheKey: 'test-cache-key-1'
            }
          }
        },
        {
          slug: 'field2',
          schema: {
            kind: 'text',
            lov: {
              provider: { kind: 'googlesheet', sheetId: 'test-sheet' }
              // no cacheKey, will use hash
            }
          }
        },
        {
          slug: 'field3',
          schema: { kind: 'text' } // no LOV
        }
      ]
    },
    {
      workflowId: 'another-workflow',
      fields: [
        {
          slug: 'field4',
          schema: {
            kind: 'text',
            lov: {
              provider: { kind: 'api', url: 'another-url' },
              cacheKey: 'another-cache-key'
            }
          }
        }
      ]
    }
  ]
}))

// Mock Firebase Admin modules
jest.mock('firebase-admin/app', () => ({}))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore)
}))

// Mock LOV Factory
jest.mock('../lovs/factory', () => ({
  ListOfValueFactory: {
    createProvider: jest.fn(),
    getCacheKey: jest.fn()
  }
}))

describe('invalidateLovCache', () => {
  let invalidateFn: ReturnType<typeof invalidateLovCache>

  beforeEach(() => {
    jest.clearAllMocks()
    mockCollection.mockReturnValue(createMockCollectionRef())
    mockDoc.mockReturnValue(createMockDocRef())
    mockBatch.mockReturnValue({
      delete: jest.fn(),
      commit: mockCommit.mockResolvedValue(undefined)
    })
    // Reset all mock providers
    mockProvider1.list.mockResolvedValue([])
    mockProvider2.list.mockResolvedValue([])
    mockProvider3.list.mockResolvedValue([])

    // Setup getCacheKey mock to return different keys for different configs
    ;(ListOfValueFactory.getCacheKey as jest.Mock).mockImplementation((provider, cacheKey) => {
      if (cacheKey) return cacheKey
      if (provider.kind === 'api' && provider.url === 'test-url') return 'test-cache-key-1'
      if (provider.kind === 'googlesheet') return 'mocked-hash'
      if (provider.kind === 'api' && provider.url === 'another-url') return 'another-cache-key'
      return 'fallback-hash'
    })

    // Setup createProvider mock to return the appropriate provider based on the LOV definition
    ;(ListOfValueFactory.createProvider as jest.Mock).mockImplementation((lovDef) => {
      if (lovDef.provider.kind === 'api' && lovDef.provider.url === 'test-url') return mockProvider1
      if (lovDef.provider.kind === 'googlesheet') return mockProvider2
      if (lovDef.provider.kind === 'api' && lovDef.provider.url === 'another-url') return mockProvider3
      return mockProvider1 // fallback
    })

    invalidateFn = invalidateLovCache(mockApp)
  })

  describe('workflow validation', () => {
    it('should return error for unknown workflow', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'unknown-workflow'
      }

      const result = await invalidateFn(request)

      expect(result).toEqual({
        success: false,
        message: 'Unknown workflow: unknown-workflow'
      })
    })

    it('should accept valid workflow ID', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      const result = await invalidateFn(request)

      expect(result.success).toBe(true)
      expect(mockProvider1.list).toHaveBeenCalled()
    })
  })

  describe('specific cache key invalidation', () => {
    it('should invalidate specific cache key when it exists', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow',
        cacheKey: 'test-cache-key-1' // This should match the first field's cache key
      }

      const result = await invalidateFn(request)

      expect(result).toEqual({
        success: true,
        message: 'Successfully refreshed 1 LOV cache entries for workflow test-workflow',
        invalidatedKeys: ['test-cache-key-1']
      })
      expect(mockProvider1.list).toHaveBeenCalledWith(true) // Force reload
    })

    it('should return error when specific cache key does not exist', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow',
        cacheKey: 'non-existent-key'
      }

      const result = await invalidateFn(request)

      expect(result).toEqual({
        success: false,
        message: "Failed to invalidate LOV cache: Unknown requested cacheKey: non-existent-key"
      })
      expect(mockProvider1.list).not.toHaveBeenCalled()
      expect(mockProvider2.list).not.toHaveBeenCalled()
    })
  })

  describe('workflow-wide cache invalidation', () => {
    beforeEach(() => {
      // Reset all mock providers
      mockProvider1.list.mockResolvedValue(['value1', 'value2'])
      mockProvider2.list.mockResolvedValue(['value1', 'value2'])
      mockProvider3.list.mockResolvedValue(['value1', 'value2'])

      // Reset getCacheKey mock
      ;(ListOfValueFactory.getCacheKey as jest.Mock).mockImplementation((provider, cacheKey) => {
        if (cacheKey) return cacheKey
        if (provider.kind === 'api' && provider.url === 'test-url') return 'test-cache-key-1'
        if (provider.kind === 'googlesheet') return 'mocked-hash'
        if (provider.kind === 'api' && provider.url === 'another-url') return 'another-cache-key'
        return 'fallback-hash'
      })

      // Reset createProvider mock
      ;(ListOfValueFactory.createProvider as jest.Mock).mockImplementation((lovDef) => {
        if (lovDef.provider.kind === 'api' && lovDef.provider.url === 'test-url') return mockProvider1
        if (lovDef.provider.kind === 'googlesheet') return mockProvider2
        if (lovDef.provider.kind === 'api' && lovDef.provider.url === 'another-url') return mockProvider3
        return mockProvider1 // fallback
      })
    })

    it('should refresh all LOV caches for a workflow', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      const result = await invalidateFn(request)

      expect(result.success).toBe(true)
      expect(result.message).toBe(
        'Successfully refreshed 2 LOV cache entries for workflow test-workflow'
      )
      expect(result.invalidatedKeys).toEqual(['test-cache-key-1', 'mocked-hash'])

      // Should call createProvider for each LOV field
      expect(ListOfValueFactory.createProvider).toHaveBeenCalledTimes(2)
      expect(mockProvider1.list).toHaveBeenCalledTimes(1)
      expect(mockProvider2.list).toHaveBeenCalledTimes(1)
      expect(mockProvider1.list).toHaveBeenCalledWith(true) // ignoreCache = true
      expect(mockProvider2.list).toHaveBeenCalledWith(true) // ignoreCache = true
    })

    it('should only process fields with LOV configuration', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      await invalidateFn(request)

      // Should only process 2 fields (field1 and field2), not field3 which has no LOV
      expect(ListOfValueFactory.createProvider).toHaveBeenCalledTimes(2)
    })

    it('should handle provider creation errors gracefully', async () => {
      // Mock one provider to throw an error during creation
      ;(ListOfValueFactory.createProvider as jest.Mock)
        .mockReturnValueOnce(mockProvider1)
        .mockImplementationOnce(() => {
          throw new Error('Provider creation failed')
        })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      const result = await invalidateFn(request)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Provider creation failed')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error invalidating LOV cache:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle provider.list() errors gracefully', async () => {
      // Mock provider.list to throw an error
      mockProvider1.list.mockRejectedValueOnce(new Error('List failed'))
      mockProvider2.list.mockResolvedValueOnce(['value'])

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      const result = await invalidateFn(request)

      expect(result.success).toBe(false)
      expect(result.message).toContain('List failed')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error invalidating LOV cache:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should use hash when no cacheKey is provided', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      const result = await invalidateFn(request)

      expect(result.invalidatedKeys).toContain('mocked-hash')
    })

    it('should use provided cacheKey when available', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      const result = await invalidateFn(request)

      expect(result.invalidatedKeys).toContain('test-cache-key-1')
    })
  })

  describe('error handling', () => {
    it('should handle general errors and return failure response', async () => {
      // Mock getFirestore to throw an error
      const { getFirestore } = require('firebase-admin/firestore')
      getFirestore.mockImplementationOnce(() => {
        throw new Error('Firestore connection failed')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      const result = await invalidateFn(request)

      expect(result).toEqual({
        success: false,
        message: 'Failed to invalidate LOV cache: Firestore connection failed'
      })
      expect(consoleSpy).toHaveBeenCalledWith('Error invalidating LOV cache:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('logging', () => {
    it('should log specific cache key invalidation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow',
        cacheKey: 'test-cache-key-1'
      }

      await invalidateFn(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        'LOV cache invalidated for workflow test-workflow, 1 entries'
      )

      consoleSpy.mockRestore()
    })

    it('should log workflow-wide cache invalidation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const request: InvalidateLovCacheRequest = {
        workflowId: 'test-workflow'
      }

      await invalidateFn(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        'LOV cache invalidated for workflow test-workflow, 2 entries'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('integration with different workflow configurations', () => {
    beforeEach(() => {
      // Reset mocks before each test in this describe block
      jest.clearAllMocks()
      mockProvider1.list.mockResolvedValue(['value1', 'value2'])
      mockProvider2.list.mockResolvedValue(['value1', 'value2'])
      mockProvider3.list.mockResolvedValue(['value1', 'value2'])

      // Reset getCacheKey mock
      ;(ListOfValueFactory.getCacheKey as jest.Mock).mockImplementation((provider, cacheKey) => {
        if (cacheKey) return cacheKey
        if (provider.kind === 'api' && provider.url === 'test-url') return 'test-cache-key-1'
        if (provider.kind === 'googlesheet') return 'mocked-hash'
        if (provider.kind === 'api' && provider.url === 'another-url') return 'another-cache-key'
        return 'fallback-hash'
      })

      // Reset createProvider mock
      ;(ListOfValueFactory.createProvider as jest.Mock).mockImplementation((lovDef) => {
        if (lovDef.provider.kind === 'api' && lovDef.provider.url === 'test-url') return mockProvider1
        if (lovDef.provider.kind === 'googlesheet') return mockProvider2
        if (lovDef.provider.kind === 'api' && lovDef.provider.url === 'another-url') return mockProvider3
        return mockProvider1 // fallback
      })
    })

    it('should handle different workflow correctly', async () => {
      const request: InvalidateLovCacheRequest = {
        workflowId: 'another-workflow'
      }

      const result = await invalidateFn(request)

      expect(result.success).toBe(true)
      expect(result.invalidatedKeys).toEqual(['another-cache-key'])
      expect(ListOfValueFactory.createProvider).toHaveBeenCalledTimes(1)
    })
  })
})
