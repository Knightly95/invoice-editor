import { InvoiceLine } from 'types'
import { makeProduct } from './makeProduct'

/**
 * Returns a fully-typed InvoiceLine with sensible defaults.
 * `price` and `tax` are computed from the default product (100.00 unit_price,
 * 16.67 unit_tax) × quantity=1, matching the factory defaults.
 * Override only the fields relevant to the test.
 */
export function makeInvoiceLine(
  overrides: Partial<InvoiceLine> = {}
): InvoiceLine {
  return {
    id: 1,
    invoice_id: 100,
    product_id: 1,
    quantity: 1,
    label: 'Test Product',
    unit: 'piece',
    vat_rate: '20',
    price: '100.00',
    tax: '16.67',
    product: makeProduct(),
    ...overrides,
  }
}
