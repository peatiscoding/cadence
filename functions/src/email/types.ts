/**
 * Email-related type definitions
 */

export interface EmailMessage {
  from: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  message: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: Error
}

export interface EmailSenderConfig {
  domain: string
}

export interface SMTPSenderConfig extends EmailSenderConfig {
  type: 'smtp'
  smtpEndpoint: string
  smtpPort: number
  username: string
  password: string
}

export type EmailProviderConfig = SMTPSenderConfig

