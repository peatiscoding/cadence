import type { Configuration } from '$lib/schema'
import type { FirestoreDataConverter } from 'firebase/firestore'

// Firestore data converter for IWorkflowCardEntry
export const workflowConfigurationConverter: FirestoreDataConverter<Configuration> = {
  toFirestore(conf: Configuration): any {
    return conf
  },
  fromFirestore(snapshot): Configuration {
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
