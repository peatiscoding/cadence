import type { WorkflowConfiguration } from '../types'

const LeadToProposalWorkflow: WorkflowConfiguration & { workflowId: string } = {
  workflowId: 'ld2ppsl',
  name: 'Lead to Proposal',
  access: ['@muze.co.th'],
  types: [
    { slug: 'ma', title: 'MA', ui: { color: '#8866FF' } },
    { slug: 'sprint-based', title: 'Sprint Based', ui: { color: '#33FF88' } },
    { slug: 'project-based', title: 'Project Based', ui: { color: '#FF3388' } }
  ],
  fields: [
    {
      slug: 'year',
      description: 'Fisical Year of this project',
      title: 'Year',
      schema: {
        kind: 'text'
      }
    },
    {
      slug: 'proposal-link',
      description: 'Google Document Link to active proposal',
      title: 'Proposal Link',
      schema: {
        kind: 'url'
      }
    },
    {
      slug: 'reason',
      description: 'Why this lead is terminated?',
      title: 'Termination Reason',
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
      precondition: { from: ['draft'] }
    },
    {
      slug: 'proposal-sent',
      title: 'Proposal Sent',
      terminal: false,
      ui: {
        color: '#44EE11'
      },
      precondition: {
        from: ['brewing'],
        required: ['$.value', 'proposal-link']
      }
    },
    {
      slug: 'accepted',
      title: 'Accepted',
      terminal: true,
      ui: {
        color: '#4455FF'
      },
      precondition: {
        from: ['brewing', 'proposal-sent'],
        required: ['$.value', 'proposal-link']
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
