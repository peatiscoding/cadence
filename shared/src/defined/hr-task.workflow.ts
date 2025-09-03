import type { WorkflowConfiguration } from '../types'

const HrTaskWorkflow: WorkflowConfiguration & { workflowId: string } = {
  workflowId: 'hr-task',
  name: 'HR Task',
  access: [
    'dachopol.w@muze.co.th',
    'yanisa@muze.co.th',
    'vichuda.t@muze.co.th',
    'peeranuch.k@muze.co.th',
    'chitipat@muze.co.th',
    'kittiphat@muze.co.th'
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
      description: "Email of the task's creator for notifications.",
      schema: {
        kind: 'choice',
        choices: [
          'chitipat@muze.co.th',
          'yanisa@muze.co.th',
          'vichuda.t@muze.co.th',
          'peeranuch.k@muze.co.th',
          'dachopol.w@muze.co.th'
        ]
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

  initialValues: {
    type: 'general',
    // owner: 'chitipat+1@muze.co.th'
    owner: 'dachopol.w@muze.co.th'
  },

  statuses: [
    {
      slug: 'reviewing',
      title: 'Reviewing',
      terminal: false,
      ui: {
        color: '#FFB800'
      },
      precondition: {
        from: ['draft', 'revising'],
        required: ['contactPoint']
      },
      finally: [
        {
          kind: 'send-email',
          to: '$.owner',
          subject: '[Cadence-HR] New Task for Review: $.title',
          message: `
            Hello,

            A new task "$.title" has been submitted and is waiting for your review.

            Please review it by the due date: #.dueDate?.
            Link: #.link?.

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
        required: ['feedback']
      },
      finally: [
        {
          kind: 'send-email',
          to: '#.contactPoint',
          subject: '[Cadence-HR] Revision Required: $.title',
          message: `
            Hi,

            The task "$.title" that you submitted requires revision.

            Feedback from the reviewer:
            "#.feedback"

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
      },
      finally: [
        {
          kind: 'send-email',
          to: '#.contactPoint',
          subject: '[Cadence-HR] Approved: $.title',
          message: `
            Hi,

            Great news! The task "$.title" that you submitted has been approved.

            Thank you for your hard work.
          `
        }
      ]
    }
  ]
}

export default HrTaskWorkflow
