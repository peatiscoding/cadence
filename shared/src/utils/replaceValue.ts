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
 * - `$.[field]?` or `#.[field]?` - Optional marker: returns empty string if value is null/undefined
 * - `$.[field]` or `#.[field]` - Required marker: throws error if value is null/undefined
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
 * const config = { title: '$.title', priority: '#.priority' }
 * const result = replacer.replaceNested(config)
 * ```
 *
 * @throws Error When a required field (without '?' marker) is null or undefined
 */
export const withContext = (card: IWorkflowCard): ContextReplacer => {
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
    return val.replace(/(\$|#)\.([a-zA-Z0-9_]+)(\?)?/g, (wholeStr, type, key, optionalMarker) => {
      const isOptional = optionalMarker === '?'
      if (type === '#') return fieldGetter(key, !isOptional)
      else if (type === '$') return valueGetter(key, !isOptional)
      else return wholeStr
    })
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
