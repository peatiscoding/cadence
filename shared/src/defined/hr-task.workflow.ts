import type { WorkflowConfiguration } from '../types'

const HrTaskWorkflow: WorkflowConfiguration & { workflowId: string } = {
  workflowId: 'hr-task',
  name: 'HR Task',
  access: [
    'dachopol.w@muze.co.th',
    'yanisa@muze.co.th',
    'vichuda.t@muze.co.th',
    'peeranuch.k@muze.co.th',
    'chitipat@muze.co.th'
  ],
  nouns: {
    singular: 'Task',
    plural: 'Tasks'
  },
  types: [{ slug: 'general', title: 'General', ui: { color: '#3388FF' } }],
  fields: [
    {
      slug: 'contactPoint',
      title: 'Contact Point',
      description: 'Email of the task reviewer.',
      schema: {
        kind: 'text'
      }
    },
    {
      slug: 'link',
      title: 'Document Link',
      description: 'Main document link.',
      schema: {
        kind: 'url'
      }
    },
    {
      slug: 'refLink',
      title: 'Reference Link',
      description: 'Other reference links.',
      schema: {
        kind: 'url'
      }
    },
    {
      slug: 'dueDate',
      title: 'Due Date',
      description: 'Task due date (e.g., YYYY-MM-DD).',
      schema: {
        kind: 'text'
      }
    },
    {
      slug: 'feedback',
      title: 'Feedback / Revision Reason',
      description: 'Reason for revision.',
      hiddenUnlessDefinedOrRequired: true,
      schema: {
        kind: 'text'
      }
    }
  ],
  statuses: [
    {
      slug: 'todo',
      title: 'To Do',
      terminal: false,
      ui: {
        color: '#CCCCCC'
      },
      precondition: {
        from: []
      }
    },
    {
      slug: 'reviewing',
      title: 'Reviewing',
      terminal: false,
      ui: {
        color: '#FFB800'
      },
      precondition: {
        from: ['todo', 'revising'],
        users: ['#.createdBy'], // Only creator can submit/re-submit for review
        required: ['contactPoint']
      },
      finally: [
        {
          kind: 'set-owner',
          to: '#.createdBy'
        },
        {
          kind: 'send-email',
          to: '#.value.contactPoint',
          subject: '[Cadence-HR] New Task for Review: {{card.title}}',
          message: `
            Hello,

            A new task "{{card.title}}" has been submitted by {{actor.displayName}} and is waiting for your review.

            Please review it by the due date: {{card.value.dueDate}}.
            Link: {{card.value.link}}

            Thank you.
          `
        }
      ]
    },
    {
      slug: 'revising',
      title: 'Revising',
      terminal: false,
      ui: {
        color: '#F44336'
      },
      precondition: {
        from: ['reviewing'],
        // Note: No user restriction on who can send for revision
        required: ['feedback']
      },
      finally: [
        {
          kind: 'send-email',
          to: '#.createdBy',
          subject: '[Cadence-HR] Revision Required: {{card.title}}',
          message: `
            Hi {{card.createdBy.displayName}},

            The task "{{card.title}}" requires revision.

            Feedback from {{actor.displayName}}:
            "{{card.value.feedback}}"

            Please make the necessary changes and resubmit.

            Thank you.
          `
        }
      ]
    },
    {
      slug: 'approved',
      title: 'Approved',
      terminal: true,
      ui: {
        color: '#4CAF50'
      },
      precondition: {
        from: ['reviewing']
        // Note: No user restriction on who can approve
      },
      finally: [
        {
          kind: 'send-email',
          to: '#.createdBy',
          subject: '[Cadence-HR] Approved: {{card.title}}',
          message: `
            Hi {{card.createdBy.displayName}},

            Great news! The task "{{card.title}}" has been approved by {{actor.displayName}}.

            Thank you for your hard work.
          `
        }
      ]
    }
  ]
}

export default HrTaskWorkflow
