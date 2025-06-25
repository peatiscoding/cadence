import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'
import type { IWorkflowCardEntry } from '$lib/models/interface'

import { STATUS_DRAFT, USE_SERVER_TIMESTAMP } from '$lib/persistent/constant'
import type { Configuration, Status } from '$lib/schema'

const _helpers = {
  validateUserPrecondition(condition: Status['precondition'], user: string): void {
    if (condition.users.length > 0 && !condition.users.includes(user)) {
      throw new Error(`User '${user}' is not authorized to perform this transition`)
    }
  },

  validateRequiredFieldsPrecondition(
    condition: Status['precondition'],
    card: IWorkflowCardEntry
  ): void {
    const missingFields: string[] = []

    for (const requiredField of condition.required) {
      if (
        !card.fieldData ||
        !(requiredField in card.fieldData) ||
        card.fieldData[requiredField] == null
      ) {
        missingFields.push(requiredField)
      }
    }

    if (missingFields.length > 0) {
      const fieldList = missingFields.map((field) => `'${field}'`).join(', ')
      const errorMessage =
        missingFields.length === 1
          ? `Required field ${fieldList} is missing or empty`
          : `Required fields ${fieldList} are missing or empty`
      throw new Error(errorMessage)
    }
  },

  validateFromStatusPrecondition(condition: Status['precondition'], currentStatus: string): void {
    if (condition.from.length > 0 && !condition.from.includes(currentStatus)) {
      throw new Error(`Cannot transition from status '${currentStatus}' to this status`)
    }
  }
}

export class WorkflowCardEngine implements IWorkflowCardEngine {
  public constructor(
    public readonly workflowId: string,
    public readonly config: Promise<Configuration>,
    protected readonly storage: IWorkflowCardStorage
  ) {
    //
  }

  async makeNewCard(
    userSsoId: string,
    creationPayload: IWorkflowCardEntryCreation
  ): Promise<string> {
    // TODO: Validate based on workflow's configuration
    return this.storage.createCard(this.workflowId, userSsoId, {
      ...creationPayload,
      status: STATUS_DRAFT,
      statusSince: USE_SERVER_TIMESTAMP
    })
  }

  async updateCardDetail(
    userSsoId: string,
    workflowCardId: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    if ((payload as any).status) {
      throw new Error(`Update status is disallowed`)
    }
    return this.storage.updateCard(this.workflowId, workflowCardId, userSsoId, payload)
  }

  async attemptToTransitCard(
    userSsoId: string,
    workflowCardId: string,
    toStatus: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    const config = await this.config
    // Validate if requested status is defined within configuration?
    const newStatusConfig = config.statuses.find((a) => a.slug === toStatus)
    if (!newStatusConfig) {
      throw new Error(`Unknown new status: ${toStatus}`)
    }

    // Get current card to validate preconditions
    const currentCard = await this.storage.getCard(this.workflowId, workflowCardId)

    // Validate its precondition
    const precondition = newStatusConfig.precondition
    _helpers.validateUserPrecondition(precondition, userSsoId)
    _helpers.validateRequiredFieldsPrecondition(precondition, currentCard)
    _helpers.validateFromStatusPrecondition(precondition, currentCard.status)

    // TODO: Run status configuration actions (hooks)
    // - ASK if actions must validate its input first?

    // All condition is now validated. Let's write the changes
    await this.storage.updateCard(this.workflowId, workflowCardId, userSsoId, {
      ...payload,
      status: toStatus,
      statusSince: USE_SERVER_TIMESTAMP
    })
    // TODO: Run post operations
  }

  async deleteCard(userSsoId: string, workflowCardId: string): Promise<void> {
    // TODO: Validate if user can delete the card based on workflow's configuration
    await this.storage.deleteCard(this.workflowId, workflowCardId)
  }
}
