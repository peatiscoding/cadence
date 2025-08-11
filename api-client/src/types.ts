/**
 * API Client Types
 * 
 * Type definitions for all Cadence API endpoints
 */

// Define API types locally to avoid import issues
// These need to stay in sync with @cadence/shared/types

export interface IOnCallResponse<T> {
  success: boolean
  result?: T
  reason?: Error
}

export interface ITransitWorkflowItemRequest {
  destinationContext: {
    workflowId: string
    workflowCardId: string
    status: string
    [key: string]: any
  }
}

export interface ITransitWorkflowItemResponse {
  doneIn: number
  transition: { executionKind: string; in: number }[]
  finally: { executionKind: string; in: number }[]
}

export interface ProvisionUserRequest {
  // Empty for now - placeholder for future fields
}

export interface ProvisionUserResponse {
  success: boolean
  userInfo: {
    uid: string
    email: string
    displayName: string
    role: 'user' | 'admin'
    createdAt: any
    lastUpdated: any
  }
  wasCreated: boolean
}

/**
 * Create Card API Types
 */
export interface CreateCardRequest {
  workflowId: string
  cardId?: string // Optional - if not provided, auto-generate
  payload: Record<string, any>
}

export interface CreateCardResponse {
  cardId: string
  workflowId: string
  success: boolean
}

/**
 * API Client Configuration
 */
export interface APIClientConfig {
  projectId?: string
  region?: string
  baseUrl?: string // Override for custom endpoints
  timeout?: number // Request timeout in milliseconds
}

/**
 * API Error Response Interface
 */
export interface APIErrorData {
  message: string
  code?: string
  details?: any
}

/**
 * Authentication Context
 */
export interface AuthContext {
  uid: string
  email?: string
  token: string
}
