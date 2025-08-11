export type APIClientConfig = Partial<{
  projectId: string
  region: string
  baseUrl: string
  timeout: number
}>

export interface AuthContext {
  uid: string
  email: string | undefined
  token: string
}

export interface EndpointConfig {
  path: string
  requiresAuth: boolean
  timeout?: number
}
