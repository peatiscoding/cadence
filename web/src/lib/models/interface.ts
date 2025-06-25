export interface IWorkflowCardEntry {
  workflowId: string
  workflowCardId: string
  title: string
  description: string
  fieldData: Record<string, any>
  value: number
  type: string
  owner: string
  status: string
  statusSince: Date
  createdBy: string
  createdAt: number
  updatedBy: string
  updatedAt: number
}
