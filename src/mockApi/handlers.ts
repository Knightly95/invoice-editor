import Big from 'big.js'
import { http, HttpResponse, delay } from 'msw'
import type { Invoice, InvoiceLine } from 'types'
import type { DbStore, MockDb, StoredInvoice, StoredInvoiceLine } from './types'

/**
 * In-browser implementation of the invoice REST API described in
 * `src/api/schema.yml`. Requests are intercepted by MSW, so the app talks
 * HTTP exactly as it would to a real server — swap in a real backend with
 * `REACT_APP_API_URL` and nothing else changes.
 */

const DEFAULT_PER_PAGE = 25
const MAX_PER_PAGE = 100

interface FilterClause {
  field: string
  operator: string
  value: unknown
}

type LineInput = {
  id?: number
  _destroy?: boolean
  product_id?: number
  quantity?: number
}

type InvoiceInput = {
  customer_id?: number | null
  finalized?: boolean
  paid?: boolean
  date?: string | null
  deadline?: string | null
  invoice_lines_attributes?: LineInput[]
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    // Restore the prototype chain — required for `instanceof` with an ES5 target.
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

// ── Serialisation ──────────────────────────────────────────────────────────

function serializeLine(db: MockDb, line: StoredInvoiceLine): InvoiceLine {
  const product = db.products.find((p) => p.id === line.product_id)
  if (!product) throw new ApiError(500, `Product ${line.product_id} missing`)
  return {
    id: line.id,
    invoice_id: line.invoice_id,
    product_id: line.product_id,
    quantity: line.quantity,
    label: product.label,
    unit: product.unit,
    vat_rate: product.vat_rate,
    price: new Big(product.unit_price).times(line.quantity).toFixed(2),
    tax: new Big(product.unit_tax).times(line.quantity).toFixed(2),
    product,
  }
}

export function serializeInvoice(db: MockDb, invoice: StoredInvoice): Invoice {
  const lines = invoice.invoice_lines.map((l) => serializeLine(db, l))
  const sum = (key: 'price' | 'tax') =>
    lines.reduce((acc, l) => acc.plus(l[key]), new Big(0)).toFixed(2)
  const customer = db.customers.find((c) => c.id === invoice.customer_id)
  return {
    ...invoice,
    customer_id: invoice.customer_id as number,
    customer,
    total: sum('price'),
    tax: sum('tax'),
    invoice_lines: lines,
  } as Invoice
}

// ── Query helpers ──────────────────────────────────────────────────────────

function paginate<T>(items: T[], url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, Number(url.searchParams.get('per_page')) || DEFAULT_PER_PAGE)
  )
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    pagination: {
      page,
      page_size: perPage,
      total_pages: totalPages,
      total_entries: items.length,
    },
  }
}

function comparable(value: unknown): number | string | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value)
  }
  return value as number | string | boolean
}

function matchesClause(record: Record<string, unknown>, clause: FilterClause) {
  const actual = comparable(record[clause.field])
  const expected = comparable(clause.value)
  switch (clause.operator) {
    case 'eq':
      return actual === expected
    case 'not_eq':
      return actual !== expected
    case 'gt':
      return actual !== null && expected !== null && actual > expected
    case 'gteq':
      return actual !== null && expected !== null && actual >= expected
    case 'lt':
      return actual !== null && expected !== null && actual < expected
    case 'lteq':
      return actual !== null && expected !== null && actual <= expected
    case 'in':
      return (
        Array.isArray(clause.value) &&
        clause.value.map(comparable).indexOf(actual) !== -1
      )
    case 'not_in':
      return (
        Array.isArray(clause.value) &&
        clause.value.map(comparable).indexOf(actual) === -1
      )
    default:
      throw new ApiError(
        400,
        `Unsupported filter operator "${clause.operator}"`
      )
  }
}

function parseFilter(raw: string | null): FilterClause[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('not an array')
    return parsed
  } catch {
    throw new ApiError(400, 'Invalid filter parameter')
  }
}

function sortRecords<T extends Record<string, unknown>>(
  records: T[],
  raw: string | null
): T[] {
  if (!raw) return [...records].sort((a, b) => Number(b.id) - Number(a.id))
  const keys = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({
      field: s.replace(/^[+-]/, ''),
      dir: s.startsWith('-') ? -1 : 1,
    }))
  return [...records].sort((a, b) => {
    for (const { field, dir } of keys) {
      const av = comparable(a[field])
      const bv = comparable(b[field])
      if (av === bv) continue
      if (av === null) return 1
      if (bv === null) return -1
      return (av < bv ? -1 : 1) * dir
    }
    return 0
  })
}

function textSearch<T>(
  items: T[],
  query: string | null,
  text: (i: T) => string
) {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return items
  return items.filter((i) => text(i).toLowerCase().indexOf(q) !== -1)
}

// ── Mutations ──────────────────────────────────────────────────────────────

function assertProduct(db: MockDb, productId: unknown) {
  if (!db.products.some((p) => p.id === productId)) {
    throw new ApiError(422, `Product ${String(productId)} does not exist`)
  }
}

function applyInvoiceInput(
  db: MockDb,
  invoice: StoredInvoice,
  input: InvoiceInput
): StoredInvoice {
  if (invoice.finalized) {
    const changesOtherThanPaid = Object.keys(input).filter(
      (k) => k !== 'paid' && k !== 'id' && k !== 'finalized'
    )
    if (changesOtherThanPaid.length > 0 || input.finalized === false) {
      throw new ApiError(422, 'A finalized invoice can only be marked as paid')
    }
  }
  if (input.paid && !(input.finalized ?? invoice.finalized)) {
    throw new ApiError(422, 'Only a finalized invoice can be marked as paid')
  }
  if (
    input.customer_id !== undefined &&
    input.customer_id !== null &&
    !db.customers.some((c) => c.id === input.customer_id)
  ) {
    throw new ApiError(422, `Customer ${input.customer_id} does not exist`)
  }

  let lines = invoice.invoice_lines
  for (const attrs of input.invoice_lines_attributes ?? []) {
    if (attrs.id !== undefined) {
      const existing = lines.find((l) => l.id === attrs.id)
      if (!existing)
        throw new ApiError(422, `Invoice line ${attrs.id} not found`)
      if (attrs._destroy) {
        lines = lines.filter((l) => l.id !== attrs.id)
        continue
      }
      if (attrs.product_id !== undefined) assertProduct(db, attrs.product_id)
      lines = lines.map((l) =>
        l.id === attrs.id
          ? {
              ...l,
              product_id: attrs.product_id ?? l.product_id,
              quantity: attrs.quantity ?? l.quantity,
            }
          : l
      )
    } else if (!attrs._destroy) {
      assertProduct(db, attrs.product_id)
      lines = [
        ...lines,
        {
          id: db.sequences.invoiceLine++,
          invoice_id: invoice.id,
          product_id: attrs.product_id as number,
          quantity: attrs.quantity ?? 1,
        },
      ]
    }
  }

  return {
    ...invoice,
    customer_id:
      input.customer_id !== undefined ? input.customer_id : invoice.customer_id,
    finalized: input.finalized ?? invoice.finalized,
    paid: input.paid ?? invoice.paid,
    date: input.date !== undefined ? input.date : invoice.date,
    deadline: input.deadline !== undefined ? input.deadline : invoice.deadline,
    invoice_lines: lines,
  }
}

function findInvoice(db: MockDb, id: string | readonly string[] | undefined) {
  const invoice = db.invoices.find((i) => i.id === Number(id))
  if (!invoice) throw new ApiError(404, 'Not found')
  return invoice
}

// ── Handlers ───────────────────────────────────────────────────────────────

function withErrors(fn: () => Response | Promise<Response>) {
  try {
    return fn()
  } catch (error) {
    if (error instanceof ApiError) {
      return HttpResponse.json(
        { message: error.message },
        { status: error.status }
      )
    }
    throw error
  }
}

export function createHandlers(
  baseUrl: string,
  store: DbStore,
  options: { latencyMs?: number } = {}
) {
  const base = baseUrl.replace(/\/$/, '')
  const latency = async () => {
    if (options.latencyMs) await delay(options.latencyMs)
  }
  const clone = (): MockDb => JSON.parse(JSON.stringify(store.read()))

  return [
    http.get(`${base}/products/search`, async ({ request }) => {
      await latency()
      const url = new URL(request.url)
      const db = store.read()
      const matches = textSearch(
        db.products,
        url.searchParams.get('query'),
        (p) => p.label
      )
      const { items, pagination } = paginate(matches, url)
      return HttpResponse.json({ pagination, products: items })
    }),

    http.get(`${base}/customers/search`, async ({ request }) => {
      await latency()
      const url = new URL(request.url)
      const db = store.read()
      const matches = textSearch(
        db.customers,
        url.searchParams.get('query'),
        (c) => `${c.first_name} ${c.last_name} ${c.last_name} ${c.first_name}`
      )
      const { items, pagination } = paginate(matches, url)
      return HttpResponse.json({ pagination, customers: items })
    }),

    http.get(`${base}/invoices`, async ({ request }) => {
      await latency()
      return withErrors(() => {
        const url = new URL(request.url)
        const db = store.read()
        const filters = parseFilter(url.searchParams.get('filter'))
        const serialized = db.invoices.map((i) => serializeInvoice(db, i))
        const filtered = serialized.filter((invoice) =>
          filters.every((clause) =>
            matchesClause(invoice as unknown as Record<string, unknown>, clause)
          )
        )
        const sorted = sortRecords(
          filtered as unknown as Record<string, unknown>[],
          url.searchParams.get('sort')
        )
        const { items, pagination } = paginate(sorted, url)
        return HttpResponse.json({ pagination, invoices: items })
      })
    }),

    http.post(`${base}/invoices`, async ({ request }) => {
      await latency()
      const body = (await request.json()) as { invoice?: InvoiceInput }
      return withErrors(() => {
        const input = body?.invoice
        if (!input || input.customer_id == null) {
          throw new ApiError(422, 'customer_id is required')
        }
        const db = clone()
        const draft: StoredInvoice = {
          id: db.sequences.invoice++,
          customer_id: null,
          finalized: false,
          paid: false,
          date: null,
          deadline: null,
          invoice_lines: [],
        }
        // Validate as a draft first, then apply requested finalized/paid flags.
        const created = applyInvoiceInput(db, draft, input)
        db.invoices.push(created)
        store.write(db)
        return HttpResponse.json(serializeInvoice(db, created))
      })
    }),

    http.get(`${base}/invoices/:id`, async ({ params }) => {
      await latency()
      return withErrors(() => {
        const db = store.read()
        return HttpResponse.json(
          serializeInvoice(db, findInvoice(db, params.id))
        )
      })
    }),

    http.put(`${base}/invoices/:id`, async ({ params, request }) => {
      await latency()
      const body = (await request.json()) as { invoice?: InvoiceInput }
      return withErrors(() => {
        const db = clone()
        const current = findInvoice(db, params.id)
        const updated = applyInvoiceInput(db, current, body?.invoice ?? {})
        db.invoices = db.invoices.map((i) =>
          i.id === updated.id ? updated : i
        )
        store.write(db)
        return HttpResponse.json(serializeInvoice(db, updated))
      })
    }),

    http.delete(`${base}/invoices/:id`, async ({ params }) => {
      await latency()
      return withErrors(() => {
        const db = clone()
        const invoice = findInvoice(db, params.id)
        if (invoice.finalized) {
          throw new ApiError(422, 'A finalized invoice cannot be deleted')
        }
        db.invoices = db.invoices.filter((i) => i.id !== invoice.id)
        store.write(db)
        return new HttpResponse(null, { status: 204 })
      })
    }),
  ]
}
