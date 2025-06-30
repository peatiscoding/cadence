import type { IAuthenticationProvider } from './authentication/interface'
import type { IWorkflowConfigurationStorage } from './persistent/interface'

import { FirebaseAuthenticationProvider } from './authentication/firebase/firebase-authen'
import { FirestoreWorkflowCardStorage } from './persistent/firebase/firestore'
import { WorkflowFactory } from './workflow/factory'
import { BuildTimeWorkflows } from './persistent/files/build-time-workflows'

export interface Impls {
  authProvider: IAuthenticationProvider
  configurationStore: IWorkflowConfigurationStorage
  workflowEngineFactory: WorkflowFactory
}

// This is where we choose out implementations
export const impls: Impls = (() => {
  const firestore = FirestoreWorkflowCardStorage.shared()
  const authProvider = FirebaseAuthenticationProvider.shared()
  const configurationStore: IWorkflowConfigurationStorage = new BuildTimeWorkflows([])
  const workflowEngineFactory = WorkflowFactory.use(firestore, configurationStore, authProvider)
  return {
    authProvider,
    configurationStore,
    workflowEngineFactory
  }
})()
