/**
 * Cadence API Client
 * 
 * HTTP client for Cadence Firebase Functions
 */

export { CadenceAPIClient, APIError } from './client'
export { AuthManager } from './auth'
export { buildFunctionURL, getEndpoint, ENDPOINTS } from './endpoints'

// Export all types
export type {
  APIClientConfig,
  AuthContext,
  CreateCardRequest,
  CreateCardResponse,
  ITransitWorkflowItemRequest,
  ITransitWorkflowItemResponse,
  ProvisionUserRequest,
  ProvisionUserResponse,
  IOnCallResponse
} from './types'

// Convenience exports for quick access
export { type EndpointConfig } from './endpoints'
