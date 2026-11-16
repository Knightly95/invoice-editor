import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import formatDateForApi from 'helpers/formatDateForApi'

const transformValuesToApi = (data: InvoiceFormValues) => {
  return {
    invoice: {
      customer_id: Number(data.customer?.id),
      date: formatDateForApi(data.issueDate),
      deadline: formatDateForApi(data.deadline),
      invoice_lines_attributes: data.invoice_lines.map((line) => ({
        product_id: Number(line.product?.id),
        quantity: line.quantity,
      })),
    },
  }
}

export default transformValuesToApi
