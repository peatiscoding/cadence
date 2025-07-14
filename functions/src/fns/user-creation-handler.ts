/**
 * Firebase Function to handle user creation events
 *
 * This function triggers when a new user is created via Firebase Auth and:
 * 1. Creates a user document in /users/{uid} collection
 * 2. Extracts displayName from email prefix
 * 3. Stores user information for displayName resolution
 */

import type { UserRecord } from 'firebase-functions/v1/auth'
import type { UserInfo } from '@cadence/shared/types'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getApp } from 'firebase-admin/app'

export function createUserCreationHandler() {
  const app = getApp()
  const db = getFirestore(app)

  return async (user: UserRecord): Promise<void> => {
    try {
      const { uid, email, displayName: authDisplayName } = user

      // Validate required fields
      if (!email) {
        console.warn(`User ${uid} created without email, skipping user document creation`)
        return
      }

      // Generate displayName: use Auth displayName if available, otherwise derive from email
      const displayName = authDisplayName || email.split('@')[0]

      // Create user document
      const userInfo: UserInfo = {
        uid,
        email,
        displayName,
        role: 'user',
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      }

      // Write to Firestore
      const userRef = db.collection('users').doc(uid)
      await userRef.set(userInfo)

      console.log(`Created user document for ${uid} with displayName: ${displayName}`)
    } catch (error) {
      console.error('Error creating user document:', error)
      // Don't throw - user creation should not fail if document creation fails
    }
  }
}

