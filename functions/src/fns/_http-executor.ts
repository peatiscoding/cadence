import type { onRequest } from 'firebase-functions/v2/https'
import type { IOnCallResponse } from '@cadence/shared/types'
import type { ZodSchema, ZodError } from 'zod'

import { getAuth } from 'firebase-admin/auth'
import { App } from 'firebase-admin/app'

export class ValidationError extends Error {
  public readonly statusCode: number = 400
  public readonly issues: any[]

  constructor(message: string, issues: any[] = []) {
    super(message)
    this.name = 'ValidationError'
    this.issues = issues
  }

  static fromZodError(error: ZodError): ValidationError {
    return new ValidationError('Validation failed', error.issues)
  }
}

type OnRequestHandler = Parameters<typeof onRequest>[0]
type IRequest = Parameters<OnRequestHandler>[0]
type IResponse = Parameters<OnRequestHandler>[1]

export type HttpExecutorMiddleware<InCTX extends {}, _OutCtx extends InCTX> = (
  context: InCTX,
  request: IRequest,
  response: IResponse,
  next: () => Promise<void>
) => Promise<void>

export class HttpExecutorBuilder<CTX extends {}> {
  protected middlewares: HttpExecutorMiddleware<any, any>[] = []

  /** Passing upgraded context */
  public use<OutCtx extends CTX>(
    m: HttpExecutorMiddleware<CTX, OutCtx>
  ): HttpExecutorBuilder<OutCtx> {
    this.middlewares.push(m)
    return this as any
  }

  public handle<RequestType, ReturnType>(
    fn: (ctx: CTX, data: RequestType) => Promise<ReturnType>
  ): OnRequestHandler {
    return async (req, res) => {
      let context = {} as CTX
      let currentMiddlewareIndex = 0

      const next = async (): Promise<void> => {
        if (currentMiddlewareIndex < this.middlewares.length) {
          const middleware = this.middlewares[currentMiddlewareIndex++]
          await middleware(context, req, res, next)
        } else {
          // Execute the final handler
          try {
            const result = await fn(context, req.body as RequestType)
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

      try {
        await next()
      } catch (error) {
        console.error('Middleware execution error:', error)

        const errorResponse: IOnCallResponse<any> = {
          success: false,
          reason: error instanceof Error ? error : new Error(String(error))
        }

        // Check if error has a statusCode property
        const statusCode =
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          typeof error.statusCode === 'number'
            ? error.statusCode
            : 500

        res.status(statusCode).json(errorResponse)
      }
    }
  }
}

// Built-in middleware factories
export const cors = <CTX extends {}>(): HttpExecutorMiddleware<CTX, CTX> => {
  return async (_context, req, res, next) => {
    // Handle CORS
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    await next()
  }
}

export const allowedMethod = <CTX extends {}>(
  method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
): HttpExecutorMiddleware<CTX, CTX> => {
  return async (_context, req, res, next) => {
    // Only allow POST requests for API calls
    if (req.method !== method) {
      res.status(405).json({
        success: false,
        reason: { message: 'Method not allowed. Use POST.' }
      } as IOnCallResponse<any>)
      return
    }

    await next()
  }
}

export const firebaseIdToken = <CTX extends {}>(
  app: App
): HttpExecutorMiddleware<CTX, CTX & { uid?: string; email?: string }> => {
  return async (context, req, _res, next) => {
    // Extract and validate authorization token
    let uid: string | undefined
    let email: string | undefined

    const authHeader = req.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.substring(7)
        const auth = getAuth(app)
        const decodedToken = await auth.verifyIdToken(idToken)
        uid = decodedToken.uid
        email = decodedToken.email
      } catch (authError) {
        console.warn('Invalid token:', authError)
        // Continue without auth - let individual functions handle auth requirements
      }
    }

    // Add auth info to context
    Object.assign(context, { uid, email })

    await next()
  }
}

export const validateBody = <CTX extends {}, T>(
  schema: ZodSchema<T>
): HttpExecutorMiddleware<CTX, CTX & { body: T }> => {
  return async (context, req, _res, next) => {
    try {
      const body = schema.parse(req.body)

      // Add validated body to context
      Object.assign(context, { body })

      await next()
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error as ZodError)
      }
      throw error
    }
  }
}
