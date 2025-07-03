import admin from 'firebase-admin'
import * as logger from 'firebase-functions/logger'

const AUTH_USER_UID = 'bot'

export const login = (adm: typeof admin) => async (): Promise<string> => {
  try {
    // Create custom token for hardcoded user "BOT"
    const uid = AUTH_USER_UID
    const customToken = await adm.auth().createCustomToken(uid, {
      role: 'bot',
      type: 'programmatic'
    })
    return customToken
  } catch (error) {
    logger.error('Error creating custom token', error)
    throw error
  }
}
