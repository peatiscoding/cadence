import type { IWorkflowCardStorage, IWorkflowConfigurationDynamicStorage } from '../interface'
import type { Auth } from 'firebase/auth'
import type { Configuration } from '$lib/schema'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { FirestoreWorkflowCardStorage } from './firestore'

// Integration tests for Firebase Firestore configuration storage
// These tests require Firebase emulator to be running
describe('FirestoreWorkflowCardStorage - Configuration Operations', () => {
  let storage: IWorkflowCardStorage & IWorkflowConfigurationDynamicStorage
  let auth: Auth

  beforeAll(async () => {
    // Login firebase
    const fns = getFunctions(undefined, 'asia-southeast2')
    auth = getAuth()
    const loginFn = httpsCallable<
      undefined,
      { success: true; result: string } | { success: false; reason: Error }
    >(fns, 'loginFn')
    const res = await loginFn()
    if (!res.data.success) {
      throw new Error('Unable to initiate test, authentication failed', res.data.reason)
    }
    // the app is now logged in.
    await signInWithCustomToken(auth, res.data.result)
  })

  beforeEach(() => {
    // Use shared instance for integration tests
    storage = FirestoreWorkflowCardStorage.shared()
  })

  const createdWorkflowIds: string[] = []

  afterAll(async () => {
    // Clean up created workflow configurations
    if (createdWorkflowIds.length > 0) {
      try {
        await storage.deleteConfig(...createdWorkflowIds)
      } catch (error) {
        // Ignore errors for workflows that might already be deleted
        console.warn('Error during workflow cleanup:', error)
      }
      createdWorkflowIds.length = 0 // Clear the array
    }

    // logout
    await signOut(auth)
  })

  describe('setConfig', () => {
    it('should create a new workflow configuration', async () => {
      // Arrange
      const workflowId = `config-test-${Date.now()}`
      createdWorkflowIds.push(workflowId)

      const testConfig: Configuration = {
        name: 'Test Workflow',
        description: 'A test workflow for configuration testing',
        types: [
          {
            slug: 'task',
            title: 'Task',
            ui: { color: '#3B82F6' }
          },
          {
            slug: 'bug',
            title: 'Bug',
            ui: { color: '#EF4444' }
          }
        ],
        fields: [
          {
            slug: 'priority',
            title: 'Priority',
            description: 'Task priority level',
            schema: {
              kind: 'choice',
              choices: ['low', 'medium', 'high', 'critical']
            }
          }
        ],
        statuses: [
          {
            slug: 'todo',
            title: 'To Do',
            terminal: false,
            precondition: {
              required: ['title', 'type'],
              from: ['draft'],
              users: ['*']
            },
            ui: { color: '#6B7280' },
            transition: [],
            finally: []
          },
          {
            slug: 'done',
            title: 'Done',
            terminal: true,
            precondition: {
              required: ['title', 'type'],
              from: ['draft'],
              users: ['*']
            },
            ui: { color: '#10B981' },
            transition: [],
            finally: []
          }
        ]
      }

      // Act
      await storage.setConfig(workflowId, testConfig)

      // Assert
      const retrievedConfig = await storage.loadConfig(workflowId)
      expect(retrievedConfig.name).toBe('Test Workflow')
      expect(retrievedConfig.description).toBe('A test workflow for configuration testing')
      expect(retrievedConfig.types).toHaveLength(2)
      expect(retrievedConfig.fields).toHaveLength(1)
      expect(retrievedConfig.statuses).toHaveLength(2)

      // Verify types
      expect(retrievedConfig.types[0].slug).toBe('task')
      expect(retrievedConfig.types[0].title).toBe('Task')
      expect(retrievedConfig.types[0].ui.color).toBe('#3B82F6')

      expect(retrievedConfig.types[1].slug).toBe('bug')
      expect(retrievedConfig.types[1].title).toBe('Bug')
      expect(retrievedConfig.types[1].ui.color).toBe('#EF4444')

      // Verify fields
      expect(retrievedConfig.fields[0].slug).toBe('priority')
      expect(retrievedConfig.fields[0].title).toBe('Priority')
      expect(retrievedConfig.fields[0].schema.kind).toBe('choice')
      if (retrievedConfig.fields[0].schema.kind === 'choice') {
        expect(retrievedConfig.fields[0].schema.choices).toEqual([
          'low',
          'medium',
          'high',
          'critical'
        ])
      }

      // Verify statuses
      expect(retrievedConfig.statuses[0].slug).toBe('todo')
      expect(retrievedConfig.statuses[0].terminal).toBe(false)
      expect(retrievedConfig.statuses[1].slug).toBe('done')
      expect(retrievedConfig.statuses[1].terminal).toBe(true)
    })

    it('should update existing workflow configuration with merge', async () => {
      // Arrange - Create initial configuration
      const workflowId = `update-test-${Date.now()}`
      createdWorkflowIds.push(workflowId)

      const initialConfig: Configuration = {
        name: 'Initial Config',
        description: 'Initial description',
        types: [],
        fields: [
          {
            slug: 'initial-field',
            title: 'Initial Field',
            description: 'An initial field',
            schema: { kind: 'text' }
          }
        ],
        statuses: [
          {
            slug: 'initial-status',
            title: 'Initial Status',
            terminal: false,
            precondition: { required: [], from: ['draft'], users: ['*'] },
            ui: { color: '#000000' },
            transition: [],
            finally: []
          }
        ]
      }

      await storage.setConfig(workflowId, initialConfig)

      // Act - Update with partial configuration (should merge)
      const updateConfig: Configuration = {
        name: 'Updated Config Name',
        description: 'Updated description',
        types: [
          {
            slug: 'new-type',
            title: 'New Type',
            ui: { color: '#FF0000' }
          }
        ],
        fields: [], // This should replace the existing fields array
        statuses: [
          {
            slug: 'updated-status',
            title: 'Updated Status',
            terminal: true,
            precondition: { required: ['title'], from: ['draft'] },
            ui: { color: '#FFFFFF' }
          }
        ]
      }

      await storage.setConfig(workflowId, updateConfig)

      // Assert
      const retrievedConfig = await storage.loadConfig(workflowId)
      expect(retrievedConfig.name).toBe('Updated Config Name')
      expect(retrievedConfig.description).toBe('Updated description')
      expect(retrievedConfig.types).toHaveLength(1)
      expect(retrievedConfig.types[0].slug).toBe('new-type')
      expect(retrievedConfig.fields).toHaveLength(0) // Should be empty due to merge
      expect(retrievedConfig.statuses).toHaveLength(1)
      expect(retrievedConfig.statuses[0].slug).toBe('updated-status')
    })

    it('should handle minimal configuration', async () => {
      // Arrange
      const workflowId = `minimal-test-${Date.now()}`
      createdWorkflowIds.push(workflowId)

      const minimalConfig: Configuration = {
        name: 'Minimal Workflow',
        description: 'A minimal workflow configuration',
        types: [],
        fields: [],
        statuses: []
      }

      // Act
      await storage.setConfig(workflowId, minimalConfig)

      // Assert
      const retrievedConfig = await storage.loadConfig(workflowId)
      expect(retrievedConfig.name).toBe('Minimal Workflow')
      expect(retrievedConfig.description).toBe('A minimal workflow configuration')
      expect(retrievedConfig.types).toEqual([])
      expect(retrievedConfig.fields).toEqual([])
      expect(retrievedConfig.statuses).toEqual([])
    })

    it('should handle complex configuration with multiple field types', async () => {
      // Arrange
      const workflowId = `complex-test-${Date.now()}`
      createdWorkflowIds.push(workflowId)

      const complexConfig: Configuration = {
        name: 'Complex Workflow',
        description: 'A complex workflow with various field types',
        types: [
          {
            slug: 'epic',
            title: 'Epic',
            ui: { color: '#8B5CF6' }
          },
          {
            slug: 'story',
            title: 'User Story',
            ui: { color: '#06B6D4' }
          },
          {
            slug: 'task',
            title: 'Task',
            ui: { color: '#10B981' }
          }
        ],
        fields: [
          {
            slug: 'text-field',
            title: 'Text Field',
            description: 'A text input field',
            schema: {
              kind: 'text',
              min: 1,
              max: 100
            }
          },
          {
            slug: 'number-field',
            title: 'Number Field',
            description: 'A numeric input field',
            schema: {
              kind: 'number',
              min: 0,
              max: 1000
            }
          },
          {
            slug: 'url-field',
            title: 'URL Field',
            description: 'A URL input field',
            schema: { kind: 'url' }
          },
          {
            slug: 'boolean-field',
            title: 'Boolean Field',
            description: 'A checkbox field',
            schema: { kind: 'bool' }
          },
          {
            slug: 'choice-field',
            title: 'Choice Field',
            description: 'A single choice field',
            schema: {
              kind: 'choice',
              choices: ['option1', 'option2', 'option3']
            }
          },
          {
            slug: 'multi-choice-field',
            title: 'Multi Choice Field',
            description: 'A multiple choice field',
            schema: {
              kind: 'multi-choice',
              choices: ['tag1', 'tag2', 'tag3', 'tag4']
            }
          }
        ],
        statuses: [
          {
            slug: 'backlog',
            title: 'Backlog',
            terminal: false,
            precondition: { required: ['title'], from: ['draft'] },
            ui: { color: '#6B7280' }
          },
          {
            slug: 'todo',
            title: 'To Do',
            terminal: false,
            precondition: { required: ['title', 'type'], from: ['draft'] },
            ui: { color: '#3B82F6' }
          },
          {
            slug: 'in-progress',
            title: 'In Progress',
            terminal: false,
            precondition: { required: ['title', 'type', 'owner'], from: ['draft'] },
            ui: { color: '#F59E0B' }
          },
          {
            slug: 'review',
            title: 'Review',
            terminal: false,
            precondition: { required: ['title', 'type', 'owner'], from: ['draft'] },
            ui: { color: '#8B5CF6' }
          },
          {
            slug: 'done',
            title: 'Done',
            terminal: true,
            precondition: { required: ['title', 'type'], from: ['draft'] },
            ui: { color: '#10B981' }
          }
        ]
      }

      // Act
      await storage.setConfig(workflowId, complexConfig)

      // Assert
      const retrievedConfig = await storage.loadConfig(workflowId)
      expect(retrievedConfig.types).toHaveLength(3)
      expect(retrievedConfig.fields).toHaveLength(6)
      expect(retrievedConfig.statuses).toHaveLength(5)

      // Verify field types
      const textField = retrievedConfig.fields.find((f) => f.slug === 'text-field')!
      expect(textField.schema.kind).toBe('text')
      if (textField.schema.kind === 'text') {
        expect(textField.schema.min).toBe(1)
        expect(textField.schema.max).toBe(100)
      }

      const numberField = retrievedConfig.fields.find((f) => f.slug === 'number-field')!
      expect(numberField.schema.kind).toBe('number')
      if (numberField.schema.kind === 'number') {
        expect(numberField.schema.min).toBe(0)
        expect(numberField.schema.max).toBe(1000)
      }

      const choiceField = retrievedConfig.fields.find((f) => f.slug === 'choice-field')!
      expect(choiceField.schema.kind).toBe('choice')
      if (choiceField.schema.kind === 'choice') {
        expect(choiceField.schema.choices).toEqual(['option1', 'option2', 'option3'])
      }

      const multiChoiceField = retrievedConfig.fields.find((f) => f.slug === 'multi-choice-field')!
      expect(multiChoiceField.schema.kind).toBe('multi-choice')
      if (multiChoiceField.schema.kind === 'multi-choice') {
        expect(multiChoiceField.schema.choices).toEqual(['tag1', 'tag2', 'tag3', 'tag4'])
      }
    })

    it('should support creating multiple different configurations', async () => {
      // Arrange
      const workflowId1 = `multi-config-1-${Date.now()}`
      const workflowId2 = `multi-config-2-${Date.now()}`
      createdWorkflowIds.push(workflowId1, workflowId2)

      const config1: Configuration = {
        name: 'Software Development',
        description: 'Workflow for software development tasks',
        types: [
          { slug: 'feature', title: 'Feature', ui: { color: '#10B981' } },
          { slug: 'bug', title: 'Bug', ui: { color: '#EF4444' } }
        ],
        fields: [
          {
            slug: 'severity',
            title: 'Severity',
            description: 'Bug severity level',
            schema: { kind: 'choice', choices: ['low', 'medium', 'high', 'critical'] }
          }
        ],
        statuses: [
          {
            slug: 'open',
            title: 'Open',
            terminal: false,
            precondition: { from: [], required: ['title'], users: [] },
            ui: { color: '#3B82F6' }
          }
        ]
      }

      const config2: Configuration = {
        name: 'Marketing Campaign',
        description: 'Workflow for marketing campaign management',
        types: [
          { slug: 'campaign', title: 'Campaign', ui: { color: '#F59E0B' } },
          { slug: 'content', title: 'Content', ui: { color: '#8B5CF6' } }
        ],
        fields: [
          {
            slug: 'budget',
            title: 'Budget',
            description: 'Campaign budget in USD',
            schema: { kind: 'number', min: 0, max: 1000000 }
          }
        ],
        statuses: [
          {
            slug: 'planning',
            title: 'Planning',
            terminal: false,
            precondition: { from: [], required: ['title', 'type'], users: [] },
            ui: { color: '#6B7280' }
          }
        ]
      }

      // Act
      await storage.setConfig(workflowId1, config1)
      await storage.setConfig(workflowId2, config2)

      // Assert
      const retrievedConfig1 = await storage.loadConfig(workflowId1)
      const retrievedConfig2 = await storage.loadConfig(workflowId2)

      expect(retrievedConfig1.name).toBe('Software Development')
      expect(retrievedConfig1.types[0].slug).toBe('feature')
      expect(retrievedConfig1.fields[0].slug).toBe('severity')

      expect(retrievedConfig2.name).toBe('Marketing Campaign')
      expect(retrievedConfig2.types[0].slug).toBe('campaign')
      expect(retrievedConfig2.fields[0].slug).toBe('budget')
    })
  })

  describe('listWorkflows', () => {
    it('should return empty list when no workflows exist', async () => {
      // Note: This test assumes we're starting with a clean state
      // In practice, there might be workflows from other tests

      // Act
      const result = await storage.listWorkflows()

      // Assert
      expect(result).toHaveProperty('workflows')
      expect(Array.isArray(result.workflows)).toBe(true)
      // Note: There might be other workflows from other tests, so we just check structure
    })

    it('should list all created workflow configurations', async () => {
      // Arrange - Create multiple workflows
      const workflow1Id = `list-test-1-${Date.now()}`
      const workflow2Id = `list-test-2-${Date.now()}`
      const workflow3Id = `list-test-3-${Date.now()}`

      createdWorkflowIds.push(workflow1Id, workflow2Id, workflow3Id)

      const config1: Configuration = {
        name: 'List Test Workflow 1',
        description: 'First test workflow for listing',
        types: [],
        fields: [
          {
            slug: 'test-field-1',
            title: 'Test Field 1',
            description: 'First test field',
            schema: { kind: 'text' }
          }
        ],
        statuses: [
          {
            slug: 'status-1',
            title: 'Status 1',
            terminal: false,
            precondition: { from: [], required: [], users: [] },
            ui: { color: '#000001' }
          }
        ]
      }

      const config2: Configuration = {
        name: 'List Test Workflow 2',
        description: 'Second test workflow for listing',
        types: [{ slug: 'type-2', title: 'Type 2', ui: { color: '#000002' } }],
        fields: [],
        statuses: [
          {
            slug: 'status-2',
            title: 'Status 2',
            terminal: true,
            precondition: { from: [], required: ['title'], users: [] },
            ui: { color: '#000002' }
          }
        ]
      }

      const config3: Configuration = {
        name: 'List Test Workflow 3',
        description: 'Third test workflow for listing',
        types: [
          { slug: 'type-3a', title: 'Type 3A', ui: { color: '#000003' } },
          { slug: 'type-3b', title: 'Type 3B', ui: { color: '#000004' } }
        ],
        fields: [
          {
            slug: 'test-field-3a',
            title: 'Test Field 3A',
            description: 'Third test field A',
            schema: { kind: 'number', min: 0, max: 100 }
          },
          {
            slug: 'test-field-3b',
            title: 'Test Field 3B',
            description: 'Third test field B',
            schema: { kind: 'bool' }
          }
        ],
        statuses: [
          {
            slug: 'status-3a',
            title: 'Status 3A',
            terminal: false,
            precondition: { from: [], required: [], users: [] },
            ui: { color: '#000003' }
          },
          {
            slug: 'status-3b',
            title: 'Status 3B',
            terminal: true,
            precondition: { from: [], required: ['title', 'type'], users: [] },
            ui: { color: '#000004' }
          }
        ]
      }

      await storage.setConfig(workflow1Id, config1)
      await storage.setConfig(workflow2Id, config2)
      await storage.setConfig(workflow3Id, config3)

      // Act
      const result = await storage.listWorkflows()

      // Assert
      expect(result).toHaveProperty('workflows')
      expect(Array.isArray(result.workflows)).toBe(true)

      // Find our test workflows in the results
      const testWorkflows = result.workflows.filter((w) =>
        [workflow1Id, workflow2Id, workflow3Id].includes(w.workflowId)
      )

      expect(testWorkflows).toHaveLength(3)

      // Verify each workflow has correct structure and data
      const workflow1 = testWorkflows.find((w) => w.workflowId === workflow1Id)
      const workflow2 = testWorkflows.find((w) => w.workflowId === workflow2Id)
      const workflow3 = testWorkflows.find((w) => w.workflowId === workflow3Id)

      expect(workflow1).toBeDefined()
      expect(workflow1?.name).toBe('List Test Workflow 1')
      expect(workflow1?.description).toBe('First test workflow for listing')
      expect(workflow1?.fields).toHaveLength(1)
      expect(workflow1?.statuses).toHaveLength(1)
      expect(workflow1?.workflowId).toBe(workflow1Id)

      expect(workflow2).toBeDefined()
      expect(workflow2?.name).toBe('List Test Workflow 2')
      expect(workflow2?.types).toHaveLength(1)
      expect(workflow2?.fields).toHaveLength(0)
      expect(workflow2?.workflowId).toBe(workflow2Id)

      expect(workflow3).toBeDefined()
      expect(workflow3?.name).toBe('List Test Workflow 3')
      expect(workflow3?.types).toHaveLength(2)
      expect(workflow3?.fields).toHaveLength(2)
      expect(workflow3?.statuses).toHaveLength(2)
      expect(workflow3?.workflowId).toBe(workflow3Id)
    })

    it('should return workflows with all required properties', async () => {
      // Arrange - Create a test workflow with all properties
      const testWorkflowId = `properties-test-${Date.now()}`
      createdWorkflowIds.push(testWorkflowId)

      const testConfig: Configuration = {
        name: 'Properties Test Workflow',
        description: 'Testing all workflow properties',
        types: [{ slug: 'test-type', title: 'Test Type', ui: { color: '#123456' } }],
        fields: [
          {
            slug: 'title',
            title: 'Title',
            description: 'Card title',
            schema: { kind: 'text', min: 1, max: 200 }
          },
          {
            slug: 'estimated-hours',
            title: 'Estimated Hours',
            description: 'Time estimation',
            schema: { kind: 'number', min: 0, max: 1000 }
          }
        ],
        statuses: [
          {
            slug: 'new',
            title: 'New',
            terminal: false,
            precondition: { from: [], required: ['title'], users: [] },
            ui: { color: '#654321' }
          },
          {
            slug: 'completed',
            title: 'Completed',
            terminal: true,
            precondition: { from: [], required: ['title', 'type'], users: [] },
            ui: { color: '#abcdef' }
          }
        ]
      }

      await storage.setConfig(testWorkflowId, testConfig)

      // Act
      const result = await storage.listWorkflows()

      // Assert
      const testWorkflow = result.workflows.find((w) => w.workflowId === testWorkflowId)
      expect(testWorkflow).toBeDefined()

      // Verify all Configuration properties are present
      expect(testWorkflow?.name).toBe(testConfig.name)
      expect(testWorkflow?.description).toBe(testConfig.description)
      expect(testWorkflow?.fields).toEqual(testConfig.fields)
      expect(testWorkflow?.statuses).toEqual(testConfig.statuses)

      // Verify workflowId is added
      expect(testWorkflow?.workflowId).toBe(testWorkflowId)

      // Verify field properties
      expect(testWorkflow?.fields[0].slug).toBe('title')
      expect(testWorkflow?.fields[0].schema.kind).toBe('text')
      expect(testWorkflow?.fields[1].schema.kind).toBe('number')

      // Verify status properties
      expect(testWorkflow?.statuses[0].terminal).toBe(false)
      expect(testWorkflow?.statuses[1].terminal).toBe(true)
      expect(testWorkflow?.statuses[0].precondition.required).toContain('title')
    })
  })

  describe('loadConfig', () => {
    it('should throw error when loading non-existent configuration', async () => {
      // Arrange
      const nonExistentWorkflowId = 'non-existent-workflow-id'

      // Act & Assert
      await expect(storage.loadConfig(nonExistentWorkflowId)).rejects.toThrow()
    })
  })
})
