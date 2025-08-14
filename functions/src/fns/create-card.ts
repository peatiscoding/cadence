import type { App } from 'firebase-admin/app'
import type { CreateCardRequest, CreateCardResponse } from '@cadence/shared/types'

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { paths } from '@cadence/shared/models'
import { supportedWorkflows } from '@cadence/shared/defined'
import { LovValidator } from '../lovs'

export const createCard =
  (app: App) =>
  async (data: CreateCardRequest, uid?: string, email?: string): Promise<CreateCardResponse> => {
    const fs = getFirestore(app)

    const userEmail = email || uid || 'unknown-user'
    const userId = uid || 'unknown-user'

    logger.log(`Creating card for user: ${userEmail} in workflow: ${data.workflowId}`)

    if (!userEmail) {
      throw new Error('Authentication is required to create cards')
    }

    // Validate workflow exists
    const workflow = supportedWorkflows.find((wf) => wf.workflowId === data.workflowId)
    if (!workflow) {
      throw new Error(`Unknown workflow: ${data.workflowId}`)
    }

    // Validate LOV fields in payload
    await new LovValidator(app, workflow).validateFieldData(data.payload)

    try {
      // Determine card ID
      let cardId: string

      if (data.cardId) {
        // Use provided card ID
        cardId = data.cardId
        const cardRef = fs.doc(paths.WORKFLOW_CARD(data.workflowId, cardId))

        // Check if card already exists
        const existingCard = await cardRef.get()
        if (existingCard.exists) {
          throw new Error(`Card with ID ${cardId} already exists in workflow ${data.workflowId}`)
        }

        // Create card with specific ID
        await cardRef.set({
          ...data.payload,
          statusSince: Timestamp.now(),
          createdBy: userId,
          createdAt: Timestamp.now(),
          updatedBy: userId,
          updatedAt: Timestamp.now()
        })
      } else {
        // Auto-generate card ID
        const cardsCollectionRef = fs.collection(paths.WORKFLOW_CARDS(data.workflowId))
        const cardRef = await cardsCollectionRef.add({
          ...data.payload,
          statusSince: Timestamp.now(),
          createdBy: userId,
          createdAt: Timestamp.now(),
          updatedBy: userId,
          updatedAt: Timestamp.now()
        })
        cardId = cardRef.id
      }

      logger.log(`Successfully created card ${cardId} in workflow ${data.workflowId}`)

      return {
        cardId,
        workflowId: data.workflowId,
        success: true
      }
    } catch (error) {
      logger.error('Error creating card:', error)
      throw error
    }
  }
