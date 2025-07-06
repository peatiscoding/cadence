import type { IActionRunner } from '@cadence/shared/types'
import { onCall } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'

import { transitCard } from './fns/transit-card'
import { login } from './fns/login'

import { execute } from './fns/_executor'
import { ActionRunner } from './hooks/runner'

// Initialize depedencies
const app = initializeApp()
function getActionRunner(): IActionRunner {
  return ActionRunner.create(app)
}

// Exported & configure Firebase Function's parameters.
export const loginFn = onCall({ region: 'asia-southeast2' }, execute(login(app)))
export const transitCardFn = onCall(
  { region: 'asia-southeast2' },
  execute(transitCard(app, getActionRunner))
)
