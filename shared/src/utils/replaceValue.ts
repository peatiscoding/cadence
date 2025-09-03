import type { IWorkflowCard } from '../types'

interface ContextReplacer {
  /**
   * Recursively replaces placeholders in nested objects
   *
   * @param val - Nested object with string values to replace
   * @returns New object with placeholders replaced, preserving structure
   */
  replace<T extends any>(val: T): T
}

/**
 * Utility method that will look for specific pattern and replace it with context value
 *
 * Pattern formats:
 * - `$.[card's field]` will replace with its corresponding card field such as `value`, `author`, `workflowId`, `title`.
 * - `#.[card's fieldData]` will replace with its corresponding card's Field Data.
 * - `@.[approval-key]` will replace with the author of the latest valid approval token for the given key.
 * - `$.[field]?`, `#.[field]?`, or `@.[field]?` - Optional marker: returns empty string if value is null/undefined
 * - `$.[field]`, `#.[field]`, or `@.[field]` - Required marker: throws error if value is null/undefined
 *
 * @param card - The workflow card to extract values from
 * @returns ContextReplacer object with replace and replaceNested methods
 *
 * @example
 * ```typescript
 * const replacer = withContext(card)
 *
 * // String replacement - throws error if undefined
 * replacer.replace('Title: $.title')
 *
 * // Optional field - returns empty string if undefined
 * replacer.replace('Description: $.description?')
 *
 * // Nested object replacement
 * const config = { title: '$.title', priority: '#.priority', '@.approval-key' }
 * const result = replacer.replaceNested(config)
 * ```
 *
 * @throws Error When a required field (without '?' marker) is null or undefined
 */
export const withContext = (card: IWorkflowCard): ContextReplacer => {
  const approvalGetter = (approvalKey: string, isRequired: boolean): string => {
    const tokens = (card.approvalTokens || {})[approvalKey] || []
    const activeTokens = tokens.filter((token) => !token.voided)

    if (activeTokens.length === 0) {
      if (isRequired) {
        throw new Error(`Cannot replace '@.${approvalKey}' the approval token is required`)
      }
      return ''
    }

    // Get the latest active token
    const latestToken = activeTokens.sort((a, b) => b.date - a.date)[0]
    return latestToken.author
  }
  const valueGetter = (key: keyof IWorkflowCard, isRequired: boolean): string => {
    const val = card[key]
    if (typeof val === 'undefined' || val === null) {
      if (isRequired) {
        throw new Error(`Cannot replace '$.${key}' the value is required`)
      }
      return ''
    }
    return `${val}`
  }
  const fieldGetter = (fieldKey: string, isRequired: boolean): string => {
    const val = card.fieldData[fieldKey]
    if (typeof val === 'undefined' || val === null) {
      if (isRequired) {
        throw new Error(`Cannot replace '#.${fieldKey}' the value is required`)
      }
      return ''
    }
    return val
  }
  const _replaceVal = (val: string): string => {
    return val.replace(
      /(\$|#|@)\.([a-zA-Z0-9_-]+)(\?)?/g,
      (wholeStr, type, key, optionalMarker) => {
        const isOptional = optionalMarker === '?'
        if (type === '#') return fieldGetter(key, !isOptional)
        else if (type === '$') return valueGetter(key, !isOptional)
        else if (type === '@') return approvalGetter(key, !isOptional)
        else return wholeStr
      }
    )
  }
  const replaceNested = <T extends any>(val: T): T => {
    // Replacable types
    if (typeof val === 'string') {
      return _replaceVal(val) as any
    } else if (Array.isArray(val)) {
      const arr = new Array<any>(val.length)
      for (let i = 0; i < arr.length; i++) {
        arr[i] = replaceNested(val[i])
      }
      return arr as any
    } else if (typeof val === 'object' && val !== null) {
      const r: any = {}
      for (const k of Object.keys(val)) {
        r[k] = replaceNested((val as any)[k])
      }
      return r
    }
    return val
  }
  return {
    replace: replaceNested
  }
}
