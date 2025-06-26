export interface IAuthenticationProvider {
  /**
   * Get Current UserId
   */
  getCurrentUid(): Promise<string>
  /**
   * Login with popup
   */
  login(): Promise<void>
  /**
   * Logout
   */
  logout(): Promise<void>
  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: { uid: string } | null) => void): () => void
}
