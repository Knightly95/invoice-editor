import transformValuesToApi from './transformFormValuesToAPI'
import { makeCustomer, makeInvoice, makeProduct } from 'specs/fixtures'
import type { InvoiceFormValues } from 'app/components/InvoiceForm/schema'

const customer = makeCustomer({ id: 3 })
const product = makeProduct({ id: 7 })

const baseFormValues: InvoiceFormValues = {
  customer,
  issueDate: new Date('2025-03-15T12:00:00'),
  deadline: new Date('2025-04-15T12:00:00'),
  invoice_lines: [{ id: '10', product, quantity: 2, _destroy: false }],
}

describe('InvoiceEdit — transformFormValuesToAPI', () => {
  it('includes the invoice id, customer_id, date and deadline in the payload', () => {
    const invoice = makeInvoice({ id: 99 })
    const result = transformValuesToApi(invoice, baseFormValues)

    expect(result.invoice.id).toBe(99)
    expect(result.invoice.customer_id).toBe(3)
    expect(result.invoice.date).toBe('2025-03-15')
    expect(result.invoice.deadline).toBe('2025-04-15')
  })

  it('serialises an existing, non-destroyed line with id + product_id + quantity', () => {
    const invoice = makeInvoice({ id: 1 })
    const result = transformValuesToApi(invoice, {
      ...baseFormValues,
      invoice_lines: [{ id: '10', product, quantity: 3, _destroy: false }],
    })

    expect(result.invoice.invoice_lines_attributes).toEqual([
      { id: 10, product_id: 7, quantity: 3 },
    ])
  })

  it('serialises a line marked for destruction as { id, _destroy: true } (no product_id / quantity)', () => {
    // This is the critical branch: the API deletes the line when _destroy is sent.
    const invoice = makeInvoice({ id: 1 })
    const result = transformValuesToApi(invoice, {
      ...baseFormValues,
      invoice_lines: [
        { id: '10', product, quantity: 1, _destroy: false },
        { id: '55', product, quantity: 1, _destroy: true },
      ],
    })

    const destroyedEntry = result.invoice.invoice_lines_attributes.find(
      (l) => 'id' in l && l.id === 55
    )
    expect(destroyedEntry).toEqual({ id: 55, _destroy: true })
    // Must NOT include product_id or quantity — sending them with _destroy is confusing
    expect(destroyedEntry).not.toHaveProperty('product_id')
    expect(destroyedEntry).not.toHaveProperty('quantity')
  })

  it('serialises a new line (no id) with only product_id + quantity', () => {
    // New lines added on the edit form have no server id yet.
    const invoice = makeInvoice({ id: 1 })
    const result = transformValuesToApi(invoice, {
      ...baseFormValues,
      invoice_lines: [{ product, quantity: 4, _destroy: false }],
    })

    expect(result.invoice.invoice_lines_attributes).toEqual([
      { product_id: 7, quantity: 4 },
    ])
    const newEntry = result.invoice.invoice_lines_attributes[0]
    expect(newEntry).not.toHaveProperty('id')
  })

  it('handles a mixed payload: one destroyed, one updated, one new', () => {
    const productB = makeProduct({ id: 8 })
    const invoice = makeInvoice({ id: 42 })
    const result = transformValuesToApi(invoice, {
      ...baseFormValues,
      invoice_lines: [
        { id: '10', product, quantity: 2, _destroy: false }, // update
        { id: '11', product: productB, quantity: 1, _destroy: true }, // destroy
        { product: productB, quantity: 5, _destroy: false }, // new
      ],
    })

    expect(result.invoice.invoice_lines_attributes).toEqual([
      { id: 10, product_id: 7, quantity: 2 },
      { id: 11, _destroy: true },
      { product_id: 8, quantity: 5 },
    ])
  })
})
