import { defineString } from 'firebase-functions/params'
import { EmailSenderFactory } from './factory'
import { SmtpSender } from './senders/smtp'

EmailSenderFactory.shared.registerSender(
  new SmtpSender({
    type: 'smtp',
    domain: 'muze.co.th',
    smtpEndpoint: 'email-smtp.ap-southeast-1.amazonaws.com',
    smtpPort: 587,
    username: defineString('MUZE_SMTP_USERNAME').value(),
    password: defineString('MUZE_SMTP_PASSWORD').value()
  })
)

export const emailSenders = EmailSenderFactory.shared
