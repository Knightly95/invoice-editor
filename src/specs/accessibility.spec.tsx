import React from 'react'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import { axe } from 'jest-axe'
import { ApiProvider } from 'api'
import { ToastProvider } from 'app/contexts/ToastContext'
import InvoiceCreate from 'app/components/InvoiceCreate'
import InvoiceShow from 'app/components/InvoiceShow'
import InvoicesList from 'app/components/InvoicesList'
import { makeCustomer, makeInvoice, makeInvoiceLine } from 'specs/fixtures'
import { mockEndpoint, server, serverBaseURL } from 'specs/mocks/server'
import { createTestQueryClient } from 'specs/testUtils'

/**
 * Automated accessibility checks (axe-core) on each page of the app.
 *
 * axe finds about a third of accessibility problems: missing labels and
 * names, invalid ARIA, duplicate ids and similar. It can't judge colour
 * contrast in jsdom, keyboard flow or whether text makes sense, so these
 * tests complement manual checks rather than replace them.
 */

const emptyPage = { page: 1, page_size: 10, total_pages: 1, total_entries: 0 }

function renderRoute(path: string, element: React.ReactElement, url: string) {
  const router = createMemoryRouter([{ path, element }], {
    initialEntries: [url],
  })
  return render(
    <ApiProvider url={serverBaseURL} token="">
      <QueryClientProvider client={createTestQueryClient()}>
        <ToastProvider>
          <AntApp>
            <RouterProvider router={router} />
          </AntApp>
        </ToastProvider>
      </QueryClientProvider>
    </ApiProvider>
  )
}

beforeEach(() => {
  mockEndpoint({
    endpointName: 'getSearchCustomers',
    response: { customers: [], pagination: emptyPage },
  })
  mockEndpoint({
    endpointName: 'getSearchProducts',
    response: { products: [], pagination: emptyPage },
  })
})

describe('accessibility (axe)', () => {
  it('invoice list has no detectable violations', async () => {
    mockEndpoint({
      endpointName: 'getInvoices',
      response: {
        invoices: [makeInvoice()],
        pagination: { ...emptyPage, total_entries: 1 },
      },
    })

    const { container } = renderRoute(
      '/invoices',
      <InvoicesList />,
      '/invoices'
    )
    await screen.findByText('Alice Martin')

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('invoice detail page has no detectable violations', async () => {
    const invoice = makeInvoice({
      id: 55,
      customer: makeCustomer({ first_name: 'Sophie', last_name: 'Dupont' }),
      invoice_lines: [makeInvoiceLine()],
    })
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(invoice)
      )
    )

    const { container } = renderRoute(
      '/invoices/:id',
      <InvoiceShow />,
      '/invoices/55'
    )
    await screen.findByText('Sophie Dupont')

    expect(await axe(container)).toHaveNoViolations()
  })

  it('new invoice form has no detectable violations', async () => {
    const { container } = renderRoute(
      '/invoices/new',
      <InvoiceCreate />,
      '/invoices/new'
    )
    await screen.findByRole('button', { name: /save invoice/i })

    expect(await axe(container)).toHaveNoViolations()
  })
})
