import type { IActionRunner, IWorkflowCardEntry } from '@cadence/shared/types'
import { FIREBASE_REGION, CARDS, WORKFLOWS } from '@cadence/shared/models'
import { onRequest, onCall } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'

import { transitWorkflowItem } from './fns/transit-workflow-item'
import { login } from './fns/login'
import { createOnCardWrittenHandler } from './fns/on-card-written'
import { createProvisionUser } from './fns/provision-user'
import { createCard } from './fns/create-card'

import { execute } from './fns/_executor'
import { executeHttp } from './fns/_http-executor'
import { ActionRunner } from './hooks/runner'

// Initialize depedencies
const app = initializeApp()
function getActionRunner(): IActionRunner {
  return ActionRunner.create(app)
}

const handleCardWritten = createOnCardWrittenHandler(app)

// Exported & configure Firebase Function's parameters.
// Keep login as onCall for compatibility
export const loginFn = onCall({ region: FIREBASE_REGION }, execute(login(app)))

// Convert to HTTP endpoints for public API
export const transitWorkflowItemAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  executeHttp(transitWorkflowItem(app, getActionRunner))
)

export const provisionUserAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  executeHttp(createProvisionUser(app))
)

export const createCardAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  executeHttp(createCard(app))
)

// Keep legacy onCall versions for backward compatibility during transition
export const transitWorkflowItemFn = onCall(
  { region: FIREBASE_REGION },
  execute(async (req) => {
    const userEmail = req.auth?.token.email || req.auth?.uid
    const userId = req.auth?.uid || 'unknown-user'
    return transitWorkflowItem(app, getActionRunner)(req.data, userId, userEmail)
  })
)
export const provisionUserFn = onCall(
  { region: FIREBASE_REGION },
  execute(async (req) => {
    const userId = req.auth?.uid
    const userEmail = req.auth?.token.email
    return createProvisionUser(app)(req.data, userId, userEmail)
  })
)

// Card activity logger - triggers on any card document changes
export const onCardWrittenHook = onDocumentWritten(
  {
    document: `${WORKFLOWS}/{workflowId}/${CARDS}/{cardId}`,
    region: FIREBASE_REGION
  },
  async (event) => {
    const { workflowId, cardId } = event.params
    const beforeData = event.data?.before?.data() as IWorkflowCardEntry | undefined
    const afterData = event.data?.after?.data() as IWorkflowCardEntry | undefined

    return handleCardWritten(workflowId, cardId, beforeData || null, afterData || null)
  }
)
