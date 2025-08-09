import type { IWorkflowCardEntry, WorkflowConfiguration } from '@cadence/shared/types'
import type { FirestoreDataConverter } from 'firebase/firestore'

// Firestore data converter for IWorkflowCardEntry
export const workflowCardConverter: FirestoreDataConverter<IWorkflowCardEntry> = {
  toFirestore(card: IWorkflowCardEntry): any {
    return card
  },
  fromFirestore(snapshot): IWorkflowCardEntry {
    const _d = snapshot.data()
    return {
      workflowId: '', // Will be set by the calling method
      workflowCardId: snapshot.id,
      title: _d.title || '',
      description: _d.description || '',
      owner: _d.owner || '',
      status: _d.status || '',
      fieldData: _d.fieldData || {},
      type: _d.type || '',
      value: _d.value || 0,
      createdAt: (_d.createdAt?.toDate() || new Date()).getTime(),
      createdBy: _d.createdBy || '',
      updatedAt: (_d.updatedAt?.toDate() || new Date()).getTime(),
      updatedBy: _d.updatedBy || '',
      statusSince: ((_d.statusSince && _d.statusSince.toDate()) || new Date()).getTime()
    }
  }
}

// Factory function to create converter with workflow configuration
export function createWorkflowCardConverter(
  config: WorkflowConfiguration
): FirestoreDataConverter<IWorkflowCardEntry> {
  return {
    toFirestore(card: IWorkflowCardEntry): any {
      return card
    },
    fromFirestore(snapshot): IWorkflowCardEntry {
      const _d = snapshot.data()
      const fieldData = _d.fieldData || {}

      // Find identifier field and populate it with document ID
      const identifierField = config.fields.find(
        (field) => field.schema.kind === 'text' && field.schema.asDocumentId === true
      )

      if (identifierField) {
        fieldData[identifierField.slug] = snapshot.id
      }

      return {
        workflowId: '', // Will be set by the calling method
        workflowCardId: snapshot.id,
        title: _d.title || '',
        description: _d.description || '',
        owner: _d.owner || '',
        status: _d.status || '',
        fieldData,
        type: _d.type || '',
        value: _d.value || 0,
        createdAt: (_d.createdAt?.toDate() || new Date()).getTime(),
        createdBy: _d.createdBy || '',
        updatedAt: (_d.updatedAt?.toDate() || new Date()).getTime(),
        updatedBy: _d.updatedBy || '',
        statusSince: ((_d.statusSince && _d.statusSince.toDate()) || new Date()).getTime()
      }
    }
  }
}
