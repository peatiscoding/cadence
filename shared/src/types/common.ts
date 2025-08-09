/**
 * Shared TypeScript type definitions for Cadence
 *
 * Common types that are used across frontend and backend
 */
import z from 'zod'
import {
  CardSchema,
  ConfigurationSchema,
  FieldSchema,
  StatusSchema,
  TypeSchema,
  ActionUnionSchema,
  ApiErrorSchema,
  UserSchema
} from '../validation'
import {
  LovDefinitionSchema,
  LovProviderDefinitionSchema,
  LovAPIDefinitionSchema,
  LovGoogleSheetDefinitionSchema
} from '../validation/configuration/lovs'

export type WorkflowConfiguration = z.infer<typeof ConfigurationSchema>
export type WorkflowField = z.infer<typeof FieldSchema>
export type WorkflowStatus = z.infer<typeof StatusSchema>
export type WorkflowType = z.infer<typeof TypeSchema>
export type IWorkflowCard = z.infer<typeof CardSchema>
export type IActionDefiniton = z.infer<typeof ActionUnionSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type User = z.infer<typeof UserSchema>
export type LovAPIDefinition = z.infer<typeof LovAPIDefinitionSchema>
export type LovGoogleSheetDefinition = z.infer<typeof LovGoogleSheetDefinitionSchema>
export type LovProviderDefinition = z.infer<typeof LovProviderDefinitionSchema>
export type LovDefinition = z.infer<typeof LovDefinitionSchema>

export interface IWorkflowCardEntry extends IWorkflowCard {
  /**
   * Epoch since status changed
   */
  statusSince: number
  /**
   * author
   */
  createdBy: string
  /**
   * Epoch since card was created
   */
  createdAt: number
  /**
   * Updated By
   */
  updatedBy: string
  /**
   * Epoch since card was created
   */
  updatedAt: number
}

export interface IRunnerOption {
  /**
   * Notify the runner to execute all actions in parallel
   */
  runInParallel: boolean
}

export interface IActionExecutor<
  K extends IActionDefiniton['kind'],
  Def = Extract<IActionDefiniton, { kind: K }>
> {
  /**
   * Get Exeution's kind
   */
  get kind(): IActionDefiniton['kind']

  /**
   * Perform any action
   */
  execute(cardContext: IWorkflowCard, action: Def): Promise<void>
}

export interface IActionRunner {
  /**
   * Runner is a logical class that orchestrate running sequence and manage the errornous of the result.
   *
   * @returns number of milliseconds took per each actions to complete.
   */
  run(
    cardContext: IWorkflowCard,
    actions: IActionDefiniton[],
    runOptions: IRunnerOption
  ): Promise<number[]>
}

// HttpsOnCall Response & Request
export interface IOnCallErrorResponse {
  success: false
  reason: Error
}

export interface IOnCallSuccessResponse<T> {
  success: true
  result: T
}

export type IOnCallResponse<T> = IOnCallSuccessResponse<T> | IOnCallErrorResponse
