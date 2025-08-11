/**
 * Cadence API Client
 *
 * HTTP client for Cadence Firebase Functions
 */
// Export all types
export type {
  CreateCardRequest,
  CreateCardResponse,
  ITransitWorkflowItemRequest,
  ITransitWorkflowItemResponse,
  ProvisionUserRequest,
  ProvisionUserResponse,
  IOnCallResponse
} from '@cadence/shared/types'
export { type EndpointConfig } from './endpoints'

export * from './types'

// Export all functions
export { APIError } from './errors'
export { CadenceAPIClient } from './client'
export { AuthManager } from './auth'
export { buildFunctionURL, getEndpoint, ENDPOINTS } from './endpoints'
