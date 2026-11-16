import { Invoice } from 'types'
import { makeCustomer } from './makeCustomer'
import { makeInvoiceLine } from './makeInvoiceLine'

/**
 * Returns a fully-typed Invoice with sensible defaults.
 * Override only the fields relevant to the test.
 */
export function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 100,
    customer_id: 1,
    customer: makeCustomer(),
    finalized: false,
    paid: false,
    date: '2025-01-15',
    deadline: '2025-02-15',
    total: '100.00',
    tax: '16.67',
    invoice_lines: [makeInvoiceLine()],
    ...overrides,
  }
}
