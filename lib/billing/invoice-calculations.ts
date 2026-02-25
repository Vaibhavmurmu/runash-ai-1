export function calculateInvoiceTotals(lineItems: Array<{ quantity: number; unitAmount: number }>, taxAmount: number) {
  const subtotalCents = lineItems.reduce((sum, item) => sum + Math.round(item.unitAmount * 100) * item.quantity, 0)
  const taxCents = Math.round(taxAmount * 100)
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  }
}
