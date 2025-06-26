import type { FirebaseApp } from 'firebase/app'
import type { IAuthenticationProvider } from '../interface'
import {
  type Auth,
  getAuth,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth'

import { app } from '../../firebase-app'

export class FirebaseAuthenticationProvider implements IAuthenticationProvider {
  public static shared(): IAuthenticationProvider {
    return new FirebaseAuthenticationProvider(app)
  }

  private auth: Auth

  constructor(app: FirebaseApp) {
    this.auth = getAuth(app)
  }

  async getCurrentUid(): Promise<string> {
    if (this.auth.currentUser && this.auth.currentUser.uid) {
      return this.auth.currentUser.uid
    }
    throw new Error(`UID cannot be retreived`)
  }

  async login(): Promise<void> {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(this.auth, provider)
  }

  async logout(): Promise<void> {
    return signOut(this.auth)
  }

  onAuthStateChanged(callback: (user: { uid: string } | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => {
      if (user && user.uid) {
        callback({ uid: user.uid })
      } else {
        callback(null)
      }
    })
  }
}
