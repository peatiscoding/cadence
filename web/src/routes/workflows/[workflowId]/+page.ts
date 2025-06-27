import { error } from '@sveltejs/kit'
import { FirestoreWorkflowCardStorage } from '$lib/persistent/firebase/firestore'
import type { PageLoad } from './$types'

// Prevent ServerSide rendering.
export const ssr = false

export const load: PageLoad = async ({ params }) => {
  const { workflowId } = params

  if (!workflowId) {
    throw error(404, 'Workflow ID is required')
  }

  try {
    const storage = FirestoreWorkflowCardStorage.shared()
    const configuration = await storage.loadConfig(workflowId)

    if (!configuration) {
      throw error(404, 'Workflow not found')
    }

    return {
      workflowId,
      configuration,
      cards: []
    }
  } catch (err) {
    console.error('Error loading workflow:', err)
    throw error(500, 'Failed to load workflow')
  }
}

