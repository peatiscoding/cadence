/**
 * Tests for LOV validation functionality
 */

import { LovValidator, _helpers } from './validator'
import { ListOfValueFactory } from './factory'
import type { App } from 'firebase-admin/app'
import type { WorkflowConfiguration } from '@cadence/shared/types'

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn()
}

const mockApp = {} as App

// Mock ListOfValueFactory
const mockProvider1 = {
  list: jest.fn(),
  cacheKey: 'test-cache-key-1'
}

const mockProvider2 = {
  list: jest.fn(),
  cacheKey: 'test-cache-key-2'
}

// Mock Firebase Admin modules
jest.mock('firebase-admin/app', () => ({}))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore)
}))

// Mock LOV Factory
jest.mock('./factory', () => ({
  ListOfValueFactory: {
    createProvider: jest.fn()
  }
}))

// Mock workflow configuration
const mockWorkflow: WorkflowConfiguration & { workflowId: string } = {
  workflowId: 'test-workflow',
  name: 'Test Workflow',
  access: ['*'],
  nouns: { singular: 'Item', plural: 'Items' },
  types: [{ slug: 'default', title: 'Default', ui: { color: '#000' } }],
  fields: [
    {
      slug: 'country',
      title: 'Country',
      description: 'Select a country',
      schema: {
        kind: 'text',
        lov: {
          provider: {
            kind: 'api',
            url: 'test-url',
            headers: {},
            listOfValueSelector: 'data',
            keySelector: 'code',
            labelSelector: 'name'
          },
          cacheKey: 'countries'
        }
      }
    },
    {
      slug: 'city',
      title: 'City',
      description: 'Select a city',
      schema: {
        kind: 'text',
        lov: {
          provider: {
            kind: 'googlesheet',
            sheetId: 'test-sheet',
            dir: 'TB',
            keyRange: 'A1:A',
            labelRange: 'B1:B'
          }
        }
      }
    },
    {
      slug: 'description',
      title: 'Description',
      description: 'Free text field',
      schema: {
        kind: 'text'
      }
    }
  ],
  statuses: []
}

describe('LovValidator', () => {
  let validator: LovValidator

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock valid LOV data
    mockProvider1.list.mockResolvedValue([
      { key: 'us', label: 'United States', meta: {} },
      { key: 'ca', label: 'Canada', meta: {} },
      { key: 'uk', label: 'United Kingdom', meta: {} }
    ])

    mockProvider2.list.mockResolvedValue([
      { key: 'nyc', label: 'New York City', meta: {} },
      { key: 'tor', label: 'Toronto', meta: {} },
      { key: 'lon', label: 'London', meta: {} }
    ])

    // Setup createProvider mock
    ;(ListOfValueFactory.createProvider as jest.Mock).mockImplementation((lovDef) => {
      if (lovDef.provider.kind === 'api') return mockProvider1
      if (lovDef.provider.kind === 'googlesheet') return mockProvider2
      return mockProvider1
    })

    validator = new LovValidator(mockApp, mockWorkflow)
  })

  describe('validateFieldData', () => {
    it('should pass validation when all LOV values are valid', async () => {
      const payload = {
        country: 'us',
        city: 'nyc',
        description: 'Some description'
      }

      await expect(validator.validateFieldData(payload)).resolves.not.toThrow()

      expect(ListOfValueFactory.createProvider).toHaveBeenCalledTimes(2)
      expect(mockProvider1.list).toHaveBeenCalledTimes(1)
      expect(mockProvider2.list).toHaveBeenCalledTimes(1)
    })

    it('should pass validation when LOV fields are empty', async () => {
      const payload = {
        description: 'Some description'
      }

      await expect(validator.validateFieldData(payload)).resolves.not.toThrow()

      expect(ListOfValueFactory.createProvider).not.toHaveBeenCalled()
    })

    it('should fail validation when LOV value is invalid', async () => {
      const payload = {
        country: 'invalid-country',
        city: 'nyc',
        description: 'Some description'
      }

      await expect(validator.validateFieldData(payload)).rejects.toThrow()

      try {
        await validator.validateFieldData(payload)
      } catch (error: any) {
        expect(error.errors).toHaveLength(1)
        expect(error.errors[0]).toEqual({
          field: 'country',
          value: 'invalid-country',
          reason: "Value 'invalid-country' is not in the list of valid values for field 'Country'"
        })
      }
    })

    it('should validate against both key and label in LOV entries', async () => {
      const payload1 = { country: 'us' } // valid key
      const payload2 = { country: 'United States' } // valid label

      await expect(validator.validateFieldData(payload1)).resolves.not.toThrow()
      await expect(validator.validateFieldData(payload2)).resolves.not.toThrow()
    })

    it('should handle multiple validation errors', async () => {
      const payload = {
        country: 'invalid-country',
        city: 'invalid-city'
      }

      await expect(validator.validateFieldData(payload)).rejects.toThrow()

      try {
        await validator.validateFieldData(payload)
      } catch (error: any) {
        expect(error.errors).toHaveLength(2)
        expect(error.errors.some((e: any) => e.field === 'country')).toBe(true)
        expect(error.errors.some((e: any) => e.field === 'city')).toBe(true)
      }
    })

    it('should handle LOV provider errors gracefully', async () => {
      mockProvider1.list.mockRejectedValueOnce(new Error('Provider failed'))

      const payload = {
        country: 'us'
      }

      await expect(validator.validateFieldData(payload)).rejects.toThrow()

      try {
        await validator.validateFieldData(payload)
      } catch (error: any) {
        expect(error.errors).toHaveLength(1)
        expect(error.errors[0].reason).toContain('Failed to validate against list of values')
      }
    })
  })

  describe('validateFieldData with existing data', () => {
    it('should skip validation when values have not changed', async () => {
      const newPayload = {
        country: 'us',
        city: 'nyc',
        description: 'Updated description'
      }

      const existingPayload = {
        country: 'us',
        city: 'nyc',
        description: 'Original description'
      }

      await expect(validator.validateFieldData(newPayload, existingPayload)).resolves.not.toThrow()

      // Should not call LOV providers since LOV values haven't changed
      expect(ListOfValueFactory.createProvider).not.toHaveBeenCalled()
    })

    it('should validate when LOV values have changed', async () => {
      const newPayload = {
        country: 'ca', // changed
        city: 'nyc', // unchanged
        description: 'Updated description'
      }

      const existingPayload = {
        country: 'us',
        city: 'nyc',
        description: 'Original description'
      }

      await expect(validator.validateFieldData(newPayload, existingPayload)).resolves.not.toThrow()

      // Should only validate the changed field
      expect(ListOfValueFactory.createProvider).toHaveBeenCalledTimes(1)
      expect(mockProvider1.list).toHaveBeenCalledTimes(1)
      expect(mockProvider2.list).not.toHaveBeenCalled()
    })

    it('should fail validation when changed LOV value is invalid', async () => {
      const newPayload = {
        country: 'invalid-country', // changed to invalid value
        city: 'nyc'
      }

      const existingPayload = {
        country: 'us',
        city: 'nyc'
      }

      await expect(validator.validateFieldData(newPayload, existingPayload)).rejects.toThrow()

      try {
        await validator.validateFieldData(newPayload, existingPayload)
      } catch (error: any) {
        expect(error.errors).toHaveLength(1)
        expect(error.errors[0].field).toBe('country')
      }
    })

    it('should handle new fields in edit payload', async () => {
      const newPayload = {
        country: 'us',
        city: 'tor' // new field
      }

      const existingPayload = {
        country: 'us'
        // city field doesn't exist
      }

      await expect(validator.validateFieldData(newPayload, existingPayload)).resolves.not.toThrow()

      // Should validate the new city field
      expect(mockProvider2.list).toHaveBeenCalledTimes(1)
    })

    it('should handle removed fields gracefully', async () => {
      const newPayload = {
        country: 'us'
        // city field removed
      }

      const existingPayload = {
        country: 'us',
        city: 'nyc'
      }

      await expect(validator.validateFieldData(newPayload, existingPayload)).resolves.not.toThrow()
    })
  })

  describe('value comparison', () => {
    it('should correctly identify equal primitive values', async () => {
      const newPayload = { country: 'us' }
      const existingPayload = { country: 'us' }

      await expect(validator.validateFieldData(newPayload, existingPayload)).resolves.not.toThrow()

      expect(ListOfValueFactory.createProvider).not.toHaveBeenCalled()
    })

    it('should handle null and undefined correctly', async () => {
      const newPayload = { country: null }
      const existingPayload = { country: undefined }

      await expect(validator.validateFieldData(newPayload, existingPayload)).resolves.not.toThrow()

      expect(ListOfValueFactory.createProvider).not.toHaveBeenCalled()
    })

    it('should handle object/array values', async () => {
      const newPayload = { country: ['us', 'ca'] }
      const existingPayload = { country: ['us', 'ca'] }

      await expect(validator.validateFieldData(newPayload, existingPayload)).resolves.not.toThrow()

      expect(ListOfValueFactory.createProvider).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle workflow with no LOV fields', async () => {
      const workflowWithoutLov: WorkflowConfiguration & { workflowId: string } = {
        ...mockWorkflow,
        fields: [
          {
            slug: 'title',
            title: 'Title',
            schema: { kind: 'text' }
          }
        ]
      }

      const validatorWithoutLov = new LovValidator(mockApp, workflowWithoutLov)
      const payload = { title: 'Some title' }

      await expect(validatorWithoutLov.validateFieldData(payload)).resolves.not.toThrow()

      expect(ListOfValueFactory.createProvider).not.toHaveBeenCalled()
    })

    it('should handle empty payloads', async () => {
      await expect(validator.validateFieldData({})).resolves.not.toThrow()
    })
  })
})

describe('_helpers.formatLovValidationErrors', () => {
  it('should return empty string for no errors', () => {
    const result = _helpers.formatLovValidationErrors([])
    expect(result).toBe('')
  })

  it('should format single error', () => {
    const errors = [{ field: 'country', value: 'invalid', reason: 'Invalid country code' }]
    const result = _helpers.formatLovValidationErrors(errors)
    expect(result).toBe('Invalid country code')
  })

  it('should format multiple errors', () => {
    const errors = [
      { field: 'country', value: 'invalid', reason: 'Invalid country code' },
      { field: 'city', value: 'invalid', reason: 'Invalid city name' }
    ]
    const result = _helpers.formatLovValidationErrors(errors)
    expect(result).toBe(
      'Multiple validation errors: country: Invalid country code; city: Invalid city name'
    )
  })
})

