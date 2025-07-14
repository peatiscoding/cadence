export interface ICurrentSession {
  uid: string
  displayName: string
  email: string
  avatarUrl: string
}

export interface IAuthenticationProvider {
  /**
   * Get Current UserId
   */
  getCurrentUid(): Promise<string>
  /**
   * Get Current Session
   */
  getCurrentSession(): Promise<ICurrentSession>
  /**
   * Login with popup
   */
  login(): Promise<void>
  /**
   * Logout
   */
  logout(): Promise<void>
  /**
   * Current user (may be null)
   */
  currentUser: any | null
  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: ICurrentSession | null) => void): () => void
}
