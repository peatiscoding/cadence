import type { EmailSender } from './senders/base'

/**
 * Factory class for creating email senders
 * Handles the instantiation of appropriate email sender based on domain configuration
 */
export class EmailSenderFactory {
  private supportedSenders = new Map<string, EmailSender<any>>()

  constructor() {}

  public registerSender(sender: EmailSender<any>) {
    this.supportedSenders.set(sender.getDomain(), sender)
  }

  /**
   * Create or retrieve an email sender for a given email address
   * @param fromEmail The from email address to determine the sender
   * @returns EmailSender instance
   * @throws Error if no configuration found for the domain
   */
  getSender(fromEmail: string): EmailSender<any> {
    const domain = this.extractDomain(fromEmail)

    // Check cache first
    if (this.supportedSenders.has(domain)) {
      return this.supportedSenders.get(domain)!
    }

    throw new Error(`Unsupported sender for domain: ${domain}`)
  }

  /**
   * Extract domain from email address
   * @param email Email address
   * @returns Domain part of the email
   * @throws Error if email format is invalid
   */
  private extractDomain(email: string): string {
    const atIndex = email.indexOf('@')
    if (atIndex === -1 || atIndex === email.length - 1) {
      throw new Error(`Invalid email format: ${email}`)
    }

    return email.substring(atIndex + 1).toLowerCase()
  }
}
