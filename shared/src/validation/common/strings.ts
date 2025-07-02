import { z } from 'zod'

// Common field validation
export const EmailSchema = z.string().email()
export const UrlSchema = z.string().url()
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/)
export const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

// Validation utility functions
export const validateEmail = (email: string): boolean => {
  return EmailSchema.safeParse(email).success
}

export const validateUrl = (url: string): boolean => {
  return UrlSchema.safeParse(url).success
}

export const validateSlug = (slug: string): boolean => {
  return SlugSchema.safeParse(slug).success
}

export const validateColor = (color: string): boolean => {
  return ColorSchema.safeParse(color).success
}
