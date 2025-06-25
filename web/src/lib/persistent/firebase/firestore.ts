import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { IWorkflowCardStorage } from '../interface'

import {
  type FirestoreDataConverter,
  getFirestore,
  doc,
  collection,
  Firestore,
  addDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore/lite'
import { app } from './app'

// Firestore data converter for IWorkflowCardEntry
const workflowCardConverter: FirestoreDataConverter<IWorkflowCardEntry> = {
  toFirestore(card: IWorkflowCardEntry): any {
    return {
      title: card.title,
      description: card.description,
      owner: card.owner,
      status: card.status,
      statusSince: card.statusSince,
      type: card.type,
      value: card.value,
      createdBy: card.createdBy,
      createdAt: card.updatedAt,
      updatedBy: card.updatedBy,
      updatedAt: card.updatedAt,
      fieldData: card.fieldData
    }
  },
  fromFirestore(snapshot): IWorkflowCardEntry {
    const data = snapshot.data()
    return {
      workflowId: '', // Will be set by the calling method
      workflowCardId: snapshot.id,
      title: data.title || '',
      description: data.description || '',
      owner: data.owner || '',
      status: data.status || '',
      statusSince: (data.statusSince?.toDate() || new Date()).getTime(),
      fieldData: data.fieldData || {},
      type: data.type || '',
      value: data.value || 0,
      createdAt: (data.createdAt?.toDate() || new Date()).getTime(),
      createdBy: data.createdBy || '',
      updatedAt: (data.updatedAt?.toDate() || new Date()).getTime(),
      updatedBy: data.updatedBy || ''
    }
  }
}

const REFs = {
  WORKFLOWS: (fs: Firestore) => collection(fs, `workflows`),
  WORKFLOW: (fs: Firestore, workflowId: string) => doc(REFs.WORKFLOWS(fs), workflowId),
  WORKFLOW_CARDS: (fs: Firestore, workflowId: string) =>
    collection(REFs.WORKFLOW(fs, workflowId), `cards`),
  WORKFLOW_CARD: (fs: Firestore, workflowId: string, workflowCardId: string) =>
    doc(REFs.WORKFLOW_CARDS(fs, workflowId), workflowCardId).withConverter(workflowCardConverter)
}

export class FirestoreWorkflowCardStorage implements IWorkflowCardStorage {
  public static shared(): IWorkflowCardStorage {
    const db = getFirestore(app)
    return new FirestoreWorkflowCardStorage(db)
  }

  //
  private constructor(private readonly fs: Firestore) {}

  async createCard(workflowId: string, author: string, payload: any): Promise<string> {
    const res = await addDoc(REFs.WORKFLOW_CARDS(this.fs, workflowId), {
      ...payload,
      createdBy: author,
      createdAt: serverTimestamp(),
      updatedBy: author,
      updatedAt: serverTimestamp()
    })
    return res.id
  }

  async updateCard(
    workflowId: string,
    workflowCardId: string,
    author: string,
    payload: any
  ): Promise<void> {
    await setDoc(
      REFs.WORKFLOW_CARD(this.fs, workflowId, workflowCardId),
      {
        ...payload,
        updatedBy: author,
        updatedAt: serverTimestamp()
      },
      {
        merge: true
      }
    )
  }

  async getCard(workflowId: string, workflowCardId: string): Promise<IWorkflowCardEntry> {
    const ref = REFs.WORKFLOW_CARD(this.fs, workflowId, workflowCardId)
    const docSnap = await getDoc(ref)
    if (docSnap.exists()) {
      const card = docSnap.data()
      // Set the workflowId which couldn't be set in the converter
      card.workflowId = workflowId
      return card
    }
    throw new Error(`Unable to retrieve card ${workflowId}/${workflowCardId}`)
  }

  listCards(workflowId: string): (onDataChanges: IWorkflowCardEntry[]) => void {
    throw new Error('Method not implemented.')
  }
}
