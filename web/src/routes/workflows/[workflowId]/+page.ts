import type { PageLoad } from './$types'
import { error } from '@sveltejs/kit'

export const load: PageLoad = async ({ params }) => {
  const { workflowId } = params

  if (!workflowId) {
    throw error(404, 'Workflow ID is required')
  }

  return {
    workflowId
  }
}
