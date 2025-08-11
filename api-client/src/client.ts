/**
 * Cadence API Client
 *
 * HTTP client for interacting with Cadence Firebase Functions
 */

import type { Auth } from 'firebase/auth'
import type {
  CreateCardRequest,
  CreateCardResponse,
  ITransitWorkflowItemRequest,
  ITransitWorkflowItemResponse,
  ProvisionUserRequest,
  ProvisionUserResponse,
  IOnCallResponse
} from '@cadence/shared/types'
import type { APIClientConfig } from './types'

import { AuthManager } from './auth'
import { buildFunctionURL, getEndpoint, ENDPOINTS, FIREBASE_REGION } from './endpoints'
import { APIError } from './errors'

export class CadenceAPIClient {
  private projectId: string
  private region: string
  private baseUrl?: string
  private timeout: number
  private authManager: AuthManager

  constructor(config: APIClientConfig = {}, auth?: Auth) {
    // Get project ID from Firebase app or config
    this.projectId = config.projectId || this.getProjectIdFromAuth(auth)
    this.region = config.region || FIREBASE_REGION
    this.baseUrl = config.baseUrl
    this.timeout = config.timeout || 30000 // 30 second default
    this.authManager = new AuthManager(auth)

    if (!this.projectId) {
      throw new Error(
        'Project ID is required. Provide it in config or initialize Firebase Auth first.'
      )
    }
  }

  /**
   * Extract project ID from Firebase Auth instance
   */
  private getProjectIdFromAuth(auth?: Auth): string {
    if (auth?.app?.options?.projectId) {
      return auth.app.options.projectId as string
    }

    // Try to get from global Firebase if no auth provided
    if (typeof window !== 'undefined' && (window as any).firebase) {
      const app = (window as any).firebase.app()
      if (app?.options?.projectId) {
        return app.options.projectId
      }
    }

    throw new Error(
      'Cannot determine project ID. Please provide it in config or initialize Firebase first.'
    )
  }

  /**
   * Make an authenticated HTTP request
   */
  private async makeRequest<TRequest, TResponse>(
    endpointKey: keyof typeof ENDPOINTS,
    data: TRequest
  ): Promise<TResponse> {
    const endpoint = getEndpoint(endpointKey)
    const url = this.baseUrl || buildFunctionURL(this.projectId, endpoint.path, this.region)

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add authentication if required
    if (endpoint.requiresAuth) {
      const authContext = await this.authManager.getAuthContext()
      if (!authContext) {
        throw new APIError('Authentication required but user is not signed in')
      }
      headers['Authorization'] = `Bearer ${authContext.token}`
    }

    // Set up request timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout || this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`HTTP ${response.status}: ${errorText}`)
      }

      const result: IOnCallResponse<TResponse> = await response.json()

      if (!result.success) {
        const error = result.reason
        throw new APIError(error?.message || 'Unknown API error', (error as any)?.code, error)
      }

      return result.result as TResponse
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof APIError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Request timeout')
        }
        throw new APIError(`Network error: ${error.message}`)
      }

      throw new APIError('Unknown error occurred')
    }
  }

  /**
   * Create a new card in a workflow
   */
  async createCard(request: CreateCardRequest): Promise<CreateCardResponse> {
    return this.makeRequest('CREATE_CARD', request)
  }

  /**
   * Transit a workflow item to a new status
   */
  async transitWorkflowItem(
    request: ITransitWorkflowItemRequest
  ): Promise<ITransitWorkflowItemResponse> {
    return this.makeRequest('TRANSIT_WORKFLOW_ITEM', request)
  }

  /**
   * Provision a user document in Firestore
   */
  async provisionUser(request: ProvisionUserRequest): Promise<ProvisionUserResponse> {
    return this.makeRequest('PROVISION_USER', request)
  }

  /**
   * Check if the client is properly configured and authenticated
   */
  async isReady(): Promise<boolean> {
    try {
      return this.authManager.isAuthenticated()
    } catch {
      return false
    }
  }

  /**
   * Get current authentication status
   */
  isAuthenticated(): boolean {
    return this.authManager.isAuthenticated()
  }
}
