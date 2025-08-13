import type { App } from 'firebase-admin/app'
import type {
  InvalidateLovCacheRequest,
  InvalidateLovCacheResponse
} from '@cadence/shared/validation'
import type { BaseListOfValueProvider } from '../lovs/base'

import { supportedWorkflows } from '@cadence/shared/defined'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { ListOfValueFactory } from '../lovs/factory'
import { WorkflowConfiguration } from '@cadence/shared/types'

const _helpers = {
  getLovProvider(
    firestore: Firestore,
    configuration: WorkflowConfiguration,
    cacheKey?: string
  ): BaseListOfValueProvider[] {
    const res: BaseListOfValueProvider[] = []
    for (const field of configuration.fields) {
      if (field.schema.kind === 'text' && field.schema.lov) {
        const lovDef = field.schema.lov
        const _cacheKey = ListOfValueFactory.getCacheKey(lovDef.provider, lovDef.cacheKey)
        if (!cacheKey || cacheKey === _cacheKey) {
          const provider = ListOfValueFactory.createProvider(lovDef, firestore)
          res.push(provider)
        }
      }
    }
    return res
  }
}

export function invalidateLovCache(app: App) {
  return async (data: InvalidateLovCacheRequest): Promise<InvalidateLovCacheResponse> => {
    try {
      const firestore = getFirestore(app)

      // Validate workflow exists
      const workflow = supportedWorkflows.find((wf) => wf.workflowId === data.workflowId)
      if (!workflow) {
        return {
          success: false,
          message: `Unknown workflow: ${data.workflowId}`
        }
      }

      const matchedProviders = _helpers.getLovProvider(firestore, workflow, data.cacheKey)
      if (matchedProviders.length === 0 && data.cacheKey) {
        throw new Error(`Unknown requested cacheKey: ${data.cacheKey}`)
      }

      await Promise.all(matchedProviders.map((p) => p.list(true)))
      const invalidatedKeys = matchedProviders.map((p) => p.cacheKey)

      console.log(
        `LOV cache invalidated for workflow ${data.workflowId}, ${invalidatedKeys.length} entries`
      )

      return {
        success: true,
        message: `Successfully refreshed ${invalidatedKeys.length} LOV cache entries for workflow ${data.workflowId}`,
        invalidatedKeys
      }
    } catch (error) {
      console.error('Error invalidating LOV cache:', error)
      return {
        success: false,
        message: `Failed to invalidate LOV cache: ${(error as Error).message}`
      }
    }
  }
}
