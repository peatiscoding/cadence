import type { IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'
import * as logger from 'firebase-functions/logger'
import { AActionExecutor } from './base'

const _helpers = {
  /**
   * Check if content-type header is already provided (case-insensitive)
   */
  hasContentTypeHeader(headers: Record<string, string>): boolean {
    return Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')
  },
  /**
   * Detect content type based on body content
   */
  identifyContentType(body: string): string {
    const trimmed = body.trim()

    // Check for JSON
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        JSON.parse(trimmed)
        return 'application/json'
      } catch {
        // Not valid JSON, continue checking
      }
    }

    // Check for XML
    if (trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.endsWith('>'))) {
      return 'application/xml'
    }

    // Check for form data
    if (trimmed.includes('=') && trimmed.includes('&')) {
      return 'application/x-www-form-urlencoded'
    }

    // Default to plain text
    return 'text/plain'
  }
}

/**
 * Action runner for sending a webhook requests
 */
export class SendWebhookActionExecutor extends AActionExecutor<'send-webhook'> {
  public constructor() {
    super('send-webhook')
  }

  public async onExecute(
    _cardContext: IWorkflowCard,
    action: Extract<IActionDefiniton, { kind: 'send-webhook' }>
  ): Promise<void> {
    try {
      // Prepare request headers
      const headers: Record<string, string> = {
        'User-Agent': 'Cadence-Webhook/1.0'
      }

      // Add custom headers if provided
      if (action.headers) {
        for (const [key, value] of action.headers) {
          headers[key] = value
        }
      }

      // Set content-type based on body if not already specified
      if (action.body && !_helpers.hasContentTypeHeader(headers)) {
        headers['Content-Type'] = _helpers.identifyContentType(action.body)
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: action.method.toUpperCase(),
        headers,
        ...(action.body && { body: action.body })
      }

      // Make the HTTP request
      const response = await fetch(action.url, requestOptions)

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(
          `Webhook request failed with status ${response.status}: ${response.statusText}`
        )
      }

      logger.log(`Webhook sent successfully to ${action.url} with status ${response.status}`)
    } catch (error) {
      logger.error('Failed to send webhook:', error)
      throw error
    }
  }
}
