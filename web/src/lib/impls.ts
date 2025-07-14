import type { IAuthenticationProvider } from './authentication/interface'
import type { IWorkflowConfigurationStorage, IWorkflowCardStorage, IActivityStorage } from './persistent/interface'

import { FirebaseAuthenticationProvider } from './authentication/firebase/firebase-authen'
import { FirestoreWorkflowCardStorage } from './persistent/firebase/firestore'
import { WorkflowFactory } from './workflow/factory'
import { BuildTimeWorkflows } from './persistent/files/build-time-workflows'

import { supportedWorkflows } from '@cadence/shared/defined'

export interface Impls {
  authProvider: IAuthenticationProvider
  configurationStore: IWorkflowConfigurationStorage
  storage: IWorkflowCardStorage & IActivityStorage
  workflowEngineFactory: WorkflowFactory
}

// This is where we choose out implementations
export const impls: Impls = (() => {
  const authProvider = FirebaseAuthenticationProvider.shared()
  const firestore = FirestoreWorkflowCardStorage.shared()
  const configurationStore: IWorkflowConfigurationStorage = new BuildTimeWorkflows(
    supportedWorkflows,
    authProvider
  )
  const workflowEngineFactory = WorkflowFactory.use(firestore, configurationStore, authProvider)
  return {
    authProvider,
    configurationStore,
    storage: firestore,
    workflowEngineFactory
  }
})()
