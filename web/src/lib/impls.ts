import type { IAuthenticationProvider } from './authentication/interface'
import type { IWorkflowConfigurationStorage } from './persistent/interface'

import { FirebaseAuthenticationProvider } from './authentication/firebase/firebase-authen'
import { FirestoreWorkflowCardStorage } from './persistent/firebase/firestore'
import { WorkflowFactory } from './workflow/factory'
import { BuildTimeWorkflows } from './persistent/files/build-time-workflows'
import LeadToProposalWorkflow from './persistent/files/defined/lead-to-proposal.workflow'

export interface Impls {
  authProvider: IAuthenticationProvider
  configurationStore: IWorkflowConfigurationStorage
  workflowEngineFactory: WorkflowFactory
}

// This is where we choose out implementations
export const impls: Impls = (() => {
  const authProvider = FirebaseAuthenticationProvider.shared()
  const firestore = FirestoreWorkflowCardStorage.shared()
  const configurationStore: IWorkflowConfigurationStorage = new BuildTimeWorkflows(
    [LeadToProposalWorkflow],
    authProvider
  )
  const workflowEngineFactory = WorkflowFactory.use(firestore, configurationStore, authProvider)
  return {
    authProvider,
    configurationStore,
    workflowEngineFactory
  }
})()
