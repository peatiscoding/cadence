import type { FirebaseApp } from 'firebase/app'
import type { IAuthenticationProvider, ICurrentSession } from '../interface'
import {
  type Auth,
  type User,
  getAuth,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth'

import { app } from '../../firebase-app'

const _helpers = {
  mapFirebaseUserToSession(user: User): ICurrentSession {
    return {
      uid: user.uid,
      displayName: user.displayName || 'Unknown User',
      email: user.email || '',
      avatarUrl: user.photoURL || ''
    }
  }
}

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

  async getCurrentSession(): Promise<ICurrentSession> {
    if (this.auth.currentUser) {
      return _helpers.mapFirebaseUserToSession(this.auth.currentUser)
    }
    throw new Error(`Session cannot be retrieved`)
  }

  async login(): Promise<void> {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(this.auth, provider)
  }

  async logout(): Promise<void> {
    return signOut(this.auth)
  }

  onAuthStateChanged(callback: (user: ICurrentSession | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => {
      if (user && user.uid) {
        callback(_helpers.mapFirebaseUserToSession(user))
      } else {
        callback(null)
      }
    })
  }
}
