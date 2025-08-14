import type { LovGoogleSheetDefinition } from '@cadence/shared/types'

import { BaseListOfValueProvider, ListOfValueEntry } from './base'
import { Firestore } from 'firebase-admin/firestore'
import { google } from 'googleapis'

export class GoogleSheetListOfValueProvider extends BaseListOfValueProvider {
  constructor(
    firestore: Firestore,
    cacheKey: string,
    private readonly config: LovGoogleSheetDefinition
  ) {
    super(firestore, 'googlesheet', cacheKey)
  }

  protected async fetchFromSource(): Promise<ListOfValueEntry[]> {
    try {
      // Initialize Google Sheets API with service account auth
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      })

      const c = await auth.getCredentials()
      console.log(`Fetching spreadsheet with client_email=`, c.client_email)

      const sheets = google.sheets({ version: 'v4', auth })

      // Fetch both key and value ranges
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.config.sheetId,
        ranges: [this.config.keyRange, this.config.valueRange]
      })

      const valueRanges = response.data.valueRanges

      if (!valueRanges || valueRanges.length !== 2) {
        throw new Error('Failed to fetch both key and value ranges from Google Sheets')
      }

      const keyData = valueRanges[0].values || []
      const valueData = valueRanges[1].values || []

      // Convert 2D arrays to 1D based on direction
      const keys = this.flattenRange(keyData, this.config.dir)
      const values = this.flattenRange(valueData, this.config.dir)

      // Ensure both arrays have the same length
      const length = Math.min(keys.length, values.length)

      return Array.from({ length }, (_, index) => ({
        key: keys[index]?.toString() || index.toString(),
        value: values[index]?.toString() || ''
        // meta: { keyRange: this.config.keyRange, valueRange: this.config.valueRange, index }
      }))
    } catch (error) {
      console.error('Failed to fetch data from Google Sheets:', error)
      throw new Error(`Failed to fetch LoV data from Google Sheets: ${(error as Error).message}`)
    }
  }

  private flattenRange(data: any[][], direction: 'LR' | 'TB'): string[] {
    if (!data || data.length === 0) {
      return []
    }

    if (direction === 'TB') {
      // Top to Bottom: take first column
      return data.map((row) => row[0] || '')
    } else {
      // Left to Right: take first row
      return data[0] || []
    }
  }

  protected getCacheExpirationMinutes(): number {
    return 120 // Google Sheets data expires after 2 hours
  }
}
