import type { EntryGenerator } from './$types'
import { supportedWorkflows } from '$lib/persistent/files/defined'

export const prerender = true

export const entries: EntryGenerator = () =>
  supportedWorkflows.map(({ workflowId }) => ({ workflowId }))
