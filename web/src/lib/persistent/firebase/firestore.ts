import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { IWorkflowCardStorage } from '../interface'

import { getFirestore, doc, collection, Firestore, addDoc, getDoc } from 'firebase/firestore/lite'
import { app } from './app'

const REFs = {
  WORKFLOWS: (fs: Firestore) => collection(fs, `workflows`),
  WORKFLOW: (fs: Firestore, workflowId: string) => doc(REFs.WORKFLOWS(fs), workflowId),
  WORKFLOW_CARDS: (fs: Firestore, workflowId: string) =>
    collection(REFs.WORKFLOW(fs, workflowId), `cards`),
  WORKFLOW_CARD: (fs: Firestore, workflowId: string, workflowCardId: string) =>
    doc(REFs.WORKFLOW_CARDS(fs, workflowId), workflowCardId)
}

export class FirestoreWorkflowCardStorage implements IWorkflowCardStorage {
  public shared(): IWorkflowCardStorage {
    const db = getFirestore(app)
    return new FirestoreWorkflowCardStorage(db)
  }

  //
  private constructor(private readonly fs: Firestore) {}

  async createCard(workflowId: string, payload: any): Promise<string> {
    const ref = REFs.WORKFLOW_CARDS(this.fs, workflowId)
    const res = await addDoc(ref, payload)
    return res.id
  }

  updateCard(workflowId: string, workflowCardId: string, payload: any): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async getCard(workflowId: string, workflowCardId: string): Promise<IWorkflowCardEntry> {
    const ref = REFs.WORKFLOW_CARD(this.fs, workflowId, workflowCardId)
    const doc = await getDoc(ref)
    if (doc.exists()) {
      //
      const data = doc.data()
      return {
        workflowId,
        workflowCardId,
        title: data.title,
        description: data.description,
        owner: data.owner,
        status: data.status,
        statusSince: data.statusSince,
        fieldData: {},
        type: data.type,
        value: data.value,
        createdAt: new Date().getTime(),
        createdBy: data.createdBy,
        updatedAt: new Date().getTime(),
        updatedBy: data.updatedBy
      }
    }
    throw new Error(`Unable to retrieve card ${workflowId}/${workflowCardId}`)
  }

  listCards(workflowId: string): (onDataChanges: IWorkflowCardEntry[]) => void {
    throw new Error('Method not implemented.')
  }
}
