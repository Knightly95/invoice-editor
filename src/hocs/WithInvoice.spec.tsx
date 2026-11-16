import React from 'react'
import { render } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import { ApiProvider } from 'api'
import { ToastProvider } from 'app/contexts/ToastContext'
import { screen, createTestQueryClient } from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import withInvoice from './WithInvoice'
import { makeInvoice } from 'specs/fixtures'
import type { Invoice } from 'types'

// Minimal wrapped component — keeps the HOC test independent of InvoiceForm complexity
const TestChild = ({ invoice }: { invoice: Invoice }) => (
  <div>Invoice #{invoice.id}</div>
)
const Wrapped = withInvoice(TestChild)

/**
 * Renders the HOC-wrapped component at /invoices/:id so `useParams` returns
 * the correct id. Legacy MemoryRouter is sufficient here — TestChild doesn't
 * use `useBlocker`, so the Data Router API is not required.
 */
function renderAtPath(id: string | number) {
  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(
    [{ path: '/invoices/:id', element: <Wrapped /> }],
    { initialEntries: [`/invoices/${id}`] }
  )
  return render(
    <ApiProvider url={serverBaseURL} token="">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AntApp>
            <RouterProvider router={router} />
          </AntApp>
        </ToastProvider>
      </QueryClientProvider>
    </ApiProvider>
  )
}

describe('withInvoice HOC', () => {
  it('shows a loading indicator while the invoice is being fetched', async () => {
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, async () => {
        await delay('infinite')
        return HttpResponse.json(makeInvoice())
      })
    )

    renderAtPath(100)

    expect(await screen.findByText('Loading...')).toBeInTheDocument()
  })

  it('shows "Invoice not found" when the route id is not a valid number', () => {
    // A non-numeric id makes isValidInvoiceId=false → skipToken → query never fires
    renderAtPath('not-a-number')

    expect(screen.getByText('Invoice not found')).toBeInTheDocument()
  })

  it('renders the wrapped component with the fetched invoice', async () => {
    const invoice = makeInvoice({ id: 42 })
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(invoice)
      )
    )

    renderAtPath(42)

    expect(await screen.findByText('Invoice #42')).toBeInTheDocument()
  })
})
