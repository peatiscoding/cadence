import { describe, it, expect } from '@jest/globals'
import { ConfigurationSchema } from './configuration'

describe('Configuration Schema Validation', () => {
  const baseConfig = {
    workflowId: 'test-workflow',
    name: 'Test Workflow',
    nouns: {
      singular: 'Task',
      plural: 'Tasks'
    },
    fields: [],
    types: [
      {
        slug: 'task',
        title: 'Task',
        ui: { color: '#3B82F6' }
      }
    ],
    statuses: []
  }

  describe('approval key validation', () => {
    it('should pass validation when approval keys are properly defined', () => {
      const config = {
        ...baseConfig,
        approvals: [
          {
            slug: 'manager-approval',
            allowed: [{ kind: 'basic' as const }]
          },
          {
            slug: 'finance-approval', 
            allowed: [{ kind: 'basic' as const }]
          }
        ],
        statuses: [
          {
            slug: 'pending',
            title: 'Pending',
            terminal: false,
            ui: { color: '#FBBF24' },
            precondition: {
              from: ['draft'],
              approvals: [
                { key: 'manager-approval' },
                { key: 'finance-approval' }
              ]
            }
          }
        ]
      }

      expect(() => ConfigurationSchema.parse(config)).not.toThrow()
    })

    it('should fail validation when referenced approval keys are not defined', () => {
      const config = {
        ...baseConfig,
        approvals: [
          {
            slug: 'manager-approval',
            allowed: [{ kind: 'basic' as const }]
          }
        ],
        statuses: [
          {
            slug: 'pending',
            title: 'Pending',
            terminal: false,
            ui: { color: '#FBBF24' },
            precondition: {
              from: ['draft'],
              approvals: [
                { key: 'manager-approval' },
                { key: 'finance-approval' }, // This key is not defined in approvals
                { key: 'legal-approval' }    // This key is also not defined
              ]
            }
          }
        ]
      }

      expect(() => ConfigurationSchema.parse(config)).toThrow()
      
      try {
        ConfigurationSchema.parse(config)
      } catch (error: any) {
        expect(error.message).toContain('finance-approval')
        expect(error.message).toContain('legal-approval')
        expect(error.message).toContain('referenced in status preconditions but not defined in approvals')
      }
    })

    it('should pass validation when no approvals are used', () => {
      const config = {
        ...baseConfig,
        statuses: [
          {
            slug: 'pending',
            title: 'Pending',
            terminal: false,
            ui: { color: '#FBBF24' },
            precondition: {
              from: ['draft']
            }
          }
        ]
      }

      expect(() => ConfigurationSchema.parse(config)).not.toThrow()
    })

    it('should pass validation when approvals are defined but not used', () => {
      const config = {
        ...baseConfig,
        approvals: [
          {
            slug: 'manager-approval',
            allowed: [{ kind: 'basic' as const }]
          }
        ],
        statuses: [
          {
            slug: 'pending',
            title: 'Pending',
            terminal: false,
            ui: { color: '#FBBF24' },
            precondition: {
              from: ['draft']
            }
          }
        ]
      }

      expect(() => ConfigurationSchema.parse(config)).not.toThrow()
    })

    it('should handle multiple statuses with different approval requirements', () => {
      const config = {
        ...baseConfig,
        approvals: [
          {
            slug: 'level-1-approval',
            allowed: [{ kind: 'basic' as const }]
          },
          {
            slug: 'level-2-approval',
            allowed: [{ kind: 'basic' as const }]
          }
        ],
        statuses: [
          {
            slug: 'review',
            title: 'Review',
            terminal: false,
            ui: { color: '#FB923C' },
            precondition: {
              from: ['draft'],
              approvals: [
                { key: 'level-1-approval' }
              ]
            }
          },
          {
            slug: 'approved',
            title: 'Approved',
            terminal: true,
            ui: { color: '#10B981' },
            precondition: {
              from: ['review'],
              approvals: [
                { key: 'level-1-approval' },
                { key: 'level-2-approval' }
              ]
            }
          }
        ]
      }

      expect(() => ConfigurationSchema.parse(config)).not.toThrow()
    })
  })
})