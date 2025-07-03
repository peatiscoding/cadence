import type { IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'
import { AActionExecutor } from './base'

/**
 * Action runner for sending a webhook requests
 */
export class SendWebhookActionExecutor extends AActionExecutor<'send-webhook'> {
  onExecute(
    cardContext: IWorkflowCard,
    action: Extract<IActionDefiniton, { kind: 'send-webhook' }>
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
