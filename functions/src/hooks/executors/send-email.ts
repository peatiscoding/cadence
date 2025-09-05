import type { IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'
import { withContext } from '@cadence/shared/utils'
import { AActionExecutor } from './base'
import type { EmailMessage } from '../../email'
import type { EmailSenderFactory } from '../../email/factory'
import type { EmailSender } from '../../email/senders/base'

/**
 * Action runner for sending emails
 * Uses the EmailSender system to send emails through various providers
 */
export class SendEmailActionExecutor extends AActionExecutor<'send-email'> {
  constructor(protected readonly senders: EmailSenderFactory) {
    super('send-email')
  }

  async onExecute(
    cardContext: IWorkflowCard,
    action: Extract<IActionDefiniton, { kind: 'send-email' }>
  ): Promise<void> {
    let sender: EmailSender<any> | undefined
    try {
      // Use the existing template processing utility
      const replacer = withContext(cardContext)
      const processedAction = replacer.replace(action)

      // Create email message with processed template variables
      const emailMessage: EmailMessage = {
        from: processedAction.from,
        to: processedAction.to,
        subject: processedAction.subject,
        message: processedAction.message
      }

      // Add optional fields if present
      if (processedAction.cc) {
        emailMessage.cc = processedAction.cc
      }

      if (processedAction.bcc) {
        emailMessage.bcc = processedAction.bcc
      }

      console.log('Sending email:', {
        from: emailMessage.from,
        to: emailMessage.to,
        subject: emailMessage.subject,
        cardId: cardContext.workflowCardId,
        workflowId: cardContext.workflowId
      })

      // Get the appropriate email sender for the from address
      sender = this.senders.getSender(emailMessage.from)

      // Send the email
      const result = await sender.send(emailMessage)

      if (!result.success) {
        throw result.error || new Error('Email sending failed with unknown error')
      }

      console.log('Email sent successfully:', {
        messageId: result.messageId,
        cardId: cardContext.workflowCardId,
        workflowId: cardContext.workflowId
      })
    } catch (error) {
      console.error('Failed to send email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId: cardContext.workflowCardId,
        workflowId: cardContext.workflowId,
        action
      })
      throw error
    } finally {
      // close sender?
    }
  }
}
