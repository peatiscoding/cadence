import type { WorkflowConfiguration } from '@cadence/shared/types'
import type { App } from 'firebase-admin/app'

import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { ListOfValueFactory } from './factory'

export const _helpers = {
  /**
   * Helper to compare values for equality
   */
  valuesEqual(value1: any, value2: any): boolean {
    // Handle null/undefined
    if (value1 == null && value2 == null) return true
    if (value1 == null || value2 == null) return false

    // For simple values, direct comparison
    if (typeof value1 !== 'object' && typeof value2 !== 'object') {
      return value1 === value2
    }

    // For objects/arrays, use JSON comparison (simple but effective for this use case)
    try {
      return JSON.stringify(value1) === JSON.stringify(value2)
    } catch {
      return false
    }
  },
  formatLovValidationErrors(errors: { field: string; value: any; reason: string }[]): string {
    if (errors.length === 0) return ''

    if (errors.length === 1) {
      return errors[0].reason
    }

    return `Multiple validation errors: ${errors.map((e) => `${e.field}: ${e.reason}`).join('; ')}`
  }
}

class LovValidationError extends Error {
  public constructor(public readonly errors: { field: string; value: any; reason: string }[]) {
    super(_helpers.formatLovValidationErrors(errors))
  }
}

export class LovValidator {
  private firestore: Firestore

  constructor(
    app: App,
    protected readonly workflow: WorkflowConfiguration & { workflowId?: string }
  ) {
    this.firestore = getFirestore(app)
  }

  /**
   * Validates field data against LOV providers
   * Only validates fields that have changed or are new
   */
  async validateFieldData(
    newFieldData: Record<string, any>,
    existingFieldData: Record<string, any> = {}
  ): Promise<void> {
    const errors: { field: string; value: any; reason: string }[] = []

    // Find fields that need LOV validation
    const fieldsToValidate = this.workflow.fields.filter(
      (field) => field.schema.kind === 'text' && 'lov' in field.schema && field.schema.lov
    )

    // Check each LOV field
    for (const field of fieldsToValidate) {
      const fieldSlug = field.slug
      const newValue = newFieldData[fieldSlug]
      const existingValue = existingFieldData[fieldSlug]

      // Skip validation if new value is empty/undefined, or if existingValue provide validate that it hasn't changed
      if (newValue === undefined || newValue === null || newValue === '') {
        continue
      } else if (existingValue && _helpers.valuesEqual(newValue, existingValue)) {
        continue
      }

      try {
        // TypeScript narrowing - we know lov exists due to the filter above
        const textSchema = field.schema as Extract<typeof field.schema, { kind: 'text' }>
        const lovDef = textSchema.lov!
        const provider = ListOfValueFactory.createProvider(lovDef, this.firestore)

        // Get list of valid values from LOV provider
        const validValues = await provider.list()

        // Check if the new value exists in the LOV
        const isValidValue = validValues.some(
          (entry) => entry.key === newValue || entry.label === newValue
        )

        if (!isValidValue) {
          errors.push({
            field: fieldSlug,
            value: newValue,
            reason: `Value '${newValue}' is not in the list of valid values for field '${field.title || fieldSlug}'`
          })
        }
      } catch (error) {
        // If LOV provider fails, log error but don't fail validation
        console.error(`LOV validation failed for field ${fieldSlug}:`, error)
        errors.push({
          field: fieldSlug,
          value: newValue,
          reason: `Failed to validate against list of values: ${(error as Error).message}`
        })
      }
    }

    // Finalized the validation
    if (errors.length > 0) {
      throw new LovValidationError(errors)
    }
  }
}

