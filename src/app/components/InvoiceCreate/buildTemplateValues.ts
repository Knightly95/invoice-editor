import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import { Invoice } from 'types'

/**
 * Transforms a saved invoice into initial form values for a new draft.
 *
 * Rules:
 * - `customer` is carried over as-is.
 * - Each line copies `product` and `quantity` from the source line; existing
 *   `id` fields are stripped so the form treats every line as a new (unsaved)
 *   entry.
 * - `issueDate` and `deadline` are intentionally omitted — the operator must
 *   set fresh dates for each new invoice.
 */
export function buildTemplateValues(
  invoice: Invoice
): Partial<InvoiceFormValues> {
  return {
    customer: invoice.customer,
    invoice_lines: invoice.invoice_lines.map((line) => ({
      id: undefined,
      product: line.product,
      quantity: line.quantity,
      _destroy: false,
    })),
  }
}
