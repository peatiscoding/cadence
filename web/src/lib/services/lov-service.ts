import type { GetWorkflowLovDataRequest } from '@cadence/shared/types'
import { CadenceAPIClient } from '@cadence/api-client'
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
    const client = new CadenceAPIClient({}, auth)

    const request: GetWorkflowLovDataRequest = { workflowId }

    // Use API client instead of direct fetch
    const result = await client.getWorkflowLovData(request)
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
