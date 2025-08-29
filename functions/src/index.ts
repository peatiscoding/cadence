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
import { invalidateLovCache } from './fns/invalidate-lov-cache'
import { getWorkflowLovData } from './fns/get-workflow-lov-data'
import { addApproval } from './fns/add-approval'

import { execute } from './fns/_executor'
import {
  HttpExecutorBuilder,
  cors,
  allowedMethod,
  firebaseIdToken,
  validateBody
} from './fns/_http-executor'
import { ActionRunner } from './hooks/runner'
import {
  CreateCardRequestSchema,
  ProvisionUserRequestSchema,
  TransitWorkflowItemRequestSchema,
  InvalidateLovCacheRequestSchema,
  GetWorkflowLovDataRequestSchema,
  AddApprovalRequestSchema
} from '@cadence/shared/validation'

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
  new HttpExecutorBuilder()
    .use(cors())
    .use(allowedMethod('POST'))
    .use(firebaseIdToken(app))
    .use(validateBody(TransitWorkflowItemRequestSchema))
    .handle(async (ctx) => {
      const userEmail = ctx.email ?? ctx.uid ?? ''
      const userId = ctx.uid ?? ''
      return transitWorkflowItem(app, getActionRunner)(ctx.body, userId, userEmail)
    })
)

export const provisionUserAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  new HttpExecutorBuilder()
    .use(cors())
    .use(allowedMethod('POST'))
    .use(firebaseIdToken(app))
    .use(validateBody(ProvisionUserRequestSchema))
    .handle(async (ctx) => {
      const userEmail = ctx.email ?? ctx.uid ?? ''
      const userId = ctx.uid ?? ''
      return createProvisionUser(app)(ctx.body, userId, userEmail)
    })
)

export const createCardAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  new HttpExecutorBuilder()
    .use(cors())
    .use(allowedMethod('POST'))
    .use(firebaseIdToken(app))
    .use(validateBody(CreateCardRequestSchema))
    .handle(async (ctx) => {
      const userEmail = ctx.email ?? ctx.uid ?? ''
      const userId = ctx.uid ?? ''
      return createCard(app)(ctx.body, userId, userEmail)
    })
)

export const invalidateLovCacheAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  new HttpExecutorBuilder()
    .use(cors())
    .use(allowedMethod('POST'))
    .use(validateBody(InvalidateLovCacheRequestSchema))
    .handle(async (ctx) => {
      return invalidateLovCache(app)(ctx.body)
    })
)

export const getWorkflowLovDataAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  new HttpExecutorBuilder()
    .use(cors())
    .use(allowedMethod('POST'))
    .use(validateBody(GetWorkflowLovDataRequestSchema))
    .handle(async (ctx) => {
      return getWorkflowLovData(app)(ctx.body)
    })
)

export const addApprovalAPI = onRequest(
  { region: FIREBASE_REGION, cors: true },
  new HttpExecutorBuilder()
    .use(cors())
    .use(allowedMethod('POST'))
    .use(firebaseIdToken(app))
    .use(validateBody(AddApprovalRequestSchema))
    .handle(async (ctx) => {
      const userEmail = ctx.email ?? ctx.uid ?? ''
      const userId = ctx.uid ?? ''
      return addApproval(app)(ctx.body, userId, userEmail)
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
