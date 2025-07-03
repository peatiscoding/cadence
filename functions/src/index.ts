import { onCall } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

import { transitCard } from './fns/transit-card'
import { login } from './fns/login'

import { execute } from './fns/_executor'

// Initialize Firebase Admin SDK
admin.initializeApp()

// Exported functions
export const loginFn = onCall({ region: 'asia-southeast2' }, execute(login(admin)))
export const transitCardFn = onCall({ region: 'asia-southeast2' }, execute(transitCard()))
