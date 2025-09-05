import type { App } from 'firebase-admin/app'
import type { AddApprovalRequest, AddApprovalResponse } from '@cadence/shared/types'

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { supportedWorkflows } from '@cadence/shared/defined'
import { paths } from '@cadence/shared/models'
import { canUserApprove } from '@cadence/shared/utils/approval-validation'

export const addApproval =
  (app: App) =>
  async (data: AddApprovalRequest, uid?: string, email?: string): Promise<AddApprovalResponse> => {
    const fs = getFirestore(app)
    const userEmail = email || uid
    const userId = uid || 'unknown-user'

    logger.log(
      `User ${userEmail} adding approval ${data.approvalKey} to ${data.workflowId}/${data.cardId}`
    )

    if (!userEmail) {
      throw new Error(`Invalid session. Login is required`)
    }

    try {
      const workflow = supportedWorkflows.find((wf) => wf.workflowId === data.workflowId)
      if (!workflow) {
        throw new Error(`Unknown workflow: ${data.workflowId}`)
      }

      const docRef = fs.doc(paths.WORKFLOW_CARD(data.workflowId, data.cardId))
      const doc = await docRef.get()

      if (!doc.exists) {
        throw new Error(`Card not found`)
      }

      const cardData = doc.data()

      // Check if user can provide this approval
      if (!canUserApprove(userId, data.approvalKey, cardData, workflow)) {
        throw new Error(
          `User ${userEmail} is not authorized to provide approval for ${data.approvalKey}`
        )
      }

      const approvalToken = {
        kind: 'basic' as const,
        note: data.note,
        author: userId,
        date: Date.now(),
        isNegative: data.isNegative
      }

      // Update the card with the new approval token
      const approvalTokensPath = `approvalTokens.${data.approvalKey}`
      await docRef.update({
        [approvalTokensPath]: FieldValue.arrayUnion(approvalToken),
        updatedBy: userId,
        updatedAt: FieldValue.serverTimestamp()
      })

      return {
        success: true,
        approvalToken
      }
    } catch (e) {
      throw new Error(`Cannot add approval: ${e}`)
    }
  }

