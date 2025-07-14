import type {
  WorkflowConfiguration,
  IWorkflowCardEntry,
  ITransitWorkflowItemRequest,
  ITransitWorkflowItemResponse,
  ActivityLog
} from '@cadence/shared/types'
import type { ILiveUpdateChange, ILiveUpdateListenerBuilder } from '$lib/models/live-update'
import type {
  IWorkflowCardStorage,
  IWorkflowConfigurationDynamicStorage,
  IActivityStorage
} from '../interface'

import {
  type Firestore,
  getFirestore,
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  serverTimestamp,
  query,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore'

import { getFunctions, httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions'
import { WORKFLOWS, CARDS, ACTIVITIES, FIREBASE_REGION } from '@cadence/shared/models/firestore'
import { app } from '../../firebase-app'
import { USE_SERVER_TIMESTAMP } from '../constant'
import { workflowCardConverter } from './workflow-card.converter'
import { workflowConfigurationConverter } from './workflow-configuration.converter'

export class FirestoreWorkflowCardStorage
  implements IWorkflowCardStorage, IWorkflowConfigurationDynamicStorage, IActivityStorage
{
  public static shared(
    collectionKeys: { WORKFLOWS: string; CARDS: string; ACTIVITIES: string } = {
      WORKFLOWS,
      CARDS,
      ACTIVITIES
    }
  ): IWorkflowCardStorage & IWorkflowConfigurationDynamicStorage & IActivityStorage {
    const db = getFirestore(app)
    const fns = getFunctions(app, FIREBASE_REGION)
    return new FirestoreWorkflowCardStorage(db, fns, collectionKeys)
  }

  private get rf() {
    const { WORKFLOWS: PATH_WORKFLOWS, CARDS: PATH_CARDS } = this.collectionKeys
    return {
      WORKFLOWS: (fs: Firestore) => collection(fs, PATH_WORKFLOWS),
      WORKFLOW_CONFIGURATION: (fs: Firestore, workflowId: string) =>
        doc(fs, `${PATH_WORKFLOWS}/${workflowId}`).withConverter(workflowConfigurationConverter),
      WORKFLOW_CARDS: (fs: Firestore, workflowId: string) =>
        collection(fs, `${PATH_WORKFLOWS}/${workflowId}/${PATH_CARDS}`),
      WORKFLOW_CARD: (fs: Firestore, workflowId: string, workflowCardId: string) =>
        doc(fs, `${PATH_WORKFLOWS}/${workflowId}/${PATH_CARDS}/${workflowCardId}`).withConverter(
          workflowCardConverter
        ),
      ACTIVITIES: (fs: Firestore) => collection(fs, this.collectionKeys.ACTIVITIES)
    }
  }

  //
  private constructor(
    private readonly fs: Firestore,
    private readonly fns: Functions,
    public collectionKeys: { WORKFLOWS: string; CARDS: string; ACTIVITIES: string }
  ) {}

  isSupportDynamicWorkflows(): boolean {
    return true
  }

  async createCard(workflowId: string, author: string, payload: any): Promise<string> {
    const res = await addDoc(this.rf.WORKFLOW_CARDS(this.fs, workflowId), {
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

    await updateDoc(this.rf.WORKFLOW_CARD(this.fs, workflowId, workflowCardId), updated)
  }

  async transitCard(workflowId: string, workflowCardId: string, payload: any): Promise<void> {
    // transitFn
    const fn = this.getFirebaseTransitFn()
    const res = await fn({
      destinationContext: {
        ...payload,
        workflowId,
        workflowCardId
      }
    })
    console.info('TRANSITION RESULT:', res)
  }

  async getCard(workflowId: string, workflowCardId: string): Promise<IWorkflowCardEntry> {
    const ref = this.rf.WORKFLOW_CARD(this.fs, workflowId, workflowCardId)
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
    const q = query(
      this.rf.WORKFLOW_CARDS(this.fs, workflowId).withConverter(workflowCardConverter)
    )
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
    const ref = this.rf.WORKFLOW_CARD(this.fs, workflowId, workflowCardId)
    await deleteDoc(ref)
  }

  async loadConfig(workflowId: string): Promise<WorkflowConfiguration> {
    const ref = this.rf.WORKFLOW_CONFIGURATION(this.fs, workflowId)
    const docSnap = await getDoc(ref)
    if (docSnap.exists()) {
      const config = docSnap.data()
      // Set the workflowId which couldn't be set in the converter
      return config
    }
    throw new Error(`Unable to retrieve configuration ${workflowId}`)
  }

  async setConfig(workflowId: string, configuration: WorkflowConfiguration): Promise<void> {
    const ref = this.rf.WORKFLOW_CONFIGURATION(this.fs, workflowId)
    await setDoc(ref, configuration, { merge: true })
  }

  async listWorkflows(): Promise<{
    workflows: Array<WorkflowConfiguration & { workflowId: string }>
  }> {
    const workflowsRef = this.rf.WORKFLOWS(this.fs)
    const querySnapshot = await getDocs(workflowsRef)

    const workflows: Array<WorkflowConfiguration & { workflowId: string }> = []

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
        const ref = this.rf.WORKFLOW_CONFIGURATION(this.fs, workflowId)
        await deleteDoc(ref)
      })
    )
  }

  listenForRecentActivities(limitCount: number = 5): ILiveUpdateListenerBuilder<ActivityLog> {
    const q = query(this.rf.ACTIVITIES(this.fs), orderBy('timestamp', 'desc'), limit(limitCount))
    let observer: (changes: ILiveUpdateChange<ActivityLog>[]) => any

    const o: ILiveUpdateListenerBuilder<ActivityLog> = {
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
            changes.docChanges().map((c): ILiveUpdateChange<ActivityLog> => {
              return {
                type: c.type,
                data: c.doc.data() as ActivityLog
              }
            })
          )
        })
        return () => unsubscribe()
      }
    }
    return o
  }

  // ------------------------------- PRIVATE ------------------------------------ //

  private getFirebaseTransitFn(): HttpsCallable<
    ITransitWorkflowItemRequest,
    ITransitWorkflowItemResponse
  > {
    const transitFn = httpsCallable<ITransitWorkflowItemRequest, ITransitWorkflowItemResponse>(
      this.fns,
      'transitWorkflowItemFn'
    )
    return transitFn
  }
}
