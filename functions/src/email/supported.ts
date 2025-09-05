import { defineString } from 'firebase-functions/params'
import { EmailSenderFactory } from './factory'
import { SmtpSender } from './senders/smtp'

let instance: EmailSenderFactory | null = null

export const initEmailSenders = (): EmailSenderFactory => {
  if (!instance) {
    instance = new EmailSenderFactory()
    instance.registerSender(
      new SmtpSender({
        type: 'smtp',
        domain: 'muze.co.th',
        smtpEndpoint: 'email-smtp.ap-southeast-1.amazonaws.com',
        smtpPort: 587,
        username: defineString('MUZE_SMTP_USERNAME').value(),
        password: defineString('MUZE_SMTP_PASSWORD').value()
      })
    )
  }
  return instance
}
