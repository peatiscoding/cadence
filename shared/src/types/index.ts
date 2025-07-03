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

export type WorkflowConfiguration = z.infer<typeof ConfigurationSchema>
export type WorkflowField = z.infer<typeof FieldSchema>
export type WorkflowStatus = z.infer<typeof StatusSchema>
export type WorkflowType = z.infer<typeof TypeSchema>
export type IWorkflowCard = z.infer<typeof CardSchema>
export type IActionDefiniton = z.infer<typeof ActionUnionSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type User = z.infer<typeof UserSchema>
