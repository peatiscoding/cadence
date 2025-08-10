import type {
  WorkflowConfiguration,
  IWorkflowCardEntry,
  ITransitWorkflowItemRequest,
  ITransitWorkflowItemResponse,
  ActivityLog,
  StatusStats
} from '@cadence/shared/types'
import type { ILiveUpdateChange, ILiveUpdateListenerBuilder } from '$lib/models/live-update'
import type {
  IWorkflowCardStorage,
  IWorkflowConfigurationDynamicStorage,
  IActivityStorage,
  IStatsStorage
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

import { CadenceAPIClient } from '@cadence/api-client'
import { getAuth } from 'firebase/auth'
import {
  WORKFLOWS,
  CARDS,
  STATS,
  PER_STATUS,
  ACTIVITIES,
  FIREBASE_REGION
} from '@cadence/shared/models/firestore'
import { app } from '../../firebase-app'
import { USE_SERVER_TIMESTAMP } from '../constant'
import { workflowCardConverter } from './workflow-card.converter'
import { workflowConfigurationConverter } from './workflow-configuration.converter'

interface ICollectionKeys {
  WORKFLOWS: string
  CARDS: string
  ACTIVITIES: string
  STATS: string
  PER_STATUS: string
}

export class FirestoreWorkflowCardStorage
  implements
    IWorkflowCardStorage,
    IWorkflowConfigurationDynamicStorage,
    IActivityStorage,
    IStatsStorage
{
  public static shared(
    collectionKeys: ICollectionKeys = {
      WORKFLOWS,
      CARDS,
      ACTIVITIES,
      STATS,
      PER_STATUS
    }
  ): IWorkflowCardStorage &
    IWorkflowConfigurationDynamicStorage &
    IActivityStorage &
    IStatsStorage {
    const db = getFirestore(app)
    return new FirestoreWorkflowCardStorage(db, collectionKeys)
  }

  /**
   * Reference maker
   */
  private get rf() {
    const {
      WORKFLOWS: PATH_WORKFLOWS,
      CARDS: PATH_CARDS,
      STATS: PATH_STATS,
      PER_STATUS: PATH_PER_STATUS
    } = this.collectionKeys
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
      ACTIVITIES: (fs: Firestore) => collection(fs, this.collectionKeys.ACTIVITIES),
      STATS_PER_STATUSES: (fs: Firestore, workflowId: string) =>
        collection(fs, `${PATH_STATS}/${workflowId}/${PATH_PER_STATUS}`),
      STATS_PER_STATUS: (fs: Firestore, workflowId: string, status: string) =>
        doc(fs, `${PATH_STATS}/${workflowId}/${PATH_PER_STATUS}/${status}`)
    }
  }

  //
  private constructor(
    private readonly fs: Firestore,
    public readonly collectionKeys: ICollectionKeys
  ) {}

  isSupportDynamicWorkflows(): boolean {
    return true
  }

  async createCard(workflowId: string, author: string, payload: any): Promise<string> {
    // Use API client to create card instead of direct Firestore access
    const auth = getAuth()
    const client = new CadenceAPIClient({}, auth)
    
    const result = await client.createCard({
      workflowId,
      payload
    })
    
    return result.cardId
  }

  async createCardWithId(
    workflowId: string,
    cardId: string,
    author: string,
    payload: any
  ): Promise<string> {
    // Use API client to create card with specific ID
    const auth = getAuth()
    const client = new CadenceAPIClient({}, auth)
    
    const result = await client.createCard({
      workflowId,
      cardId,
      payload
    })
    
    return result.cardId
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
    // Use API client for transit instead of direct onCall
    const auth = getAuth()
    const client = new CadenceAPIClient({}, auth)
    
    const res = await client.transitWorkflowItem({
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
    const transformers: ((
      change: ILiveUpdateChange<IWorkflowCardEntry>
    ) => ILiveUpdateChange<IWorkflowCardEntry>)[] = []
    const applyTransformers = (
      change: ILiveUpdateChange<IWorkflowCardEntry>
    ): ILiveUpdateChange<any> => {
      let c = change
      for (const trans of transformers) {
        c = trans(c)
      }
      return c
    }
    //
    const o: ILiveUpdateListenerBuilder<IWorkflowCardEntry> = {
      map: (transformer) => {
        transformers.push(transformer as any)
        return o as any
      },
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
              return applyTransformers({
                type: c.type,
                data: convertedData
              })
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
    const transformers: ((
      change: ILiveUpdateChange<ActivityLog>
    ) => ILiveUpdateChange<ActivityLog>)[] = []
    const applyTransformers = (change: ILiveUpdateChange<ActivityLog>): ILiveUpdateChange<any> => {
      let c = change
      for (const trans of transformers) {
        c = trans(c)
      }
      return c
    }

    const o: ILiveUpdateListenerBuilder<ActivityLog> = {
      map: (transformer) => {
        transformers.push(transformer as any)
        return o as any
      },
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
              return applyTransformers({
                type: c.type,
                data: c.doc.data() as ActivityLog
              })
            })
          )
        })
        return () => unsubscribe()
      }
    }
    return o
  }

  /**
   *  Query workflow stats (raw objects) from Persistent storage
   *
   *  @returns all available StatusStats per 'status'
   */
  async getWorkflowStats(workflowId: string): Promise<Record<string, StatusStats | null>> {
    const statsCollection = this.rf.STATS_PER_STATUSES(this.fs, workflowId)
    const snapshot = await getDocs(statsCollection)

    const stats: Record<string, StatusStats | null> = {}
    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data) {
        stats[doc.id] = data as StatusStats
      } else {
        stats[doc.id] = null
      }
    })

    return stats
  }

  async getAllWorkflowStats(
    workflowIds: string[]
  ): Promise<Record<string, Record<string, StatusStats | null>>> {
    const allStats: Record<string, Record<string, StatusStats | null>> = {}

    // Fetch stats for each workflow in parallel
    await Promise.all(
      workflowIds.map(async (workflowId) => {
        try {
          allStats[workflowId] = await this.getWorkflowStats(workflowId)
        } catch (error) {
          console.warn(`Failed to fetch stats for workflow ${workflowId}:`, error)
          allStats[workflowId] = {}
        }
      })
    )

    return allStats
  }

  // ------------------------------- PRIVATE ------------------------------------ //
}
