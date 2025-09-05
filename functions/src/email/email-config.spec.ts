/**
 * Jest test to validate email sender configuration injection
 * This test helps diagnose configuration issues with the SMTP sender
 */

import { initEmailSenders } from './supported'
import { SmtpSender } from './senders/smtp'
import type { EmailMessage } from './types'

describe('Email Configuration', () => {
  let factory: ReturnType<typeof initEmailSenders>
  let sender: SmtpSender

  beforeAll(() => {
    factory = initEmailSenders()
    const retrievedSender = factory.getSender('someone@muze.co.th')

    if (!retrievedSender || !(retrievedSender instanceof SmtpSender)) {
      throw new Error('Failed to retrieve SMTP sender for muze.co.th')
    }

    sender = retrievedSender
  })

  afterAll(() => {
    // Clean up SMTP connection
    sender?.close()
  })

  describe('Factory Initialization', () => {
    it('should initialize email sender factory successfully', () => {
      expect(factory).toBeDefined()
      expect(typeof factory.getSender).toBe('function')
    })

    it('should retrieve sender for muze.co.th domain', () => {
      const retrievedSender = factory.getSender('someone@muze.co.th')
      expect(retrievedSender).not.toBeNull()
      expect(retrievedSender).toBeInstanceOf(SmtpSender)
    })

    it('should throw error for unsupported domains', () => {
      expect(() => factory.getSender('any@unsupported.com')).toThrow()
    })
  })

  describe('SMTP Configuration', () => {
    it('should have correct domain configuration', () => {
      expect(sender.getDomain()).toBe('muze.co.th')
    })

    it('should have correct sender type', () => {
      expect(sender.getType()).toBe('smtp')
    })

    it('should have valid SMTP configuration properties', () => {
      // Access config through the public readonly property
      const config = sender.config
      expect(config.smtpEndpoint).toBe('email-smtp.ap-southeast-1.amazonaws.com')
      expect(config.smtpPort).toBe(25)
      expect(config.username).toBeDefined()
      expect(config.password).toBeDefined()
      expect(config.domain).toBe('muze.co.th')
    })
  })

  describe('SMTP Connection', () => {
    it('should successfully test SMTP connection', async () => {
      await expect(sender.testConnection()).resolves.not.toThrow()
    }, 10000) // 10 second timeout for network operation

    it('should handle connection failures gracefully', async () => {
      // Create a sender with invalid config to test error handling
      const invalidSender = new SmtpSender({
        type: 'smtp',
        domain: 'test.com',
        smtpEndpoint: 'invalid-endpoint.com',
        smtpPort: 587,
        username: 'invalid',
        password: 'invalid'
      })

      await expect(invalidSender.testConnection()).rejects.toThrow()
      invalidSender.close()
    }, 10000)
  })

  describe('Email Message Validation', () => {
    const validMessage: EmailMessage = {
      from: 'no-reply@muze.co.th',
      to: 'kittiphat@muze.co.th',
      subject: 'Configuration Test',
      message: 'This is a test message for configuration validation.'
    }

    it('should validate correct email message format', () => {
      // Test the validation indirectly by ensuring it doesn't throw
      expect(() => {
        // Access the protected method through any casting for testing
        ;(sender as any).validateMessage(validMessage)
      }).not.toThrow()
    })

    it.skip('should be able to send an email', async () => {
      await expect(sender.send(validMessage)).resolves.not.toThrow()
    })

    it('should reject message with invalid from domain', () => {
      const invalidMessage = {
        ...validMessage,
        from: 'test@wrongdomain.com'
      }

      expect(() => {
        ;(sender as any).validateMessage(invalidMessage)
      }).toThrow('Unsupported sender domain')
    })

    it('should reject message with missing required fields', () => {
      const incompleteMessage = {
        from: 'test@muze.co.th',
        to: '',
        subject: 'Test',
        message: 'Test message'
      }

      expect(() => {
        ;(sender as any).validateMessage(incompleteMessage)
      }).toThrow('Email message missing required fields')
    })

    it('should reject message with invalid email format', () => {
      const invalidEmailMessage = {
        ...validMessage,
        to: 'invalid-email-format'
      }

      expect(() => {
        ;(sender as any).validateMessage(invalidEmailMessage)
      }).toThrow('Invalid to email address')
    })
  })

  describe('Environment Configuration', () => {
    it('should have SMTP credentials injected from environment', () => {
      const config = sender.config

      // Verify that username and password are not empty (credentials were injected)
      expect(config.username).toBeTruthy()
      expect(config.password).toBeTruthy()

      // Verify they're strings (not undefined)
      expect(typeof config.username).toBe('string')
      expect(typeof config.password).toBe('string')
    })
  })
})
