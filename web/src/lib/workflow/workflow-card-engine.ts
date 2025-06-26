import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type { Configuration } from '$lib/schema'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'

import { STATUS_DRAFT, USE_SERVER_TIMESTAMP } from '$lib/persistent/constant'
import type { IAuthenticationProvider } from '$lib/authentication/interface'

const _helpers = {
  validateRequiredFields<T>(requiredFields: (keyof T)[], data: T) {
    const missingFields: (keyof T)[] = []

    for (const requiredField of requiredFields) {
      if (data[requiredField] === null || data[requiredField] === undefined) {
        missingFields.push(requiredField)
      }
    }

    if (missingFields.length > 0) {
      const fieldList = missingFields.join(`', '`)
      const errorMessage =
        missingFields.length === 1
          ? `Required field '${fieldList}' is missing or empty`
          : `Required fields '${fieldList}' are missing or empty`
      throw new Error(errorMessage)
    }
  },
  validateUser(userList: string[], user: string): void {
    if (userList.length > 0 && !userList.includes(user)) {
      throw new Error(`User '${user}' is not authorized to perform this transition`)
    }
  },

  validateFromStatus(requiredStatuses: string[], currentStatus: string): void {
    if (requiredStatuses.length > 0 && !requiredStatuses.includes(currentStatus)) {
      throw new Error(`Cannot transition from status '${currentStatus}' to this status`)
    }
  }
}

export class WorkflowCardEngine implements IWorkflowCardEngine {
  public constructor(
    public readonly workflowId: string,
    public readonly config: Promise<Configuration>,
    public readonly auth: IAuthenticationProvider,
    protected readonly storage: IWorkflowCardStorage
  ) {
    //
  }

  async makeNewCard(creationPayload: IWorkflowCardEntryCreation): Promise<string> {
    const userSsoId = await this.auth.getCurrentUid()
    // TODO: Validate based on workflow's configuration
    return this.storage.createCard(this.workflowId, userSsoId, {
      ...creationPayload,
      status: STATUS_DRAFT,
      statusSince: USE_SERVER_TIMESTAMP
    })
  }

  async updateCardDetail(
    workflowCardId: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    if ((payload as any).status) {
      throw new Error(`Update status is disallowed`)
    }
    const userSsoId = await this.auth.getCurrentUid()
    return this.storage.updateCard(this.workflowId, workflowCardId, userSsoId, payload)
  }

  async attemptToTransitCard(
    workflowCardId: string,
    toStatus: string,
    payload: IWorkflowCardEntryModification
  ): Promise<void> {
    const userSsoId = await this.auth.getCurrentUid()
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
    _helpers.validateUser(precondition.users, userSsoId)
    _helpers.validateRequiredFields(precondition.required, currentCard.fieldData)
    _helpers.validateFromStatus(precondition.from, currentCard.status)

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

  async deleteCard(workflowCardId: string): Promise<void> {
    // TODO: Validate if user can delete the card based on workflow's configuration
    await this.storage.deleteCard(this.workflowId, workflowCardId)
  }
}
