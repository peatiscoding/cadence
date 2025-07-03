import { withContext } from './replaceValue'
import { IWorkflowCard } from '../validation/card/card'

describe('withContext', () => {
  const mockCard: IWorkflowCard = {
    workflowId: 'workflow-123',
    workflowCardId: 'card-456',
    title: 'Test Card Title',
    description: 'Test card description',
    status: 'in-progress',
    type: 'task',
    value: 100,
    owner: 'john.doe@example.com',
    createdBy: 'jane.smith@example.com',
    fieldData: {
      priority: 'high',
      category: 'development',
      estimatedHours: '8',
      tags: 'urgent,backend'
    }
  }

  describe('replace method', () => {
    it('should replace card field placeholders with $ prefix', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Card $.title has value $.value')
      expect(result).toBe('Card Test Card Title has value 100')
    })

    it('should replace field data placeholders with # prefix', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Priority is #.priority and category is #.category')
      expect(result).toBe('Priority is high and category is development')
    })

    it('should replace mixed placeholders (both $ and #)', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Card $.title ($.status) has #.priority priority')
      expect(result).toBe('Card Test Card Title (in-progress) has high priority')
    })

    it('should handle multiple occurrences of the same placeholder', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('$.title - $.title - $.title')
      expect(result).toBe('Test Card Title - Test Card Title - Test Card Title')
    })

    it('should handle strings with no placeholders', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('No placeholders here')
      expect(result).toBe('No placeholders here')
    })

    it('should handle empty strings', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('')
      expect(result).toBe('')
    })

    it('should throw error for undefined field data when required', () => {
      const contextReplacer = withContext(mockCard)

      expect(() => {
        contextReplacer.replace('Non-existent field: #.nonExistentField')
      }).toThrow('Cannot replace \'#.nonExistentField\' the value is required')
    })

    it('should throw error for undefined card fields when required', () => {
      const cardWithUndefinedFields: IWorkflowCard = {
        ...mockCard,
        description: undefined
      }
      const contextReplacer = withContext(cardWithUndefinedFields)

      expect(() => {
        contextReplacer.replace('Description: $.description')
      }).toThrow('Cannot replace \'$.description\' the value is required')
    })

    it('should handle complex strings with special characters', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Task "$.title" - Status: [$.status] - Tags: #.tags')
      expect(result).toBe('Task "Test Card Title" - Status: [in-progress] - Tags: urgent,backend')
    })

    it('should handle placeholders at the beginning and end of string', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('$.title middle text #.priority')
      expect(result).toBe('Test Card Title middle text high')
    })

    it('should handle consecutive placeholders', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('$.title$.status#.priority')
      expect(result).toBe('Test Card Titlein-progresshigh')
    })

    it('should handle placeholders with spaces in field names', () => {
      const cardWithSpacedFields: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          ...mockCard.fieldData,
          'field with spaces': 'spaced value'
        }
      }
      const contextReplacer = withContext(cardWithSpacedFields)

      // Note: The regex pattern stops at spaces, so this won't work as expected
      // This test documents the current behavior - field name 'field' doesn't exist
      expect(() => {
        contextReplacer.replace('Field: #.field with spaces')
      }).toThrow("Cannot replace '#.field' the value is required")
    })

    it('should handle malformed placeholders', () => {
      const contextReplacer = withContext(mockCard)

      // Test shows that malformed placeholders like '$.and' throw errors for non-existent fields
      expect(() => {
        contextReplacer.replace('Malformed: $ .title and #title and $.and #.')
      }).toThrow("Cannot replace '$.and' the value is required")
    })

    it('should handle numeric field values', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Value: $.value, Hours: #.estimatedHours')
      expect(result).toBe('Value: 100, Hours: 8')
    })

    it('should handle boolean field values', () => {
      const cardWithBooleanFields: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          ...mockCard.fieldData,
          isComplete: true,
          isArchived: false
        }
      }
      const contextReplacer = withContext(cardWithBooleanFields)

      const result = contextReplacer.replace('Complete: #.isComplete, Archived: #.isArchived')
      expect(result).toBe('Complete: true, Archived: false')
    })

    it('should handle nested object field values', () => {
      const cardWithNestedFields: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          ...mockCard.fieldData,
          config: { theme: 'dark', language: 'en' }
        }
      }
      const contextReplacer = withContext(cardWithNestedFields)

      const result = contextReplacer.replace('Config: #.config')
      expect(result).toBe('Config: [object Object]')
    })

    it('should handle array field values', () => {
      const cardWithArrayFields: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          ...mockCard.fieldData,
          assignees: ['user1', 'user2', 'user3']
        }
      }
      const contextReplacer = withContext(cardWithArrayFields)

      const result = contextReplacer.replace('Assignees: #.assignees')
      expect(result).toBe('Assignees: user1,user2,user3')
    })
  })

  describe('optional marker functionality', () => {
    it('should return empty string for optional undefined field data', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Non-existent field: #.nonExistentField?')
      expect(result).toBe('Non-existent field: ')
    })

    it('should return empty string for optional undefined card fields', () => {
      const cardWithUndefinedFields: IWorkflowCard = {
        ...mockCard,
        description: undefined
      }
      const contextReplacer = withContext(cardWithUndefinedFields)

      const result = contextReplacer.replace('Description: $.description?')
      expect(result).toBe('Description: ')
    })

    it('should return empty string for optional null values', () => {
      const cardWithNullValues: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          nullField: null
        }
      }
      const contextReplacer = withContext(cardWithNullValues)

      const result = contextReplacer.replace('Null field: #.nullField?')
      expect(result).toBe('Null field: ')
    })

    it('should return actual value for optional fields that have values', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Title: $.title?, Priority: #.priority?')
      expect(result).toBe('Title: Test Card Title, Priority: high')
    })

    it('should handle mixed optional and required placeholders', () => {
      const cardWithMixedValues: IWorkflowCard = {
        ...mockCard,
        description: undefined,
        fieldData: {
          ...mockCard.fieldData,
          optionalField: null
        }
      }
      const contextReplacer = withContext(cardWithMixedValues)

      const result = contextReplacer.replace('Title: $.title, Desc: $.description?, Optional: #.optionalField?, Priority: #.priority')
      expect(result).toBe('Title: Test Card Title, Desc: , Optional: , Priority: high')
    })

    it('should handle optional markers in complex strings', () => {
      const cardWithUndefinedFields: IWorkflowCard = {
        ...mockCard,
        description: undefined,
        fieldData: {
          ...mockCard.fieldData,
          missingField: undefined
        }
      }
      const contextReplacer = withContext(cardWithUndefinedFields)

      const result = contextReplacer.replace('Card "$.title" - Desc: [$.description?] - Missing: (#.missingField?) - Priority: #.priority')
      expect(result).toBe('Card "Test Card Title" - Desc: [] - Missing: () - Priority: high')
    })
  })

  describe('required field error handling', () => {
    it('should throw error when required field is missing from mixed optional/required', () => {
      const cardWithMixedValues: IWorkflowCard = {
        ...mockCard,
        description: undefined,
        fieldData: {
          ...mockCard.fieldData,
          missingField: null
        }
      }
      const contextReplacer = withContext(cardWithMixedValues)

      expect(() => {
        contextReplacer.replace('Title: $.title?, Desc: $.description, Missing: #.missingField?')
      }).toThrow('Cannot replace \'$.description\' the value is required')
    })

    it('should throw error with correct field name for card fields', () => {
      const cardWithNullTitle: IWorkflowCard = {
        ...mockCard,
        title: null as any
      }
      const contextReplacer = withContext(cardWithNullTitle)

      expect(() => {
        contextReplacer.replace('Title: $.title')
      }).toThrow("Cannot replace '$.title' the value is required")
    })

    it('should throw error with correct field name for field data', () => {
      const cardWithNullFieldData: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          ...mockCard.fieldData,
          requiredField: null
        }
      }
      const contextReplacer = withContext(cardWithNullFieldData)

      expect(() => {
        contextReplacer.replace('Required: #.requiredField')
      }).toThrow("Cannot replace '#.requiredField' the value is required")
    })
  })

  describe('edge cases', () => {
    it('should throw error for empty fieldData when required', () => {
      const cardWithEmptyFieldData: IWorkflowCard = {
        ...mockCard,
        fieldData: {}
      }
      const contextReplacer = withContext(cardWithEmptyFieldData)

      expect(() => {
        contextReplacer.replace('Priority: #.priority')
      }).toThrow('Cannot replace \'#.priority\' the value is required')
    })

    it('should throw error for null values when required', () => {
      const cardWithNullValues: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          nullField: null
        }
      }
      const contextReplacer = withContext(cardWithNullValues)

      expect(() => {
        contextReplacer.replace('Null field: #.nullField')
      }).toThrow('Cannot replace \'#.nullField\' the value is required')
    })

    it('should handle very long replacement strings', () => {
      const cardWithLongData: IWorkflowCard = {
        ...mockCard,
        title: 'A'.repeat(1000),
        fieldData: {
          longField: 'B'.repeat(1000)
        }
      }
      const contextReplacer = withContext(cardWithLongData)

      const result = contextReplacer.replace('$.title #.longField')
      expect(result).toBe('A'.repeat(1000) + ' ' + 'B'.repeat(1000))
    })

    it('should handle special regex characters in field values', () => {
      const cardWithSpecialChars: IWorkflowCard = {
        ...mockCard,
        title: 'Title with $pecial [chars] (and) more',
        fieldData: {
          regex: '*.+?^${}()|[]\\',
          special: 'Field with $.placeholder and #.reference'
        }
      }
      const contextReplacer = withContext(cardWithSpecialChars)

      const result = contextReplacer.replace('Title: $.title, Regex: #.regex, Special: #.special')
      expect(result).toBe(
        'Title: Title with $pecial [chars] (and) more, Regex: *.+?^${}()|[]\\, Special: Field with $.placeholder and #.reference'
      )
    })
  })
})

