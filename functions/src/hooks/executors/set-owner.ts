import type { IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'
import type { Firestore } from 'firebase-admin/firestore'
import { AActionExecutor } from './base'
import { paths } from '@cadence/shared/models'

/**
 * Action runner for set an owner to the given card.
 */
export class SetOwnerActionExecutor extends AActionExecutor<'set-owner'> {
  constructor(public readonly firestore: Firestore) {
    super('set-owner')
  }

  async onExecute(
    cardContext: IWorkflowCard,
    action: Extract<IActionDefiniton, { kind: 'set-owner' }>
  ): Promise<void> {
    const docRef = this.firestore.doc(
      paths.WORKFLOW_CARD(cardContext.workflowId, cardContext.workflowCardId)
    )

    await docRef.set({ owner: action.to }, { merge: true })
  }
}
