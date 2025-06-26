import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
admin.initializeApp()

export const login = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*')
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.set('Access-Control-Allow-Headers', 'Content-Type')

  console.log('Credentials', process.env.GOOGLE_APPLICATION_CREDENTIALS)

  if (request.method === 'OPTIONS') {
    response.status(204).send('')
    return
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    logger.info('Login endpoint called', { structuredData: true })

    // Create custom token for hardcoded user "BOT"
    const uid = 'BOT'
    const customToken = await admin.auth().createCustomToken(uid, {
      role: 'bot',
      type: 'programmatic'
    })

    logger.info('Custom token created successfully', { uid, structuredData: true })

    response.status(200).json({
      success: true,
      token: customToken,
      uid: uid,
      message: 'Login successful'
    })
  } catch (error) {
    logger.error('Error creating custom token', error)
    response.status(500).json({
      success: false,
      error: 'Failed to create authentication token'
    })
  }
})
