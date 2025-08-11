/**
 * API Endpoint Configurations
 */

import type { EndpointConfig } from './types'

// Firebase region constant - keep in sync with shared package
export const FIREBASE_REGION = 'asia-southeast2' as const

/**
 * Endpoint definitions for all API functions
 */
export const ENDPOINTS = {
  CREATE_CARD: {
    path: 'createCardAPI',
    requiresAuth: true,
    timeout: 10000
  },
  TRANSIT_WORKFLOW_ITEM: {
    path: 'transitWorkflowItemAPI',
    requiresAuth: true,
    timeout: 15000 // Transit might take longer due to actions
  },
  PROVISION_USER: {
    path: 'provisionUserAPI',
    requiresAuth: true,
    timeout: 10000
  }
} as const satisfies Record<string, EndpointConfig>

/**
 * Build Firebase Functions URL
 */
export function buildFunctionURL(
  projectId: string,
  functionName: string,
  region: string = FIREBASE_REGION
): string {
  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`
}

/**
 * Get endpoint configuration
 */
export function getEndpoint(endpointKey: keyof typeof ENDPOINTS): EndpointConfig {
  return ENDPOINTS[endpointKey]
}
