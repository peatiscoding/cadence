import type { IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'
import { AActionExecutor } from './base'

/**
 * Action runner for sending emails
 */
export class SendEmailActionExecutor extends AActionExecutor<'send-email'> {
  onExecute(
    cardContext: IWorkflowCard,
    action: Extract<IActionDefiniton, { kind: 'send-email' }>
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
