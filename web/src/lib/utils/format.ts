export const formatAmount = (value: number): string => {
  return (value || 0).toLocaleString() + '฿'
}
