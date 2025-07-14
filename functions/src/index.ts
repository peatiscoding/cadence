import type { IActionRunner, IWorkflowCardEntry } from '@cadence/shared/types'
import { FIREBASE_REGION, CARDS, WORKFLOWS } from '@cadence/shared/models'
import { onCall } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
// For legacy support on creating user.
import * as functions from 'firebase-functions/v1'
import { initializeApp } from 'firebase-admin/app'

import { transitWorkflowItem } from './fns/transit-workflow-item'
import { login } from './fns/login'
import { createCardActivityTrigger } from './fns/card-activity-trigger'
import { createUserCreationHandler } from './fns/user-creation-handler'

import { execute } from './fns/_executor'
import { ActionRunner } from './hooks/runner'

// Initialize depedencies
const app = initializeApp()
function getActionRunner(): IActionRunner {
  return ActionRunner.create(app)
}

const handleCardChange = createCardActivityTrigger(app)
const handleUserCreation = createUserCreationHandler()

// Exported & configure Firebase Function's parameters.
export const loginFn = onCall({ region: FIREBASE_REGION }, execute(login(app)))
export const transitWorkflowItemFn = onCall(
  { region: FIREBASE_REGION },
  execute(transitWorkflowItem(app, getActionRunner))
)

// Card activity logger - triggers on any card document changes
export const cardActivityLoggerFn = onDocumentWritten(
  {
    document: `${WORKFLOWS}/{workflowId}/${CARDS}/{cardId}`,
    region: FIREBASE_REGION
  },
  async (event) => {
    const { workflowId, cardId } = event.params
    const beforeData = event.data?.before?.data() as IWorkflowCardEntry | undefined
    const afterData = event.data?.after?.data() as IWorkflowCardEntry | undefined

    return handleCardChange(workflowId, cardId, beforeData || null, afterData || null)
  }
)

// User creation handler - triggers when new users are created via Firebase Auth
export const userCreationHandlerFn = functions
  .region(FIREBASE_REGION)
  .auth.user()
  .onCreate(handleUserCreation)
