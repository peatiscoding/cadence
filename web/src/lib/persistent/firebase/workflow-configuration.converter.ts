import type { WorkflowConfiguration } from '@cadence/shared/types'
import { ConfigurationSchema } from '@cadence/shared/validation'
import type { FirestoreDataConverter } from 'firebase/firestore'

// Firestore data converter for WorkflowConfiguration
export const workflowConfigurationConverter: FirestoreDataConverter<WorkflowConfiguration> = {
  toFirestore(conf: WorkflowConfiguration): any {
    return conf
  },
  fromFirestore(snapshot): WorkflowConfiguration {
    const _d = snapshot.data()
    // Use Zod schema to parse and apply defaults
    return ConfigurationSchema.parse(_d)
  }
}
