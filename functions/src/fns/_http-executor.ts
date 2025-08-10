import type { onRequest } from 'firebase-functions/v2/https'
import type { IOnCallResponse } from '@cadence/shared/types'

import { getAuth } from 'firebase-admin/auth'
import { initializeApp } from 'firebase-admin/app'

type OnRequestHandler = Parameters<typeof onRequest>[0]

/**
 * HTTP Request executor for converting onCall functions to onRequest
 * Handles CORS, authentication, and response formatting
 */
export const executeHttp = function <RequestType, ReturnType>(
  fn: (data: RequestType, uid?: string, email?: string) => Promise<ReturnType>
): OnRequestHandler {
  return async (req, res) => {
    try {
      // Handle CORS
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).send('')
        return
      }

      // Only allow POST requests for API calls
      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          reason: { message: 'Method not allowed. Use POST.' }
        } as IOnCallResponse<ReturnType>)
        return
      }

      // Extract and validate authorization token
      let uid: string | undefined
      let email: string | undefined

      const authHeader = req.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const idToken = authHeader.substring(7)
          const app = initializeApp()
          const auth = getAuth(app)
          const decodedToken = await auth.verifyIdToken(idToken)
          uid = decodedToken.uid
          email = decodedToken.email
        } catch (authError) {
          console.warn('Invalid token:', authError)
          // Continue without auth - let individual functions handle auth requirements
        }
      }

      // Execute the function
      const result = await fn(req.body as RequestType, uid, email)

      const response: IOnCallResponse<ReturnType> = {
        success: true,
        result: result
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Function execution error:', error)

      const errorResponse: IOnCallResponse<ReturnType> = {
        success: false,
        reason: error instanceof Error ? error : new Error(String(error))
      }

      res.status(500).json(errorResponse)
    }
  }
}

/**
 * Simpler version for functions that don't need authentication
 */
export const executeHttpPublic = function <RequestType, ReturnType>(
  fn: (data: RequestType) => Promise<ReturnType>
): OnRequestHandler {
  return async (req, res) => {
    try {
      // Handle CORS
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).send('')
        return
      }

      // Only allow POST requests for API calls
      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          reason: { message: 'Method not allowed. Use POST.' }
        } as IOnCallResponse<ReturnType>)
        return
      }

      // Execute the function
      const result = await fn(req.body as RequestType)

      const response: IOnCallResponse<ReturnType> = {
        success: true,
        result: result
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Function execution error:', error)

      const errorResponse: IOnCallResponse<ReturnType> = {
        success: false,
        reason: error instanceof Error ? error : new Error(String(error))
      }

      res.status(500).json(errorResponse)
    }
  }
}

