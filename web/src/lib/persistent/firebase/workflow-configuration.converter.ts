import type { WorkflowConfiguration } from '@cadence/shared/types'
import type { FirestoreDataConverter } from 'firebase/firestore'

// Firestore data converter for IWorkflowCardEntry
export const workflowConfigurationConverter: FirestoreDataConverter<WorkflowConfiguration> = {
  toFirestore(conf: WorkflowConfiguration): any {
    return conf
  },
  fromFirestore(snapshot): WorkflowConfiguration {
    const _d = snapshot.data()
    return {
      name: _d.name,
      description: _d.description,
      statuses: _d.statuses,
      fields: _d.fields,
      types: _d.types || []
    }
  }
}
