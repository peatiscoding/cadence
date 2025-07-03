export const WORKFLOWS = 'workflows'
export const CARDS = 'cards'

export const paths = {
  WORKFLOWS: WORKFLOWS,
  WORKFLOW_CONFIGURATION: (workflowId: string) => `${WORKFLOWS}/${workflowId}`,
  WORKFLOW_CARDS: (workflowId: string) => `${WORKFLOWS}/${workflowId}/${CARDS}`,
  WORKFLOW_CARD: (workflowId: string, workflowCardId: string) =>
    `${WORKFLOWS}/${workflowId}/${CARDS}/${workflowCardId}`
}
