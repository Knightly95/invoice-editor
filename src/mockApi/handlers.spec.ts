import { server, serverBaseURL } from 'specs/mocks/server'
import { createHandlers } from './handlers'
import { createMemoryStore } from './store'
import { createSeedDb } from './seed'

const api = (path: string, init?: RequestInit) =>
  fetch(`${serverBaseURL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  })

const json = (body: unknown) => JSON.stringify(body)

describe('mock API', () => {
  beforeEach(() => {
    server.use(...createHandlers(serverBaseURL, createMemoryStore()))
  })

  it('paginates invoices', async () => {
    const res = await api('/invoices?page=2&per_page=10')
    const body = await res.json()
    expect(body.pagination).toEqual({
      page: 2,
      page_size: 10,
      total_pages: 6,
      total_entries: 60,
    })
    expect(body.invoices).toHaveLength(10)
    expect(body.invoices[0].customer).toBeDefined()
  })

  it('filters invoices with the JSON filter param', async () => {
    const filter = encodeURIComponent(
      json([
        { field: 'finalized', operator: 'eq', value: true },
        { field: 'paid', operator: 'eq', value: false },
      ])
    )
    const body = await (
      await api(`/invoices?per_page=100&filter=${filter}`)
    ).json()
    expect(body.invoices.length).toBeGreaterThan(0)
    for (const invoice of body.invoices) {
      expect(invoice.finalized).toBe(true)
      expect(invoice.paid).toBe(false)
    }
  })

  it('sorts invoices numerically by total', async () => {
    const body = await (await api('/invoices?per_page=100&sort=-total')).json()
    const totals = body.invoices.map((i: { total: string }) => Number(i.total))
    expect(totals).toEqual([...totals].sort((a, b) => b - a))
  })

  it('searches customers by name', async () => {
    const { first_name } = createSeedDb().customers[0]
    const body = await (
      await api(`/customers/search?query=${first_name}`)
    ).json()
    expect(body.customers.length).toBeGreaterThan(0)
    for (const c of body.customers) {
      expect(`${c.first_name} ${c.last_name}`).toContain(first_name)
    }
  })

  it('creates an invoice and derives totals from products', async () => {
    const res = await api('/invoices', {
      method: 'POST',
      body: json({
        invoice: {
          customer_id: 1,
          date: '2026-01-01',
          deadline: '2026-01-31',
          invoice_lines_attributes: [{ product_id: 1, quantity: 2 }],
        },
      }),
    })
    const invoice = await res.json()
    const product = createSeedDb().products[0]
    expect(res.status).toBe(200)
    expect(invoice.invoice_lines[0].price).toBe(
      (Number(product.unit_price) * 2).toFixed(2)
    )
    expect(invoice.total).toBe(invoice.invoice_lines[0].price)
  })

  it('recomputes totals when a line product is substituted', async () => {
    const original = await (await api('/invoices/1')).json()
    if (original.finalized) {
      // pick a draft instead
      const drafts = await (
        await api(
          `/invoices?per_page=1&filter=${encodeURIComponent(
            json([{ field: 'finalized', operator: 'eq', value: false }])
          )}`
        )
      ).json()
      Object.assign(original, drafts.invoices[0])
    }
    const line = original.invoice_lines[0]
    const newProductId = line.product_id === 2 ? 3 : 2
    const updated = await (
      await api(`/invoices/${original.id}`, {
        method: 'PUT',
        body: json({
          invoice: {
            id: original.id,
            invoice_lines_attributes: [
              { id: line.id, product_id: newProductId },
            ],
          },
        }),
      })
    ).json()
    const updatedLine = updated.invoice_lines.find(
      (l: { id: number }) => l.id === line.id
    )
    expect(updatedLine.product.id).toBe(newProductId)
    expect(updatedLine.price).toBe(
      (Number(updatedLine.product.unit_price) * updatedLine.quantity).toFixed(2)
    )
  })

  it('rejects edits to a finalized invoice but allows marking it paid', async () => {
    const filter = encodeURIComponent(
      json([
        { field: 'finalized', operator: 'eq', value: true },
        { field: 'paid', operator: 'eq', value: false },
      ])
    )
    const { invoices } = await (await api(`/invoices?filter=${filter}`)).json()
    const id = invoices[0].id

    const rejected = await api(`/invoices/${id}`, {
      method: 'PUT',
      body: json({ invoice: { id, date: '2026-02-02' } }),
    })
    expect(rejected.status).toBe(422)

    const paid = await api(`/invoices/${id}`, {
      method: 'PUT',
      body: json({ invoice: { id, paid: true } }),
    })
    expect((await paid.json()).paid).toBe(true)
  })

  it('deletes a draft invoice and 404s afterwards', async () => {
    const filter = encodeURIComponent(
      json([{ field: 'finalized', operator: 'eq', value: false }])
    )
    const { invoices } = await (await api(`/invoices?filter=${filter}`)).json()
    const id = invoices[0].id

    expect((await api(`/invoices/${id}`, { method: 'DELETE' })).status).toBe(
      204
    )
    expect((await api(`/invoices/${id}`)).status).toBe(404)
  })
})
