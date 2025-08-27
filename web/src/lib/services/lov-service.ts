import type { GetWorkflowLovDataRequest, GetWorkflowLovDataResponse } from '@cadence/shared/types'
import { getAuth } from 'firebase/auth'
import { app } from '$lib/firebase-app'

export interface LovEntry {
  key: string
  label: string
  meta?: any
}

export type WorkflowLovData = Record<string, LovEntry[]>

class LovService {
  private cache = new Map<string, WorkflowLovData>()
  private loadingPromises = new Map<string, Promise<WorkflowLovData>>()

  async getWorkflowLovData(workflowId: string): Promise<WorkflowLovData> {
    // Check if data is already cached
    if (this.cache.has(workflowId)) {
      return this.cache.get(workflowId)!
    }

    // Check if data is currently being loaded
    if (this.loadingPromises.has(workflowId)) {
      return this.loadingPromises.get(workflowId)!
    }

    // Start loading data
    const loadingPromise = this.fetchWorkflowLovData(workflowId)
    this.loadingPromises.set(workflowId, loadingPromise)

    try {
      const lovData = await loadingPromise
      this.cache.set(workflowId, lovData)
      return lovData
    } finally {
      this.loadingPromises.delete(workflowId)
    }
  }

  private async fetchWorkflowLovData(workflowId: string): Promise<WorkflowLovData> {
    const auth = getAuth(app)
    const user = auth.currentUser

    if (!user) {
      throw new Error('User must be authenticated to fetch LOV data')
    }

    // Get ID token for authentication
    const idToken = await user.getIdToken()

    const request: GetWorkflowLovDataRequest = { workflowId }

    // Call Firebase Function
    const response = await fetch(
      `https://us-central1-${app.options.projectId}.cloudfunctions.net/getWorkflowLovDataAPI`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(request)
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch LOV data: ${response.statusText}`)
    }

    const result: GetWorkflowLovDataResponse = await response.json()

    if (!result.success) {
      throw new Error('Failed to fetch LOV data')
    }

    return result.lovData
  }

  getLovDataForField(workflowId: string, fieldSlug: string): LovEntry[] | null {
    const workflowData = this.cache.get(workflowId)
    if (!workflowData) {
      return null
    }
    return workflowData[fieldSlug] || []
  }

  clearCache(workflowId?: string) {
    if (workflowId) {
      this.cache.delete(workflowId)
    } else {
      this.cache.clear()
    }
  }

  validateLovValue(workflowId: string, fieldSlug: string, value: string): boolean {
    const lovData = this.getLovDataForField(workflowId, fieldSlug)
    if (!lovData) {
      return true // No LOV data available, assume valid
    }

    if (!value || value.trim() === '') {
      return true // Empty values are valid
    }

    // Check if value matches any key or label
    return lovData.some((entry) => entry.key === value || entry.label === value)
  }
}

// Export singleton instance
export const lovService = new LovService()

