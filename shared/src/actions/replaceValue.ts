import { IWorkflowCard } from '../validation'

interface ContextReplacer {
  replace(val: string): string
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
 * @returns ContextReplacer object with replace method
 * 
 * @example
 * ```typescript
 * const replacer = withContext(card)
 * 
 * // Required field - throws error if undefined
 * replacer.replace('Title: $.title') 
 * 
 * // Optional field - returns empty string if undefined
 * replacer.replace('Description: $.description?')
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
  const replace = (val: string): string => {
    return val.replace(/(\$|#)\.([a-zA-Z0-9_]+)(\?)?/g, (wholeStr, type, key, optionalMarker) => {
      const isOptional = optionalMarker === '?'
      if (type === '#') return fieldGetter(key, !isOptional)
      else if (type === '$') return valueGetter(key, !isOptional)
      else return wholeStr
    })
  }
  return {
    replace
  }
}
