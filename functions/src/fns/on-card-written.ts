/**
 * Firebase Function trigger for card activity logging
 *
 * This file contains the onDocumentWritten trigger function that responds to
 * card document changes and delegates to the activity logger.
 */

import type { App } from 'firebase-admin/app'
import type { IWorkflowCardEntry } from '@cadence/shared/types'
import { createCardActivityLogger } from './card-written-handler/card-activity-logger'

export function createOnCardWrittenHandler(app: App) {
  const logCardActivity = createCardActivityLogger(app)

  return async function handleCardChange(
    workflowId: string,
    cardId: string,
    beforeData: IWorkflowCardEntry | null,
    afterData: IWorkflowCardEntry | null
  ): Promise<void> {
    try {
      // Extract userId from the card data or use system default
      let userId = 'system'
      if (afterData?.updatedBy) {
        userId = afterData.updatedBy
      } else if (beforeData?.updatedBy) {
        userId = beforeData.updatedBy
      }

      await logCardActivity(workflowId, cardId, beforeData, afterData, userId)

      console.log(`Activity logged for card ${cardId} in workflow ${workflowId}`)
    } catch (error) {
      console.error('Card activity logger failed:', error)
      // Don't throw - let the function complete to avoid infinite retries
    }
  }
}
