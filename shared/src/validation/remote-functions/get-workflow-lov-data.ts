import { z } from 'zod'

export const GetWorkflowLovDataRequestSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required')
})