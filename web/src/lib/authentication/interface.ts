export interface IAuthenticationProvider {
  /**
   * Get Current UserId
   */
  getCurrentUid(): Promise<string>
  /**
   * Logout
   */
  logout(): Promise<void>
}
