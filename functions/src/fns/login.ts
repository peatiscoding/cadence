import type { App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'

const AUTH_USER_UID = 'bot'

export const login = (app: App) => async (): Promise<string> => {
  try {
    // Create custom token for hardcoded user "BOT"
    const uid = AUTH_USER_UID
    const customToken = await getAuth(app).createCustomToken(uid, {
      role: 'bot',
      type: 'programmatic'
    })
    return customToken
  } catch (error) {
    logger.error('Error creating custom token', error)
    throw error
  }
}
