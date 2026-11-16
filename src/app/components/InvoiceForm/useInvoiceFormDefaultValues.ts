import { useMemo } from 'react'
import { Invoice } from 'types'

export const useInvoiceFormDefaultValues = (invoice: Invoice | null) => {
  return useMemo(
    () => ({
      customer: invoice?.customer,
      invoice_lines: [
        ...(invoice?.invoice_lines.map((invoiceLine) => ({
          id: String(invoiceLine.id),
          product: invoiceLine.product,
          quantity: invoiceLine.quantity,
          _destroy: false,
        })) ?? [{ product: undefined, quantity: 0 }]),
      ],
      issueDate: invoice?.date ? new Date(invoice?.date) : undefined,
      deadline: invoice?.deadline ? new Date(invoice?.deadline) : undefined,
    }),
    [invoice]
  )
}
export default useInvoiceFormDefaultValues
