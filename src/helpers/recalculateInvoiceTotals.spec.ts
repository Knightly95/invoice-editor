import { recalculateInvoiceTotals } from 'helpers/recalculateInvoiceTotals'
import { makeInvoice, makeInvoiceLine, makeProduct } from 'specs/fixtures'

describe('recalculateInvoiceTotals', () => {
  it('derives line price and tax from unit_price/unit_tax × quantity', () => {
    const product = makeProduct({ unit_price: '50.00', unit_tax: '10.00' })
    const line = makeInvoiceLine({ product, quantity: 3 })
    const invoice = makeInvoice({ invoice_lines: [line] })

    const result = recalculateInvoiceTotals(invoice)

    expect(result.invoice_lines[0].price).toBe('150.00') // 50.00 × 3
    expect(result.invoice_lines[0].tax).toBe('30.00') // 10.00 × 3
    expect(result.total).toBe('150.00')
    expect(result.tax).toBe('30.00')
  })

  it('sums price and tax across multiple lines', () => {
    const productA = makeProduct({
      id: 1,
      unit_price: '100.00',
      unit_tax: '20.00',
    })
    const productB = makeProduct({
      id: 2,
      unit_price: '50.00',
      unit_tax: '5.00',
    })
    const invoice = makeInvoice({
      invoice_lines: [
        makeInvoiceLine({ id: 1, product: productA, quantity: 2 }), // 200.00 / 40.00
        makeInvoiceLine({ id: 2, product: productB, quantity: 3 }), // 150.00 / 15.00
      ],
    })

    const result = recalculateInvoiceTotals(invoice)

    expect(result.total).toBe('350.00')
    expect(result.tax).toBe('55.00')
  })

  it('produces zero totals when quantity is 0', () => {
    const invoice = makeInvoice({
      invoice_lines: [makeInvoiceLine({ quantity: 0 })],
    })

    const result = recalculateInvoiceTotals(invoice)

    expect(result.invoice_lines[0].price).toBe('0.00')
    expect(result.total).toBe('0.00')
  })

  it('overwrites stale line price/tax from the API when a product was substituted (BI-1)', () => {
    // The API does not recompute snapshot fields on product substitution;
    // the embedded product always reflects the current product.
    const currentProduct = makeProduct({
      unit_price: '80.00',
      unit_tax: '16.00',
    })
    const staleLine = makeInvoiceLine({
      product: currentProduct,
      quantity: 2,
      price: '999.99', // stale
      tax: '99.99', // stale
    })
    const invoice = makeInvoice({
      invoice_lines: [staleLine],
      total: '999.99',
      tax: '99.99',
    })

    const result = recalculateInvoiceTotals(invoice)

    expect(result.invoice_lines[0].price).toBe('160.00')
    expect(result.invoice_lines[0].tax).toBe('32.00')
    expect(result.total).toBe('160.00')
    expect(result.tax).toBe('32.00')
  })

  it('does not mutate the input invoice or its lines', () => {
    const invoice = makeInvoice()
    const originalTotal = invoice.total
    const originalLine = invoice.invoice_lines[0]

    const result = recalculateInvoiceTotals(invoice)

    expect(result).not.toBe(invoice)
    expect(result.invoice_lines[0]).not.toBe(originalLine)
    expect(invoice.total).toBe(originalTotal)
  })

  it('avoids float drift by using big.js (3 × 33.33 = 99.99, not 99.99000…)', () => {
    const product = makeProduct({ unit_price: '33.33', unit_tax: '0.00' })
    const invoice = makeInvoice({
      invoice_lines: [makeInvoiceLine({ product, quantity: 3 })],
    })

    const result = recalculateInvoiceTotals(invoice)

    expect(result.invoice_lines[0].price).toBe('99.99')
  })
})
