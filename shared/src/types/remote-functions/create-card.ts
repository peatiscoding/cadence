/**
 * Create Card Remote Function Types
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

