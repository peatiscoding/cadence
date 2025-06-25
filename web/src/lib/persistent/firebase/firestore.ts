import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { IWorkflowCardStorage, IWorkflowConfigurationStorage } from '../interface'
import type { Configuration } from '$lib/schema'

import {
  getFirestore,
  doc,
  collection,
  Firestore,
  addDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore/lite'
import { app } from './app'
import { USE_SERVER_TIMESTAMP } from '../constant'
import { workflowCardConverter } from './workflow-card.converter'
import { workflowConfigurationConverter } from './workflow-configuration.converter'

const REFs = {
  WORKFLOWS: (fs: Firestore) => collection(fs, `workflows`),
  WORKFLOW_CONFIGURATION: (fs: Firestore, workflowId: string) =>
    doc(REFs.WORKFLOWS(fs), workflowId).withConverter(workflowConfigurationConverter),
  WORKFLOW_CARDS: (fs: Firestore, workflowId: string) =>
    collection(REFs.WORKFLOW_CONFIGURATION(fs, workflowId), `cards`),
  WORKFLOW_CARD: (fs: Firestore, workflowId: string, workflowCardId: string) =>
    doc(REFs.WORKFLOW_CARDS(fs, workflowId), workflowCardId).withConverter(workflowCardConverter)
}

export class FirestoreWorkflowCardStorage
  implements IWorkflowCardStorage, IWorkflowConfigurationStorage
{
  public static shared(): IWorkflowCardStorage & IWorkflowConfigurationStorage {
    const db = getFirestore(app)
    return new FirestoreWorkflowCardStorage(db)
  }

  //
  private constructor(private readonly fs: Firestore) {}

  async createCard(workflowId: string, author: string, payload: any): Promise<string> {
    const res = await addDoc(REFs.WORKFLOW_CARDS(this.fs, workflowId), {
      ...payload,
      statusSince: serverTimestamp(),
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
    payload: Record<string, string | number | typeof USE_SERVER_TIMESTAMP>
  ): Promise<void> {
    const updated: any = {
      ...payload,
      updatedBy: author,
      updatedAt: serverTimestamp()
    }
    Object.keys(payload).forEach((k) => {
      if (updated[k] === USE_SERVER_TIMESTAMP) {
        updated[k] = serverTimestamp()
      }
    })

    await updateDoc(REFs.WORKFLOW_CARD(this.fs, workflowId, workflowCardId), updated)
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

  async deleteCard(workflowId: string, workflowCardId: string): Promise<void> {
    const ref = REFs.WORKFLOW_CARD(this.fs, workflowId, workflowCardId)
    await deleteDoc(ref)
  }

  async loadConfig(workflowId: string): Promise<Configuration> {
    const ref = REFs.WORKFLOW_CONFIGURATION(this.fs, workflowId)
    const docSnap = await getDoc(ref)
    if (docSnap.exists()) {
      const config = docSnap.data()
      // Set the workflowId which couldn't be set in the converter
      return config
    }
    throw new Error(`Unable to retrieve configuration ${workflowId}`)
  }
}
