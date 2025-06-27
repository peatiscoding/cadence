import type { Configuration } from '$lib/schema'
import type { IWorkflowCardEntry } from '$lib/models/interface'

export const sampleWorkflow: Configuration = {
  name: 'Bug Tracking Workflow',
  description: 'Track and manage your workflow items through different stages',
  fields: [
    {
      slug: 'title',
      title: 'Title',
      description: 'Bug title',
      schema: { kind: 'text', min: 1, max: 100 }
    },
    {
      slug: 'priority',
      title: 'Priority',
      description: 'Bug priority level',
      schema: {
        kind: 'choice',
        choices: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
      }
    },
    {
      slug: 'assignee',
      title: 'Assignee',
      description: 'Person assigned to fix the bug',
      schema: { kind: 'text', max: 50 }
    },
    {
      slug: 'estimated_hours',
      title: 'Estimated Hours',
      description: 'Time estimate to fix',
      schema: { kind: 'number', min: 0, max: 40, default: 2 }
    }
  ],
  statuses: [
    {
      slug: 'open',
      title: 'Open',
      terminal: false,
      ui: { color: '#3B82F6' },
      precondition: { from: [], required: ['title'], users: [] },
      transition: [],
      finally: []
    },
    {
      slug: 'in-progress',
      title: 'In Progress',
      terminal: false,
      ui: { color: '#F59E0B' },
      precondition: { from: ['open'], required: ['assignee'], users: [] },
      transition: [],
      finally: []
    },
    {
      slug: 'review',
      title: 'Code Review',
      terminal: false,
      ui: { color: '#8B5CF6' },
      precondition: { from: ['in-progress'], required: [], users: [] },
      transition: [],
      finally: []
    },
    {
      slug: 'testing',
      title: 'Testing',
      terminal: false,
      ui: { color: '#06B6D4' },
      precondition: { from: ['review'], required: [], users: [] },
      transition: [],
      finally: []
    },
    {
      slug: 'closed',
      title: 'Closed',
      terminal: true,
      ui: { color: '#10B981' },
      precondition: { from: ['testing'], required: [], users: [] },
      transition: [],
      finally: []
    }
  ]
}

export const sampleCards: Record<string, IWorkflowCardEntry[]> = {
  open: [
    {
      workflowId: 'bug-tracking',
      workflowCardId: '1',
      title: 'Login form validation error',
      description: 'Form validation is not working properly on the login page',
      fieldData: { priority: 'High', assignee: '', estimated_hours: 4 },
      value: 100,
      type: 'bug',
      owner: '',
      status: 'open',
      statusSince: Date.now() - 86400000, // 1 day ago
      createdBy: 'user@example.com',
      createdAt: Date.now() - 172800000, // 2 days ago
      updatedBy: 'user@example.com',
      updatedAt: Date.now() - 86400000
    },
    {
      workflowId: 'bug-tracking',
      workflowCardId: '2',
      title: 'Page loading too slow',
      description: 'Dashboard page takes more than 5 seconds to load',
      fieldData: { priority: 'Medium', assignee: '', estimated_hours: 6 },
      value: 75,
      type: 'performance',
      owner: '',
      status: 'open',
      statusSince: Date.now() - 43200000, // 12 hours ago
      createdBy: 'user2@example.com',
      createdAt: Date.now() - 43200000,
      updatedBy: 'user2@example.com',
      updatedAt: Date.now() - 43200000
    }
  ],
  'in-progress': [
    {
      workflowId: 'bug-tracking',
      workflowCardId: '3',
      title: 'Database connection timeout',
      description: 'Database queries are timing out after 30 seconds',
      fieldData: { priority: 'Critical', assignee: 'John Doe', estimated_hours: 8 },
      value: 200,
      type: 'bug',
      owner: 'john.doe@example.com',
      status: 'in-progress',
      statusSince: Date.now() - 21600000, // 6 hours ago
      createdBy: 'admin@example.com',
      createdAt: Date.now() - 259200000, // 3 days ago
      updatedBy: 'john.doe@example.com',
      updatedAt: Date.now() - 21600000
    }
  ],
  review: [
    {
      workflowId: 'bug-tracking',
      workflowCardId: '4',
      title: 'UI alignment issues',
      description: 'Mobile layout has alignment problems on several pages',
      fieldData: { priority: 'Low', assignee: 'Jane Smith', estimated_hours: 3 },
      value: 50,
      type: 'ui',
      owner: 'jane.smith@example.com',
      status: 'review',
      statusSince: Date.now() - 7200000, // 2 hours ago
      createdBy: 'designer@example.com',
      createdAt: Date.now() - 432000000, // 5 days ago
      updatedBy: 'jane.smith@example.com',
      updatedAt: Date.now() - 7200000
    }
  ],
  testing: [
    {
      workflowId: 'bug-tracking',
      workflowCardId: '5',
      title: 'Search functionality broken',
      description: 'Search returns no results even with valid queries',
      fieldData: { priority: 'High', assignee: 'Bob Wilson', estimated_hours: 5 },
      value: 150,
      type: 'bug',
      owner: 'bob.wilson@example.com',
      status: 'testing',
      statusSince: Date.now() - 3600000, // 1 hour ago
      createdBy: 'tester@example.com',
      createdAt: Date.now() - 345600000, // 4 days ago
      updatedBy: 'bob.wilson@example.com',
      updatedAt: Date.now() - 3600000
    }
  ],
  closed: [
    {
      workflowId: 'bug-tracking',
      workflowCardId: '6',
      title: 'Header responsive design',
      description: 'Header was not responsive on tablet devices',
      fieldData: { priority: 'Medium', assignee: 'Alice Johnson', estimated_hours: 2 },
      value: 80,
      type: 'ui',
      owner: 'alice.johnson@example.com',
      status: 'closed',
      statusSince: Date.now() - 1800000, // 30 minutes ago
      createdBy: 'designer@example.com',
      createdAt: Date.now() - 604800000, // 7 days ago
      updatedBy: 'alice.johnson@example.com',
      updatedAt: Date.now() - 1800000
    }
  ]
}
