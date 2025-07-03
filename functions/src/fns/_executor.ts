import type { CallableRequest, CallableResponse } from 'firebase-functions/v2/https'
import type { IOnCallResponse } from '@cadence/shared/types'

/**
 * Shorthand version
 */
export const execute = function <RequestType, ReturnType>(
  fn: (req: CallableRequest<RequestType>) => Promise<ReturnType>
): (
  a: CallableRequest<RequestType>,
  r?: CallableResponse<IOnCallResponse<ReturnType>>
) => Promise<any> {
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
