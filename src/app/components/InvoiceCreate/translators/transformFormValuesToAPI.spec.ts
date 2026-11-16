import transformValuesToApi from './transformFormValuesToAPI'
import { makeCustomer, makeProduct } from 'specs/fixtures'
import type { InvoiceFormValues } from 'app/components/InvoiceForm/schema'

const customer = makeCustomer({ id: 5 })
const product = makeProduct({ id: 9 })

const baseFormValues: InvoiceFormValues = {
  customer,
  issueDate: new Date('2025-03-15T12:00:00'),
  deadline: new Date('2025-04-15T12:00:00'),
  invoice_lines: [{ product, quantity: 2, _destroy: false }],
}

describe('InvoiceCreate — transformFormValuesToAPI', () => {
  it('builds a correctly shaped invoice payload', () => {
    const result = transformValuesToApi(baseFormValues)

    expect(result).toEqual({
      invoice: {
        customer_id: 5,
        date: '2025-03-15',
        deadline: '2025-04-15',
        invoice_lines_attributes: [{ product_id: 9, quantity: 2 }],
      },
    })
  })

  it('maps all invoice lines into invoice_lines_attributes', () => {
    const productB = makeProduct({ id: 11 })
    const result = transformValuesToApi({
      ...baseFormValues,
      invoice_lines: [
        { product, quantity: 1, _destroy: false },
        { product: productB, quantity: 3, _destroy: false },
      ],
    })

    expect(result.invoice.invoice_lines_attributes).toEqual([
      { product_id: 9, quantity: 1 },
      { product_id: 11, quantity: 3 },
    ])
  })
})
