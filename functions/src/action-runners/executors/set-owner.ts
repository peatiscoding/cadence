import type { IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'
import { AActionExecutor } from './base'

/**
 * Action runner for set an owner to the given card.
 */
export class SetOwnerActionExecutor extends AActionExecutor<'set-owner'> {
  onExecute(
    cardContext: IWorkflowCard,
    action: Extract<IActionDefiniton, { kind: 'set-owner' }>
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
