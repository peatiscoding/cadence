import type { AddApprovalRequest } from '@cadence/shared/types'
import { CadenceAPIClient } from '@cadence/api-client'
import { getAuth } from 'firebase/auth'
import { app } from '$lib/firebase-app'

class ApprovalService {
  async addApproval(
    workflowId: string,
    cardId: string,
    approvalKey: string,
    note: string,
    isNegative: boolean
  ): Promise<void> {
    const auth = getAuth(app)
    const client = new CadenceAPIClient({}, auth)

    const request: AddApprovalRequest = {
      workflowId,
      cardId,
      approvalKey,
      note,
      isNegative
    }

    await client.addApproval(request)
  }
}

// Export singleton instance
export const approvalService = new ApprovalService()