import { z } from 'zod'

/**
 * Schema for InvalidateLovCacheRequest
 */
export const InvalidateLovCacheRequestSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  cacheKey: z.string().optional()
})

/**
 * Schema for InvalidateLovCacheResponse
 */
export const InvalidateLovCacheResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  invalidatedKeys: z.array(z.string()).optional()
})

export type InvalidateLovCacheRequest = z.infer<typeof InvalidateLovCacheRequestSchema>
export type InvalidateLovCacheResponse = z.infer<typeof InvalidateLovCacheResponseSchema>

