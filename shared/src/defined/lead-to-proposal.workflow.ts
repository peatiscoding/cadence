import type { WorkflowConfiguration } from '../types'

const LeadToProposalWorkflow: WorkflowConfiguration = {
  workflowId: 'ld2ppsl',
  name: 'Lead to Proposal',
  access: ['@muze.co.th'],
  nouns: {
    singular: 'Lead',
    plural: 'Leads'
  },
  approvals: [
    {
      slug: 'proposal-approved',
      title: 'Proposal Approved',
      allowed: [
        {
          kind: 'basic'
        }
      ]
    }
  ],
  types: [
    { slug: 'ma', title: 'MA', ui: { color: '#8866FF' } },
    { slug: 'sprint-based', title: 'Sprint Based', ui: { color: '#33FF88' } },
    { slug: 'project-based', title: 'Project Based', ui: { color: '#FF3388' } }
  ],
  fields: [
    {
      slug: 'projectCode',
      description: 'Project Code generated from the googlesheet',
      title: 'Project Code',
      schema: {
        kind: 'text',
        asDocumentId: true,
        lov: {
          provider: {
            kind: 'googlesheet',
            sheetId: '1ykshAFLUB_17Ypq5BEXDtKoeQ0uNiq_NwAjIknvjUjs',
            dir: 'TB',
            keyRange: 'A2:A',
            labelRange: 'B2:B'
          }
        }
      }
    },
    {
      slug: 'year',
      description: 'Fisical Year of this project',
      title: 'Year',
      schema: {
        kind: 'text'
      }
    },
    {
      slug: 'budgetLink',
      description: 'Google Sheet described Budget Link',
      title: 'Budget Link',
      schema: {
        kind: 'url'
      }
    },
    {
      slug: 'contactPoint',
      description: 'Email to contact once user proposal was sent',
      title: 'Contact Point',
      schema: {
        kind: 'text'
      }
    },
    {
      slug: 'reason',
      description: 'Why this lead is terminated?',
      title: 'Termination Reason',
      hiddenUnlessDefinedOrRequired: true,
      schema: {
        kind: 'multi-choice',
        choices: ['Timeline', 'Pricing/Budget', 'Politics']
      }
    }
  ],
  statuses: [
    {
      slug: 'brewing',
      title: 'Brewing',
      terminal: false,
      ui: {
        color: '#44FF55'
      },
      precondition: { from: ['draft'], required: ['year'] }
    },
    {
      slug: 'proposal-approved',
      title: 'Approved',
      terminal: false,
      ui: {
        color: '#44EE11'
      },
      precondition: {
        from: ['brewing'],
        required: ['$.value', 'budgetLink', 'contactPoint'],
        approvals: [{ key: 'proposal-approved' }] // must match
      },
      finally: [
        {
          kind: 'set-owner',
          to: '#.contactPoint'
        }
      ]
    },
    {
      slug: 'accepted',
      title: 'Accepted',
      terminal: true,
      ui: {
        color: '#4455FF'
      },
      precondition: {
        from: ['brewing', 'proposal-approved'],
        required: ['$.value', 'budgetLink']
      }
    },
    {
      slug: 'cancelled',
      title: 'Cancelled',
      terminal: true,
      ui: {
        color: '#EE4455'
      },
      precondition: { from: ['draft', 'brewing'], required: ['reason'] }
    }
  ]
}

export default LeadToProposalWorkflow
