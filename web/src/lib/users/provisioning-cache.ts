/**
 * User Provisioning Cache - Cookie-based caching to prevent unnecessary server calls
 *
 * Uses first-party cookies to track which users have already been provisioned on the server,
 * avoiding redundant calls to provisionUserFn.
 */

export class ProvisioningCache {
  private static readonly COOKIE_PREFIX = 'cadence_user_provisioned_'
  private static readonly COOKIE_EXPIRY_DAYS = 30 // 1 month

  /**
   * Check if a user has been provisioned (cached in cookie)
   */
  static isUserProvisioned(uid: string): boolean {
    if (typeof document === 'undefined') {
      // Server-side rendering - always assume not provisioned
      return false
    }

    const cookieName = this.getCookieName(uid)
    return this.getCookie(cookieName) === 'true'
  }

  /**
   * Mark a user as provisioned (set cookie)
   */
  static markUserProvisioned(uid: string): void {
    if (typeof document === 'undefined') {
      // Server-side rendering - can't set cookies
      return
    }

    const cookieName = this.getCookieName(uid)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + this.COOKIE_EXPIRY_DAYS)

    // Set secure cookie (only use Secure flag in production)
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''
    const cookieValue = `${cookieName}=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict${secureFlag}`
    document.cookie = cookieValue

    console.debug(`Marked user ${uid} as provisioned (expires: ${expiryDate.toISOString()})`)
  }

  /**
   * Clear provisioning status for a user (remove cookie)
   * Useful when user logs out or switches accounts
   */
  static clearUserProvisioning(uid: string): void {
    if (typeof document === 'undefined') {
      return
    }

    const cookieName = this.getCookieName(uid)
    // Set cookie with past expiry date to delete it
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${secureFlag}`

    console.debug(`Cleared provisioning cache for user ${uid}`)
  }

  /**
   * Clear all provisioning cookies (useful on logout)
   */
  static clearAllProvisioningCache(): void {
    if (typeof document === 'undefined') {
      return
    }

    // Get all cookies and find provisioning cookies
    const cookies = document.cookie.split(';')

    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''

    for (const cookie of cookies) {
      const cookieName = cookie.split('=')[0].trim()
      if (cookieName.startsWith(this.COOKIE_PREFIX)) {
        // Delete this provisioning cookie
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${secureFlag}`
      }
    }

    console.debug('Cleared all provisioning cache cookies')
  }

  /**
   * Get cookie name for a specific user
   */
  private static getCookieName(uid: string): string {
    // Use a hash of the UID to avoid potential issues with special characters
    // For simplicity, we'll use a basic encoding that's URL-safe
    const encodedUid = btoa(uid).replace(/[+/=]/g, (char) => {
      switch (char) {
        case '+':
          return '-'
        case '/':
          return '_'
        case '=':
          return ''
        default:
          return char
      }
    })

    return `${this.COOKIE_PREFIX}${encodedUid}`
  }

  /**
   * Get cookie value by name
   */
  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
      return null
    }

    const cookies = document.cookie.split(';')

    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.split('=').map((s) => s.trim())
      if (cookieName === name) {
        return cookieValue || null
      }
    }

    return null
  }

  /**
   * Debug helper: List all provisioning cookies
   */
  static debugListProvisioningCookies(): string[] {
    if (typeof document === 'undefined') {
      return []
    }

    const cookies = document.cookie.split(';')
    const provisioningCookies: string[] = []

    for (const cookie of cookies) {
      const cookieName = cookie.split('=')[0].trim()
      if (cookieName.startsWith(this.COOKIE_PREFIX)) {
        provisioningCookies.push(cookie.trim())
      }
    }

    return provisioningCookies
  }
}

