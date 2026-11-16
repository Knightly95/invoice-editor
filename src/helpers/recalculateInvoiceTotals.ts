import Big from 'big.js'
import { Invoice, InvoiceLine } from 'types'

/**
 * The API does not recompute `invoice_line.price`, `invoice_line.tax`,
 * `invoice.total`, or `invoice.tax` when a product is replaced on a line.
 * The nested `invoice_line.product` always reflects the current product,
 * so we derive all derived totals from it on the client side.
 *
 * TODO: Remove this entire module once the backend correctly recomputes
 * snapshot fields on product substitution. Tracked in backend_issues.md § BI-1.
 */
function recalculateLine(line: InvoiceLine): InvoiceLine {
  const price = new Big(line.product.unit_price).times(line.quantity).toFixed(2)
  const tax = new Big(line.product.unit_tax).times(line.quantity).toFixed(2)
  return { ...line, price, tax }
}

export function recalculateInvoiceTotals(invoice: Invoice): Invoice {
  const lines = invoice.invoice_lines.map(recalculateLine)

  const total = lines
    .reduce((sum, line) => sum.plus(new Big(line.price)), new Big(0))
    .toFixed(2)

  const tax = lines
    .reduce((sum, line) => sum.plus(new Big(line.tax)), new Big(0))
    .toFixed(2)

  return { ...invoice, invoice_lines: lines, total, tax }
}
