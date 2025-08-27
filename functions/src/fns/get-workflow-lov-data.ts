import type { App } from 'firebase-admin/app'
import type { GetWorkflowLovDataRequest, GetWorkflowLovDataResponse } from '@cadence/shared/types'

import * as logger from 'firebase-functions/logger'
import { supportedWorkflows } from '@cadence/shared/defined'
import { ListOfValueFactory } from '../lovs/factory'
import { getFirestore } from 'firebase-admin/firestore'

export const getWorkflowLovData =
  (app: App) =>
  async (data: GetWorkflowLovDataRequest): Promise<GetWorkflowLovDataResponse> => {
    logger.log(`Getting LOV data for workflow: ${data.workflowId}`)

    const firestore = getFirestore(app)
    // Validate workflow exists
    const workflow = supportedWorkflows.find((wf) => wf.workflowId === data.workflowId)
    if (!workflow) {
      throw new Error(`Unknown workflow: ${data.workflowId}`)
    }

    try {
      const lovData: Record<string, any[]> = {}

      // Fetch LOV data for each field
      for (const field of workflow.fields) {
        if (field.schema.kind !== 'text' || !field.schema.lov) {
          continue
        }

        try {
          const lovProvider = ListOfValueFactory.createProvider(field.schema.lov!, firestore)
          const entries = await lovProvider.list()
          lovData[field.slug] = entries

          logger.log(`Loaded ${entries.length} entries for field: ${field.slug}`)
        } catch (error) {
          logger.error(`Failed to load LOV data for field ${field.slug}:`, error)
          // Continue with other fields even if one fails
          lovData[field.slug] = []
        }
      }

      return {
        workflowId: data.workflowId,
        lovData,
        success: true
      }
    } catch (error) {
      logger.error('Error getting workflow LOV data:', error)
      throw error
    }
  }

