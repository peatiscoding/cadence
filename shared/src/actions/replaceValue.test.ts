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

    it('should handle undefined field data gracefully', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Non-existent field: #.nonExistentField')
      expect(result).toBe('Non-existent field: undefined')
    })

    it('should handle undefined card fields gracefully', () => {
      const cardWithUndefinedFields: IWorkflowCard = {
        ...mockCard,
        description: undefined
      }
      const contextReplacer = withContext(cardWithUndefinedFields)

      const result = contextReplacer.replace('Description: $.description')
      expect(result).toBe('Description: undefined')
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
      // This test documents the current behavior
      const result = contextReplacer.replace('Field: #.field with spaces')
      expect(result).toBe('Field: undefined with spaces')
    })

    it('should handle malformed placeholders', () => {
      const contextReplacer = withContext(mockCard)

      const result = contextReplacer.replace('Malformed: $ .title and #title and $.and #.')
      expect(result).toThrow()
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

  describe('edge cases', () => {
    it('should handle card with empty fieldData', () => {
      const cardWithEmptyFieldData: IWorkflowCard = {
        ...mockCard,
        fieldData: {}
      }
      const contextReplacer = withContext(cardWithEmptyFieldData)

      const result = contextReplacer.replace('Priority: #.priority')
      expect(result).toBe('Priority: undefined')
    })

    it('should handle card with null values', () => {
      const cardWithNullValues: IWorkflowCard = {
        ...mockCard,
        fieldData: {
          nullField: null
        }
      }
      const contextReplacer = withContext(cardWithNullValues)

      const result = contextReplacer.replace('Null field: #.nullField')
      expect(result).toBe('Null field: null')
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

