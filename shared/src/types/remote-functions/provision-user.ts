import type { UserInfo } from '../user'

export interface ProvisionUserRequest {
  // No additional parameters needed - uses authenticated user's UID
}

export interface ProvisionUserResponse {
  success: boolean
  userInfo: UserInfo
  wasCreated: boolean // true if user document was created, false if already existed
}
