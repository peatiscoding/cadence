import type { IActionRunner } from '@cadence/shared/types'
import { FIREBASE_REGION } from '@cadence/shared/models'
import { onCall } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'

import { transitWorkflowItem } from './fns/transit-workflow-item'
import { login } from './fns/login'

import { execute } from './fns/_executor'
import { ActionRunner } from './hooks/runner'

// Initialize depedencies
const app = initializeApp()
function getActionRunner(): IActionRunner {
  return ActionRunner.create(app)
}

// Exported & configure Firebase Function's parameters.
export const loginFn = onCall({ region: FIREBASE_REGION }, execute(login(app)))
export const transitWorkflowItemFn = onCall(
  { region: FIREBASE_REGION },
  execute(transitWorkflowItem(app, getActionRunner))
)
