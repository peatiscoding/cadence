/**
 * Authentication utilities for API Client
 */

import { getAuth, type Auth, type User } from 'firebase/auth'
import type { AuthContext } from './types'

export class AuthManager {
  private auth: Auth

  constructor(auth?: Auth) {
    this.auth = auth || getAuth()
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser
  }

  /**
   * Get authentication context with token
   */
  async getAuthContext(): Promise<AuthContext | null> {
    const user = this.getCurrentUser()
    if (!user) return null

    try {
      const token = await user.getIdToken()
      return {
        uid: user.uid,
        email: user.email || undefined,
        token
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error)
      throw new Error('Failed to get authentication token')
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  /**
   * Wait for authentication state to be initialized
   */
  async waitForAuth(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }
}
