import { http, HttpResponse } from 'msw'
import { render, screen, waitFor, userEvent } from 'specs/testUtils'
import { server, serverBaseURL, mockEndpoint } from 'specs/mocks/server'
import InvoicesList from './index'
import { makeCustomer, makeInvoice } from 'specs/fixtures'

const emptyCustomersResponse = {
  customers: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}
const emptyInvoicesResponse = {
  invoices: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}

beforeEach(() => {
  // CustomerAutoComplete calls getSearchCustomers on mount — stub it to prevent noise
  mockEndpoint({
    endpointName: 'getSearchCustomers',
    response: emptyCustomersResponse,
  })
})

describe('InvoicesList', () => {
  it('renders an invoice row for each item returned by the API', async () => {
    const invoice = makeInvoice()
    mockEndpoint({
      endpointName: 'getInvoices',
      response: {
        invoices: [invoice],
        pagination: {
          page: 1,
          page_size: 10,
          total_pages: 1,
          total_entries: 1,
        },
      },
    })

    render(<InvoicesList />)

    // Customer name column is rendered via getCustomerName helper
    await screen.findByText('Alice Martin')
  })

  it('shows an error alert when the invoices request fails', async () => {
    mockEndpoint({ endpointName: 'getInvoices', response: {}, status: 500 })

    render(<InvoicesList />)

    await screen.findByText('Failed to load invoices')
  })

  it('shows an empty state when there are no invoices', async () => {
    mockEndpoint({
      endpointName: 'getInvoices',
      response: emptyInvoicesResponse,
    })

    render(<InvoicesList />)

    await screen.findByText(/no invoices yet/i)
  })

  it('re-fetches with a draft filter when the Draft option is selected', async () => {
    // pointerEventsCheck: 0 — Ant Design's button-style radios hide the <input>
    // with pointer-events:none; the click reaches it through the parent <label>.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    mockEndpoint({
      endpointName: 'getInvoices',
      response: emptyInvoicesResponse,
    })

    let lastFilterParam: string | null = null
    server.use(
      http.get(`${serverBaseURL}/invoices`, ({ request }) => {
        lastFilterParam = new URL(request.url).searchParams.get('filter')
        return HttpResponse.json(emptyInvoicesResponse)
      })
    )

    render(<InvoicesList />)
    await screen.findByText(/no invoices yet/i)

    await user.click(screen.getByRole('radio', { name: 'Draft' }))

    await waitFor(() => {
      expect(lastFilterParam).toContain('finalized')
    })
  })

  it('adds customer_id to the filter when a customer is selected', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const customer = makeCustomer({
      id: 42,
      first_name: 'John',
      last_name: 'Doe',
    })

    server.use(
      http.get(`${serverBaseURL}/customers/search`, () =>
        HttpResponse.json({
          customers: [customer],
          pagination: {
            page: 1,
            page_size: 10,
            total_pages: 1,
            total_entries: 1,
          },
        })
      )
    )

    let lastFilterParam: string | null = null
    server.use(
      http.get(`${serverBaseURL}/invoices`, ({ request }) => {
        lastFilterParam = new URL(request.url).searchParams.get('filter')
        return HttpResponse.json(emptyInvoicesResponse)
      })
    )

    render(<InvoicesList />)
    await screen.findByText(/no invoices yet/i)

    await user.click(screen.getByRole('combobox'))
    await screen.findByText('John Doe')
    await user.click(screen.getByText('John Doe'))

    await waitFor(() => expect(lastFilterParam).toContain('customer_id'))
    await waitFor(() => expect(lastFilterParam).toContain('42'))
  })

  it('removes customer_id from the filter when the customer selection is cleared', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const customer = makeCustomer({
      id: 42,
      first_name: 'John',
      last_name: 'Doe',
    })

    server.use(
      http.get(`${serverBaseURL}/customers/search`, () =>
        HttpResponse.json({
          customers: [customer],
          pagination: {
            page: 1,
            page_size: 10,
            total_pages: 1,
            total_entries: 1,
          },
        })
      )
    )

    let lastFilterParam: string | null = null
    server.use(
      http.get(`${serverBaseURL}/invoices`, ({ request }) => {
        lastFilterParam = new URL(request.url).searchParams.get('filter')
        return HttpResponse.json(emptyInvoicesResponse)
      })
    )

    render(<InvoicesList />)
    await screen.findByText(/no invoices yet/i)

    // Select a customer to activate the filter
    await user.click(screen.getByRole('combobox'))
    await screen.findByText('John Doe')
    await user.click(screen.getByText('John Doe'))

    await waitFor(() => {
      expect(lastFilterParam).toContain('customer_id')
    })

    // Clear the customer selection — the × button rendered by allowClear
    // ant-select-clear is aria-hidden (Ant Design renders it as a decorative span),
    // so we query the DOM directly instead of going through the accessibility tree.
    const clearBtn = document.querySelector('.ant-select-clear') as HTMLElement
    await user.click(clearBtn)

    await waitFor(() => {
      // null = no filter param in the request, confirming customer_id was removed
      expect(lastFilterParam).toBeNull()
    })
  })
})
