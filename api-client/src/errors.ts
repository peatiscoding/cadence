/**
 * Custom API Error class
 */
export class APIError extends Error {
  public readonly code?: string
  public readonly details?: any

  constructor(message: string, code?: string, details?: any) {
    super(message)
    this.name = 'APIError'
    this.code = code
    this.details = details

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError)
    }
  }
}
