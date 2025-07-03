import type { WorkflowStatus } from '../types'

export const STATUS_DRAFT = 'draft'

export const draftStatus: WorkflowStatus = {
  title: 'Draft',
  ui: {
    color: '#6B7280'
  },
  slug: STATUS_DRAFT,
  terminal: false,
  precondition: {
    from: []
  }
}

export const unknownStatus = (slug: string): WorkflowStatus => {
  return {
    title: `${slug}`.toUpperCase(),
    ui: {
      color: '#FF3385'
    },
    slug: slug,
    terminal: false,
    precondition: { from: [] }
  }
}
