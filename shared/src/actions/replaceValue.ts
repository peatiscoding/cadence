import { IWorkflowCard } from '../validation'

interface ContextReplacer {
  replace(val: string): string
}

/**
 * Utility method that will look for specific pattern and replace it with context value
 *
 * `$.[card's field]` will replace with its corresponding card field such as `value`, `author`, `workflowId`, `title`.
 * `#.[card's fieldData]` will replace with its corresponding card's Field Data.
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
    return val.replace(/(\$|#)\.([a-zA-Z0-9_]+)\??/g, (wholeStr, type, key, optionalMarker) => {
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
