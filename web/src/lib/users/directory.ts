/**
 * User Directory - Frontend user management and caching
 *
 * Handles user lookups, caching, and provisioning for displayName resolution
 */
import type { UserInfo, ProvisionUserRequest, ProvisionUserResponse } from '@cadence/shared/types'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { FIREBASE_REGION } from '@cadence/shared/models'
import { app } from '../firebase-app'
import { impls } from '../impls'
import { ProvisioningCache } from './provisioning-cache'

interface CachedUserInfo {
  displayName: string
  email: string
  role: 'user' | 'admin'
  timestamp: number
}

export class UserDirectory {
  private static cache: Map<string, CachedUserInfo> = new Map()
  private static cacheTimestamp: number = 0
  private static readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour
  private static readonly CACHE_KEY = 'cadence_user_directory_v1'

  /**
   * Get display name for a user by UID
   * Handles caching and provisioning automatically
   */
  static getDisplayName(uid: string): Promise<string> {
    return this.getUserInfo(uid).then((a) => a.displayName)
  }

  /**
   * Get full user info for a user by UID
   * Handles caching and provisioning automatically
   */
  static async getUserInfo(uid: string): Promise<CachedUserInfo> {
    // Try cache first
    if (this.isCacheValid() && this.cache.has(uid)) {
      console.debug(`🎯 UserDirectory cache hit: ${uid} -> ${this.cache.get(uid)!.displayName}`)
      return this.cache.get(uid)!
    }

    // Load cache from localStorage if needed
    if (!this.isCacheValid()) {
      this.loadCacheFromStorage()
    }

    // Check cache again after loading from storage
    if (this.cache.has(uid)) {
      console.debug(
        `📂 UserDirectory localStorage cache hit: ${uid} -> ${this.cache.get(uid)!.displayName}`
      )
      return this.cache.get(uid)!
    }

    // Fetch from Firestore
    console.debug(`🔍 UserDirectory cache miss, fetching from Firestore: ${uid}`)
    try {
      const fs = getFirestore(app)
      const userDoc = await getDoc(doc(fs, 'users', uid))
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserInfo
        const cachedInfo: CachedUserInfo = {
          displayName: userData.displayName,
          email: userData.email,
          role: userData.role,
          timestamp: Date.now()
        }
        this.cache.set(uid, cachedInfo)
        this.saveCacheToStorage()
        console.debug(`✅ UserDirectory fetched and cached: ${uid} -> ${userData.displayName}`)
        return cachedInfo
      }
    } catch (error) {
      console.warn(`Failed to fetch user ${uid} from Firestore:`, error)
    }

    // User not found, fallback to UID
    const fallbackInfo: CachedUserInfo = {
      displayName: uid,
      email: '',
      role: 'user',
      timestamp: Date.now()
    }
    return fallbackInfo
  }

  /**
   * Provision current authenticated user
   * Ensures user document exists in Firestore
   * Uses cookie caching to avoid unnecessary server calls
   */
  static async provisionCurrentUser(): Promise<UserInfo> {
    const user = impls.authProvider.currentUser
    if (!user) {
      throw new Error('No authenticated user found')
    }

    // Check if user is already provisioned (cached in cookie)
    if (ProvisioningCache.isUserProvisioned(user.uid)) {
      console.debug(`User ${user.uid} already provisioned (cached), skipping server call`)

      // Try to get user info from local cache first
      try {
        const cachedInfo = await this.getUserInfo(user.uid)
        return {
          uid: user.uid,
          email: cachedInfo.email || user.email || '',
          displayName: cachedInfo.displayName,
          role: cachedInfo.role,
          createdAt: null as any, // We don't cache these timestamps
          lastUpdated: null as any
        }
      } catch (error) {
        console.warn('Failed to get cached user info, will call server:', error)
        // Fall through to server call if local cache fails
      }
    }

    try {
      // Call the backend provision function
      console.debug(`Calling provisionUserFn for user ${user.uid}`)
      const request: ProvisionUserRequest = {}
      const response = await this.callProvisionFunction(request)

      if (response.success) {
        // Update local cache with fresh user info
        const cachedInfo: CachedUserInfo = {
          displayName: response.userInfo.displayName,
          email: response.userInfo.email,
          role: response.userInfo.role,
          timestamp: Date.now()
        }
        this.cache.set(user.uid, cachedInfo)
        this.saveCacheToStorage()

        // Mark user as provisioned in cookie to avoid future calls
        ProvisioningCache.markUserProvisioned(user.uid)

        console.log(
          `User provisioned: ${response.wasCreated ? 'created' : 'found'} - ${response.userInfo.displayName}`
        )
        return response.userInfo
      } else {
        throw new Error('Provision function returned failure')
      }
    } catch (error) {
      console.error('Failed to provision current user:', error)
      throw error
    }
  }

  /**
   * Batch get display names for multiple UIDs
   * More efficient for loading activity lists
   */
  static async batchGetDisplayNames(uids: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {}

    // Separate cached and non-cached UIDs
    const uncachedUids: string[] = []

    for (const uid of uids) {
      if (this.isCacheValid() && this.cache.has(uid)) {
        result[uid] = this.cache.get(uid)!.displayName
        console.debug(`🎯 UserDirectory batch cache hit: ${uid} -> ${result[uid]}`)
      } else {
        uncachedUids.push(uid)
      }
    }

    // Batch fetch uncached users
    if (uncachedUids.length > 0) {
      console.debug(
        `🔍 UserDirectory batch cache miss, fetching ${uncachedUids.length} users: [${uncachedUids.join(', ')}]`
      )
      try {
        const fs = getFirestore(app)

        // For now, fetch one by one since Firebase Web SDK doesn't have getAll like Admin SDK
        for (const uid of uncachedUids) {
          try {
            const userDoc = await getDoc(doc(fs, 'users', uid))
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserInfo
              const cachedInfo: CachedUserInfo = {
                displayName: userData.displayName,
                email: userData.email,
                role: userData.role,
                timestamp: Date.now()
              }
              this.cache.set(uid, cachedInfo)
              result[uid] = userData.displayName
              console.debug(`✅ UserDirectory batch fetched: ${uid} -> ${userData.displayName}`)
            } else {
              // User not found, use UID as fallback
              result[uid] = uid
              console.debug(`❌ UserDirectory user not found, using fallback: ${uid}`)
            }
          } catch (docError) {
            console.warn(`Failed to fetch user ${uid}:`, docError)
            result[uid] = uid
          }
        }

        this.saveCacheToStorage()
      } catch (error) {
        console.warn('Failed to batch fetch users:', error)
        // Use UIDs as fallback for failed fetches
        for (const uid of uncachedUids) {
          if (!result[uid]) {
            result[uid] = uid
          }
        }
      }
    }

    return result
  }

  /**
   * Clear cache (useful on logout)
   */
  static clearCache(): void {
    this.cache.clear()
    this.cacheTimestamp = 0
    localStorage.removeItem(this.CACHE_KEY)

    // Also clear provisioning cookies
    ProvisioningCache.clearAllProvisioningCache()
  }

  /**
   * Force re-provisioning for a specific user (clears cache)
   * Useful for testing or when user data might be stale
   */
  static forceReprovisionUser(uid: string): void {
    // Clear from display name cache
    this.cache.delete(uid)
    this.saveCacheToStorage()

    // Clear provisioning cookie
    ProvisioningCache.clearUserProvisioning(uid)

    console.debug(`Forced reprovisioning for user ${uid}`)
  }

  /**
   * Debug helpers for development
   */
  static debug = {
    /**
     * Check if a user is marked as provisioned
     */
    isUserProvisioned: (uid: string) => ProvisioningCache.isUserProvisioned(uid),

    /**
     * List all provisioning cookies
     */
    listProvisioningCookies: () => ProvisioningCache.debugListProvisioningCookies(),

    /**
     * Get current cache state
     */
    getCacheState: () => ({
      size: UserDirectory.cache.size,
      timestamp: UserDirectory.cacheTimestamp,
      isValid: UserDirectory.isCacheValid(),
      entries: Object.fromEntries(UserDirectory.cache.entries())
    })
  }

  /**
   * Call the backend provision function
   */
  private static async callProvisionFunction(
    request: ProvisionUserRequest
  ): Promise<ProvisionUserResponse> {
    const functions = getFunctions(app, FIREBASE_REGION)
    const provisionFn = httpsCallable<ProvisionUserRequest, any>(functions, 'provisionUserFn')

    const result = await provisionFn(request)
    console.log('FN > RESULT', result.data.result as ProvisionUserResponse)
    return result.data.result
  }

  /**
   * Check if cache is still valid
   */
  private static isCacheValid(): boolean {
    return this.cacheTimestamp > 0 && Date.now() - this.cacheTimestamp < this.CACHE_DURATION
  }

  /**
   * Load cache from localStorage
   */
  private static loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.timestamp && Date.now() - data.timestamp < this.CACHE_DURATION) {
          this.cache = new Map(Object.entries(data.users))
          this.cacheTimestamp = data.timestamp
        }
      }
    } catch (error) {
      console.warn('Failed to load user cache from storage:', error)
    }
  }

  /**
   * Save cache to localStorage
   */
  private static saveCacheToStorage(): void {
    try {
      const data = {
        timestamp: Date.now(),
        users: Object.fromEntries(this.cache.entries())
      }
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data))
      this.cacheTimestamp = data.timestamp
    } catch (error) {
      console.warn('Failed to save user cache to storage:', error)
    }
  }
}
