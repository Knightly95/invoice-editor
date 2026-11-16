import type { Customer, Product } from 'types'

/** Invoice line as persisted — prices are derived on read, never stored. */
export interface StoredInvoiceLine {
  id: number
  invoice_id: number
  product_id: number
  quantity: number
}

/** Invoice as persisted — `customer`, `total` and `tax` are derived on read. */
export interface StoredInvoice {
  id: number
  customer_id: number | null
  finalized: boolean
  paid: boolean
  date: string | null
  deadline: string | null
  invoice_lines: StoredInvoiceLine[]
}

export interface MockDb {
  customers: Customer[]
  products: Product[]
  invoices: StoredInvoice[]
  sequences: { invoice: number; invoiceLine: number }
}

export interface DbStore {
  read(): MockDb
  write(db: MockDb): void
}
