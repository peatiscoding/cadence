import type { IWorkflowCardStorage } from '$lib/persistent/interface'
import type { Configuration, Status } from '$lib/schema'
import type {
  IWorkflowCardEngine,
  IWorkflowCardEntryCreation,
  IWorkflowCardEntryModification
} from './interface'
import { STATUS_DRAFT } from '$lib/models/status'
import { USE_SERVER_TIMESTAMP } from '$lib/persistent/constant'
import type { IAuthenticationProvider } from '$lib/authentication/interface'
import { z } from 'zod'

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

    // Validate payload against workflow configuration
    const schema = await this.getCardSchema(STATUS_DRAFT)
    try {
      schema.parse(creationPayload)
    } catch (error) {
      throw new Error(
        `Card validation failed: ${error instanceof z.ZodError ? error.errors.map((e) => e.message).join(', ') : error}`
      )
    }

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

    // If type is being updated, validate it against allowed types
    if (payload.type !== undefined) {
      const config = await this.config
      const allowedTypes = config.types?.map((type) => type.slug) || []
      if (allowedTypes.length > 0 && !allowedTypes.includes(payload.type)) {
        throw new Error(
          `Invalid card type: ${payload.type}. Allowed types: ${allowedTypes.join(', ')}`
        )
      }
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
    _helpers.validateUser(precondition.users || [], userSsoId)
    _helpers.validateRequiredFields(precondition.required || [], currentCard.fieldData)
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

  async getNextStatuses(currentCardStatus: string): Promise<Status[]> {
    const config = await this.config
    const currentUser = await this.auth.getCurrentUid()

    // Get all statuses that can be transitioned to from the current status
    const nextStatuses = config.statuses.filter((status) => {
      // Skip current status
      if (status.slug === currentCardStatus) {
        return false
      }

      const precondition = status.precondition

      // Check if transition from current status is allowed
      if (precondition.from.length > 0 && !precondition.from.includes(currentCardStatus)) {
        return false
      }

      // Check if current user is authorized
      if (precondition.users && precondition.users.length > 0 && !precondition.users.includes(currentUser)) {
        return false
      }

      return true
    })

    return nextStatuses
  }

  async getCardSchema(status: string = STATUS_DRAFT): Promise<z.ZodObject<any>> {
    const config = await this.config

    // Find the status configuration
    const statusConfig = config.statuses.find((s) => s.slug === status)

    // Only throw error for unknown status if it's not the default 'draft' status
    // Draft is a default status that may not be explicitly defined in configuration
    if (!statusConfig && status !== STATUS_DRAFT) {
      throw new Error(`Unknown status: ${status}`)
    }

    // For draft status or undefined status configs, use empty requirements
    const requiredFields = statusConfig?.precondition?.required || []

    // Build type validation schema
    const allowedTypes = config.types?.map((type) => type.slug) || []
    let typeSchema: z.ZodTypeAny
    if (allowedTypes.length > 0) {
      typeSchema = z.enum(allowedTypes as [string, ...string[]], {
        errorMap: () => ({ message: 'Invalid card type' })
      })
    } else {
      typeSchema = z.string().default('')
    }

    // Build fieldData schema based on workflow field definitions
    const fieldDataSchema: Record<string, z.ZodTypeAny> = {}

    for (const field of config.fields) {
      const isRequired = requiredFields.includes(field.slug)
      let fieldSchema: z.ZodTypeAny

      // Map field schema types to Zod schemas
      switch (field.schema.kind) {
        case 'number':
          let numSchema = z.number()
          if (field.schema.min !== undefined) {
            numSchema = numSchema.min(field.schema.min)
          }
          if (field.schema.max !== undefined) {
            numSchema = numSchema.max(field.schema.max)
          }
          fieldSchema = numSchema
          break

        case 'text':
          let textSchema = z.string()
          if (field.schema.min !== undefined) {
            textSchema = textSchema.min(field.schema.min)
          }
          if (field.schema.max !== undefined) {
            textSchema = textSchema.max(field.schema.max)
          }
          if (field.schema.regex) {
            textSchema = textSchema.regex(new RegExp(field.schema.regex))
          }
          fieldSchema = textSchema
          break

        case 'choice':
          const choices = field.schema.choices || []
          fieldSchema = z.enum(choices.length > 0 ? (choices as [string, ...string[]]) : [''])
          break

        case 'multi-choice':
          const multiChoices = field.schema.choices || []
          fieldSchema = z.array(
            z.enum(multiChoices.length > 0 ? (multiChoices as [string, ...string[]]) : [''])
          )
          break

        case 'bool':
          fieldSchema = z.boolean()
          break

        case 'url':
          fieldSchema = z.string().url('Must be a valid URL')
          break

        default:
          fieldSchema = z.any()
      }

      // Make field required if it's in the required list
      if (isRequired) {
        // For required fields, add specific validation messages
        if (field.schema.kind === 'text') {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.title} is required`)
        }
      } else {
        fieldSchema = fieldSchema.optional()

        // Only apply defaults to optional fields
        if ('default' in field.schema && field.schema.default !== undefined) {
          switch (field.schema.kind) {
            case 'number':
            case 'text':
            case 'choice':
            case 'bool':
              fieldSchema = fieldSchema.default(field.schema.default)
              break
            case 'multi-choice':
              if (typeof field.schema.default === 'string') {
                fieldSchema = fieldSchema.default(field.schema.default.split(','))
              }
              break
          }
        }
      }

      fieldDataSchema[field.slug] = fieldSchema
    }

    // Build the base schema object with core card fields (excluding implicit fields)
    const schemaFields: Record<string, z.ZodTypeAny> = {
      title: z.string().min(1, 'Title is required'),
      description: z.string().default(''),
      value: z.number().default(0),
      type: typeSchema,
      owner: z.string().default(''),
      fieldData: z.object(fieldDataSchema).default({})
    }

    return z.object(schemaFields)
  }
}
