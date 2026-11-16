import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import formatDateForApi from 'helpers/formatDateForApi'
import { Invoice } from 'types'

// _destroy is now tracked in the form itself — no diff against the original
// invoice is needed. Each line signals its own fate via the _destroy flag.
const transformValuesToApi = (invoice: Invoice, data: InvoiceFormValues) => ({
  invoice: {
    id: Number(invoice.id),
    customer_id: Number(data.customer?.id),
    date: formatDateForApi(data.issueDate),
    deadline: formatDateForApi(data.deadline),
    invoice_lines_attributes: data.invoice_lines.map((line) => {
      if (line._destroy && line.id) {
        return { id: Number(line.id), _destroy: true as const }
      }
      if (line.id) {
        return {
          id: Number(line.id),
          product_id: Number(line.product?.id),
          quantity: line.quantity,
        }
      }
      return {
        product_id: Number(line.product?.id),
        quantity: line.quantity,
      }
    }),
  },
})

export default transformValuesToApi
