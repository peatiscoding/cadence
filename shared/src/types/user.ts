import type { Timestamp } from 'firebase-admin/firestore'
// User management types
export interface UserInfo {
  uid: string
  email: string
  displayName: string
  role: 'user' | 'admin'
  createdAt: Timestamp
  lastUpdated: Timestamp
}
