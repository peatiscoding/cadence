import type { EmailMessage, EmailSendResult, SMTPSenderConfig } from '../types'

import nodemailer from 'nodemailer'
import { EmailSender } from './base'

/**
 * SMTP email sender implementation
 * Uses nodemailer with SMTP for sending emails
 */
export class SmtpSender extends EmailSender<SMTPSenderConfig> {
  private transporter: nodemailer.Transporter | null = null

  constructor(config: SMTPSenderConfig) {
    super(config)
    this.initializeTransporter()
  }

  /**
   * Initialize the nodemailer transporter with SMTP settings
   */
  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpEndpoint,
        port: this.config.smtpPort,
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.config.username,
          pass: this.config.password
        }
      })

      console.log(`SMTP transporter initialized for domain: ${this.config.domain}`)
    } catch (error) {
      console.error('Failed to initialize SMTP transporter:', error)
      throw new Error(
        `SMTP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send an email using SMTP
   * @param message Email message to send
   * @returns Promise with send result
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Validate message before sending
      this.validateMessage(message)

      if (!this.transporter) {
        throw new Error('SMTP transporter not initialized')
      }

      // Prepare mail options
      const mailOptions: nodemailer.SendMailOptions = {
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.message,
        html: this.formatMessageAsHtml(message.message)
      }

      // Add optional fields
      if (message.cc) {
        mailOptions.cc = message.cc
      }

      if (message.bcc) {
        mailOptions.bcc = message.bcc
      }

      // Send the email
      const info = await this.transporter.sendMail(mailOptions)

      console.log('Email sent successfully:', {
        messageId: info.messageId,
        from: message.from,
        to: message.to,
        subject: message.subject
      })

      return {
        success: true,
        messageId: info.messageId
      }
    } catch (error) {
      console.error('Failed to send email via SES SMTP:', error)

      return {
        success: false,
        error:
          error instanceof Error ? error : new Error('Unknown error occurred while sending email')
      }
    }
  }

  /**
   * Format plain text message as basic HTML
   * @param message Plain text message
   * @returns HTML formatted message
   */
  private formatMessageAsHtml(message: string): string {
    return message
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => `<p>${this.escapeHtml(line)}</p>`)
      .join('')
  }

  /**
   * Escape HTML characters in text
   * @param text Text to escape
   * @returns HTML escaped text
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * Validate SES specific configuration
   */
  protected validateConfig(): void {
    super.validateConfig()

    const config = this.config

    if (!config.smtpEndpoint) {
      throw new Error('SMTP configuration missing required field: smtpEndpoint')
    }

    if (!config.smtpPort) {
      throw new Error('SMTP configuration missing required field: smtpPort')
    }

    if (!config.username) {
      throw new Error('SMTP configuration missing required field: username')
    }

    if (!config.password) {
      throw new Error('SMTP configuration missing required field: password')
    }
  }

  /**
   * Test the connection to SES SMTP
   * @returns Promise that resolves if connection is successful
   */
  async testConnection(): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized')
    }

    try {
      await this.transporter.verify()
      console.log('SMTP connection verified successfully')
    } catch (error) {
      console.error('SMTP connection test failed:', error)
      throw new Error(
        `SMTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Close the transporter connection
   */
  close(): void {
    if (this.transporter) {
      this.transporter.close()
      this.transporter = null
      console.log('SMTP transporter closed')
    }
  }
}
