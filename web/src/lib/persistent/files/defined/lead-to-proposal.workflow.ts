import type { Configuration } from '$lib/schema'

const LeadToProposalWorkflow: Configuration & { workflowId: string } = {
  workflowId: 'ld2ppsl',
  name: 'Lead to Proposal',
  types: [
    { slug: 'ma', title: 'MA', ui: { color: '#8866FF' } },
    { slug: 'sprint-development', title: 'Sprint Dev', ui: { color: '#33FF88' } },
    { slug: 'venture', title: 'Venture', ui: { color: '#FF3388' } }
  ],
  fields: [
    {
      slug: 'proposal-link',
      description: 'Google Document Link to active proposal',
      title: 'Proposal Link',
      schema: {
        kind: 'url'
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
        required: ['value']
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
        required: ['value']
      }
    },
    {
      slug: 'cancelled',
      title: 'Cancelled',
      terminal: true,
      ui: {
        color: '#EE4455'
      },
      precondition: { from: ['draft', 'brewing'] }
    }
  ]
}

export default LeadToProposalWorkflow
