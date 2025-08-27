import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { supportedWorkflows } from '@cadence/shared/defined'

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { workflowId, fieldSlug } = await request.json()

    if (!workflowId || !fieldSlug) {
      return json({ error: 'Missing required fields: workflowId, fieldSlug' }, { status: 400 })
    }

    // Validate workflow exists
    const workflow = supportedWorkflows.find(wf => wf.workflowId === workflowId)
    if (!workflow) {
      return json({ error: `Unknown workflow: ${workflowId}` }, { status: 404 })
    }

    // Find the field with LOV definition
    const field = workflow.fields.find(f => f.slug === fieldSlug)
    if (!field || field.schema.kind !== 'text' || !field.schema.lov) {
      return json({ error: `LOV field not found: ${fieldSlug}` }, { status: 404 })
    }

    // For now, return mock data since we need to implement the backend LOV fetching endpoint
    // TODO: Call the actual Firebase Function to get LOV data
    
    // Return different mock data based on the field being requested
    let mockEntries = []
    if (fieldSlug === 'projectCode') {
      // Mock project codes that would come from Google Sheets
      mockEntries = [
        { key: 'PROJ001', label: 'E-Commerce Platform Development', meta: {} },
        { key: 'PROJ002', label: 'Mobile App Redesign', meta: {} },
        { key: 'PROJ003', label: 'Data Analytics Dashboard', meta: {} },
        { key: 'PROJ004', label: 'Customer Portal Enhancement', meta: {} },
        { key: 'PROJ005', label: 'API Integration Services', meta: {} }
      ]
    } else {
      // Default mock data for other LOV fields
      mockEntries = [
        { key: 'option1', label: 'Option 1', meta: {} },
        { key: 'option2', label: 'Option 2', meta: {} },
        { key: 'option3', label: 'Option 3', meta: {} }
      ]
    }

    return json({ entries: mockEntries })
  } catch (error) {
    console.error('LOV API error:', error)
    return json({ error: 'Failed to fetch LOV data' }, { status: 500 })
  }
}