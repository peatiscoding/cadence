export interface GetWorkflowLovDataRequest {
  workflowId: string
}

export interface GetWorkflowLovDataResponse {
  workflowId: string
  lovData: Record<string, Array<{
    key: string
    label: string
    meta?: any
  }>>
  success: boolean
}