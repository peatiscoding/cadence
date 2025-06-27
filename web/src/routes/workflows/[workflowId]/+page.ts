import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'

// Prevent ServerSide rendering.
export const ssr = false

export const load: PageLoad = async ({ params }) => {
  const { workflowId } = params

  if (!workflowId) {
    throw error(404, 'Workflow ID is required')
  }

  return {
    workflowId
  }
}
