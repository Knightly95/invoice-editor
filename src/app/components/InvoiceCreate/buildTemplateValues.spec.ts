import { buildTemplateValues } from './buildTemplateValues'
import {
  makeInvoice,
  makeCustomer,
  makeInvoiceLine,
  makeProduct,
} from 'specs/fixtures'

describe('buildTemplateValues', () => {
  it('carries the customer over from the source invoice', () => {
    const customer = makeCustomer({ id: 42, first_name: 'Julie' })
    const result = buildTemplateValues(makeInvoice({ customer }))
    expect(result.customer).toEqual(customer)
  })

  it('strips line ids so every cloned line is treated as new by the form', () => {
    const invoice = makeInvoice({
      invoice_lines: [makeInvoiceLine({ id: 99 })],
    })
    const result = buildTemplateValues(invoice)
    expect(result.invoice_lines![0].id).toBeUndefined()
  })

  it('copies product and quantity from each source line', () => {
    const product = makeProduct({ id: 7, unit_price: '250.00' })
    const line = makeInvoiceLine({ product, quantity: 5 })
    const result = buildTemplateValues(makeInvoice({ invoice_lines: [line] }))
    expect(result.invoice_lines![0].product).toEqual(product)
    expect(result.invoice_lines![0].quantity).toBe(5)
  })

  it('sets _destroy to false on cloned lines', () => {
    const invoice = makeInvoice({
      invoice_lines: [makeInvoiceLine({ id: 1 }), makeInvoiceLine({ id: 2 })],
    })
    const result = buildTemplateValues(invoice)
    result.invoice_lines!.forEach((line) => expect(line._destroy).toBe(false))
  })

  it('omits issueDate and deadline so the operator sets fresh dates', () => {
    const result = buildTemplateValues(makeInvoice())
    expect(result).not.toHaveProperty('issueDate')
    expect(result).not.toHaveProperty('deadline')
  })
})
