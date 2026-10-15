export function roundedCents(amount: number | undefined): number | undefined {
  return amount === undefined ? undefined : Math.round(amount * 100)
}
