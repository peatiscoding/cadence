import type { LovAPIDefinition } from '@cadence/shared/types'
import type { Firestore } from 'firebase-admin/firestore'
import { BaseListOfValueProvider, ListOfValueEntry } from './base'

export class ApiListOfValueProvider extends BaseListOfValueProvider {
  constructor(
    firestore: Firestore,
    cacheKey: string,
    private readonly config: LovAPIDefinition
  ) {
    super(firestore, 'api', cacheKey)
  }

  protected async fetchFromSource(): Promise<ListOfValueEntry[]> {
    try {
      const response = await fetch(this.config.url, {
        method: 'GET',
        headers: this.config.headers
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Navigate to the array using the listOfValueSelector
      const arrayData = this.getValueByPath(data, this.config.listOfValueSelector)

      if (!Array.isArray(arrayData)) {
        throw new Error(`Data at path "${this.config.listOfValueSelector}" is not an array`)
      }

      // Map each item in the array to ListOfValueEntry
      return arrayData.map((item, index) => ({
        key: this.getValueByPath(item, this.config.keySelector)?.toString() || index.toString(),
        label: this.getValueByPath(item, this.config.labelSelector)?.toString() || '',
        meta: item
      }))
    } catch (error) {
      console.error('Failed to fetch data from API:', error)
      throw new Error(`Failed to fetch LoV data from API: ${(error as Error).message}`)
    }
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  protected getCacheExpirationMinutes(): number {
    return 30 // API data expires after 30 minutes
  }
}
