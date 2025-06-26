#!/usr/bin/env node
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'

import config from '../src/firebase.config.js'

const app = initializeApp(config)
const auth = getAuth(app)

async function loginWithCustomToken() {
  try {
    // Call your deployed login endpoint - replace with your actual function URL
    const functionUrl = 'https://asia-southeast2-cadence-a7f68.cloudfunctions.net/login'

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || !data.token) {
      throw new Error('Failed to get custom token from login endpoint')
    }

    // Sign in with the custom token
    const userCredential = await signInWithCustomToken(auth, data.token)
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
