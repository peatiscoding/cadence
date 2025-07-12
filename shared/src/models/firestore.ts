export const WORKFLOWS = 'workflows'
export const CARDS = 'cards'
export const ACTIVITIES = 'activities'
export const STATS = 'stats'

export const paths = {
  WORKFLOWS: WORKFLOWS,
  WORKFLOW_CONFIGURATION: (workflowId: string) => `${WORKFLOWS}/${workflowId}`,
  WORKFLOW_CARDS: (workflowId: string) => `${WORKFLOWS}/${workflowId}/${CARDS}`,
  WORKFLOW_CARD: (workflowId: string, workflowCardId: string) =>
    `${WORKFLOWS}/${workflowId}/${CARDS}/${workflowCardId}`,
  ACTIVITIES: ACTIVITIES,
  STATS_PER_STATUS: (workflowId: string, status: string) => `${STATS}/${workflowId}/per/${status}`
}

export const FIREBASE_REGION = 'asia-southeast2' as const
