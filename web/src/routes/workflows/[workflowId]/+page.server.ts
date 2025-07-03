import type { EntryGenerator } from './$types'
import { supportedWorkflows } from '@cadence/shared/defined'

export const prerender = true

export const entries: EntryGenerator = () =>
  supportedWorkflows.map(({ workflowId }) => ({ workflowId }))
