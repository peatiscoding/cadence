import type { Configuration } from '$lib/schema'

export const sampleWorkflow: Configuration = {
  name: 'Bug Tracking Workflow',
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
