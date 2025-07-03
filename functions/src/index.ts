import type { IActionRunner } from '@cadence/shared/types'
import { onCall } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

import { transitCard } from './fns/transit-card'
import { login } from './fns/login'

import { execute } from './fns/_executor'
import { ActionRunner } from './hooks/runner'

// Initialize depedencies
admin.initializeApp()
function getActionRunner(): IActionRunner {
  return ActionRunner.create(admin.firestore())
}

// Exported & configure Firebase Function's parameters.
export const loginFn = onCall({ region: 'asia-southeast2' }, execute(login(admin)))
export const transitCardFn = onCall(
  { region: 'asia-southeast2' },
  execute(transitCard(getActionRunner))
)
