/**
 * Provision User Function
 *
 * This function ensures a user document exists in Firestore for a given authenticated user.
 * Called from the frontend when user data is needed but may not exist yet.
 */

import type { App } from 'firebase-admin/app'
import type { UserInfo, ProvisionUserRequest, ProvisionUserResponse } from '@cadence/shared/types'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

export function createProvisionUser(app: App) {
  const db = getFirestore(app)
  const auth = getAuth(app)

  return async (
    data: ProvisionUserRequest,
    uid?: string,
    email?: string
  ): Promise<ProvisionUserResponse> => {
    // Ensure user is authenticated
    if (!uid) {
      throw new Error('User must be authenticated')
    }

    try {
      // Check if user document already exists
      const userRef = db.collection('users').doc(uid)
      const userDoc = await userRef.get()

      if (userDoc.exists) {
        // Return existing user info
        const userInfo = userDoc.data() as UserInfo
        return {
          success: true,
          userInfo,
          wasCreated: false
        }
      }

      // User document doesn't exist, get user info from Firebase Auth
      const authUser = await auth.getUser(uid)

      if (!authUser.email) {
        throw new Error('User email is required but not found in authentication record')
      }

      // Generate displayName: use Auth displayName if available, otherwise derive from email
      const displayName = authUser.displayName || authUser.email.split('@')[0]

      // Create new user document
      const userInfo: UserInfo = {
        uid,
        email: authUser.email,
        displayName,
        role: 'user',
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      }

      // Write to Firestore
      await userRef.set(userInfo)

      console.log(`Provisioned user document for ${uid} with displayName: ${displayName}`)

      return {
        success: true,
        userInfo,
        wasCreated: true
      }
    } catch (error) {
      console.error('Error provisioning user:', error)
      throw new Error(
        `Failed to provision user: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
