/**
 * Provision User Remote Function Validation Schemas
 */

import { z } from 'zod'

/**
 * Schema for ProvisionUserRequest
 */
export const ProvisionUserRequestSchema = z
  .object({
    // Empty for now, but ready for future fields
  })
  .strict()

/**
 * Schema for UserInfo embedded in response
 */
const UserInfoSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(['user', 'admin']),
  createdAt: z.any(), // Firestore Timestamp - hard to validate precisely
  lastUpdated: z.any() // Firestore Timestamp - hard to validate precisely
})

/**
 * Schema for ProvisionUserResponse
 */
export const ProvisionUserResponseSchema = z.object({
  success: z.boolean(),
  userInfo: UserInfoSchema,
  wasCreated: z.boolean()
})

/**
 * Type inference from schemas
 */
export type ProvisionUserRequest = z.infer<typeof ProvisionUserRequestSchema>
export type ProvisionUserResponse = z.infer<typeof ProvisionUserResponseSchema>

/**
 * Validation helper functions
 */
export function validateProvisionUserRequest(data: unknown): ProvisionUserRequest {
  return ProvisionUserRequestSchema.parse(data)
}

export function validateProvisionUserResponse(data: unknown): ProvisionUserResponse {
  return ProvisionUserResponseSchema.parse(data)
}

