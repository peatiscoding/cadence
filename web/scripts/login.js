#!/usr/bin/env node
import { initializeApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth, signInWithCustomToken } from 'firebase/auth'

import config from '../src/firebase.config.js'

const REGION = 'asia-southeast2'
const LOGIN_FN = 'loginFn'

const app = initializeApp(config)
const fns = getFunctions(app, REGION)
const loginFn = httpsCallable(fns, LOGIN_FN, { timeout: 5_000 })
const auth = getAuth(app)

async function loginWithCustomToken() {
  try {
    const res = await loginFn({})
    const data = res.data

    if (!data || !data.success || !data.result) {
      throw new Error('Failed to get custom token from login endpoint')
    }

    // Sign in with the custom token
    const userCredential = await signInWithCustomToken(auth, data.result)
    const user = userCredential.user

    // Get ID token for API calls
    const idToken = await user.getIdToken()

    console.log(idToken)
  } catch (error) {
    console.error('Authentication failed:', error.message)
    process.exit(1)
  }
}

// Run the login test
loginWithCustomToken()
