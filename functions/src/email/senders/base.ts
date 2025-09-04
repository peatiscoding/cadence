import type { EmailMessage, EmailSendResult, EmailProviderConfig } from '../types'

/**
 * Abstract base class for email senders
 * Provides a common interface for different email providers
 */
export abstract class EmailSender<C extends EmailProviderConfig> {
  public readonly domain: string

  protected constructor(public readonly config: C) {
    this.domain = config.domain
    this.validateConfig()
  }

  /**
   * Send an email message
   * @param message Email message to send
   * @returns Promise with send result
   */
  abstract send(message: EmailMessage): Promise<EmailSendResult>

  /**
   * Validate the email message before sending
   * @param message Email message to validate
   * @throws Error if validation fails
   */
  protected validateMessage(message: EmailMessage): void {
    if (!message.from || !message.to || !message.subject) {
      throw new Error('Email message missing required fields: from, to, subject')
    }

    if (!this.isValidEmail(message.from)) {
      throw new Error(`Invalid from email address: ${message.from}`)
    }

    if (!this.isValidEmail(message.to)) {
      throw new Error(`Invalid to email address: ${message.to}`)
    }

    if (message.cc && !this.isValidEmail(message.cc)) {
      throw new Error(`Invalid cc email address: ${message.cc}`)
    }

    if (message.bcc && !this.isValidEmail(message.bcc)) {
      throw new Error(`Invalid bcc email address: ${message.bcc}`)
    }

    // Check if sender domain is supported
    const fromDomain = message.from.split('@')[1]?.toLowerCase()
    if (fromDomain !== this.config.domain) {
      throw new Error(`Unsupported sender domain: ${fromDomain}. Expected: ${this.config.domain}`)
    }
  }

  /**
   * Basic email validation
   * @param email Email address to validate
   * @returns True if valid, false otherwise
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate the provider configuration
   * Subclasses should override to add specific validation
   * @throws Error if configuration is invalid
   */
  protected validateConfig(): void {
    if (!this.config.domain) {
      throw new Error('Email sender configuration missing required field: domain')
    }
  }

  /**
   * Get the supported domain for this sender
   */
  public getDomain(): string {
    return this.config.domain
  }

  /**
   * Get the provider type
   */
  public getType(): string {
    return this.config.type
  }
}

