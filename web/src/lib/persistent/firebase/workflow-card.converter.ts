import type { IWorkflowCardEntry } from '$lib/models/interface'
import type { FirestoreDataConverter } from 'firebase/firestore/lite'

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
