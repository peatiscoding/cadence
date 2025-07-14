export const formatAmount = (value: number): string => {
  return (value || 0).toLocaleString() + '฿'
}

export function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

export function formatCardCount(
  count: number,
  nouns: { singular: string; plural: string },
  adjective: string = ''
): string {
  let cntStr = `${count}`
  if (count === 0) {
    cntStr = 'no'
  }
  const noun = count === 1 ? nouns.singular : nouns.plural
  if (adjective) {
    return `${cntStr} ${adjective} ${noun.toLowerCase()}`
  }
  return `${cntStr} ${noun.toLowerCase()}`
}
