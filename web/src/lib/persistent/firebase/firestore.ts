import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { ILiveUpdateChange, ILiveUpdateListenerBuilder } from '$lib/models/live-update'
import type { IWorkflowCardStorage, IWorkflowConfigurationDynamicStorage } from '../interface'
import type { Configuration } from '$lib/schema'

import {
  getFirestore,
  doc,
  collection,
  Firestore,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  serverTimestamp,
  query,
  onSnapshot
} from 'firebase/firestore'
import { app } from '../../firebase-app'
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
  implements IWorkflowCardStorage, IWorkflowConfigurationDynamicStorage
{
  public static shared(): IWorkflowCardStorage & IWorkflowConfigurationDynamicStorage {
    const db = getFirestore(app)
    return new FirestoreWorkflowCardStorage(db)
  }

  //
  private constructor(private readonly fs: Firestore) {}

  isSupportDynamicWorkflows(): boolean {
    return true
  }

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

  listenForCards(workflowId: string): ILiveUpdateListenerBuilder<IWorkflowCardEntry> {
    const q = query(REFs.WORKFLOW_CARDS(this.fs, workflowId).withConverter(workflowCardConverter))
    let observer: (changes: ILiveUpdateChange<IWorkflowCardEntry>[]) => any
    //
    const o: ILiveUpdateListenerBuilder<IWorkflowCardEntry> = {
      onDataChanges: (_ob) => {
        observer = _ob
        return o
      },
      listen() {
        if (!observer) {
          console.error('WARNING: OBSERVER IS NOT DEFINED', o)
        }
        const unsubscribe = onSnapshot(q, (changes) => {
          return observer(
            changes.docChanges().map((c): ILiveUpdateChange<IWorkflowCardEntry> => {
              const convertedData = c.doc.data()
              // Set the workflowId which couldn't be set in the converter
              convertedData.workflowId = workflowId
              return {
                type: c.type,
                data: convertedData
              }
            })
          )
        })
        return () => unsubscribe()
      }
    }
    return o
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

  async setConfig(workflowId: string, configuration: Configuration): Promise<void> {
    const ref = REFs.WORKFLOW_CONFIGURATION(this.fs, workflowId)
    await setDoc(ref, configuration, { merge: true })
  }

  async listWorkflows(): Promise<{ workflows: Array<Configuration & { workflowId: string }> }> {
    const workflowsRef = REFs.WORKFLOWS(this.fs)
    const querySnapshot = await getDocs(workflowsRef)

    const workflows: Array<Configuration & { workflowId: string }> = []

    querySnapshot.forEach((doc) => {
      if (doc.exists()) {
        // Convert the document data to Configuration using the converter
        const configData = workflowConfigurationConverter.fromFirestore(doc)

        workflows.push({
          ...configData,
          workflowId: doc.id
        })
      }
    })

    return { workflows }
  }

  async deleteConfig(firstWorkflowId: string, ...otherWorkflowIds: string[]): Promise<void> {
    const allWorkflowIds = [firstWorkflowId, ...otherWorkflowIds]

    // Delete all workflow configurations in parallel
    await Promise.all(
      allWorkflowIds.map(async (workflowId) => {
        const ref = REFs.WORKFLOW_CONFIGURATION(this.fs, workflowId)
        await deleteDoc(ref)
      })
    )
  }
}
