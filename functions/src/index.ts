import { CallableRequest, CallableResponse, onCall } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import * as admin from 'firebase-admin'

const AUTH_USER_UID = 'bot'

// Initialize Firebase Admin SDK
admin.initializeApp()

interface ExecutionSuccessResult<T> {
  success: true
  result: T
}

interface ExecutionFailedResult {
  success: false
  reason: Error
}

type ExecutionResult<T> = ExecutionFailedResult | ExecutionSuccessResult<T>

/**
 * Shorthand version
 */
const execute = function <ReturnType>(
  fn: (req: CallableRequest<any>) => Promise<ReturnType>
): (a: CallableRequest, r?: CallableResponse<ExecutionResult<ReturnType>>) => Promise<any> {
  return async (req, res) => {
    try {
      const out = await fn(req)
      const wrapped = {
        success: true,
        result: out
      } as const
      if (res) {
        await res.sendChunk(wrapped)
      }
      return wrapped
    } catch (error) {
      const wrapped = {
        success: false,
        reason: error as Error
      } as const
      if (res) {
        await res.sendChunk(wrapped)
      }
      return wrapped
    }
  }
}

export const loginFn = onCall(
  { region: 'asia-southeast2' },
  execute(async () => {
    try {
      logger.info(`Login endpoint called`, admin.credential)

      // Create custom token for hardcoded user "BOT"
      const uid = AUTH_USER_UID
      const customToken = await admin.auth().createCustomToken(uid, {
        role: 'bot',
        type: 'programmatic'
      })
      return customToken
    } catch (error) {
      logger.error('Error creating custom token', error)
      throw error
    }
  })
)
