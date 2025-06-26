export interface IAuthenticationProvider {
  getCurrentUid(): Promise<string>
}
