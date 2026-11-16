import React from 'react'
import { render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import { ApiProvider } from 'api'
import { ToastProvider } from 'app/contexts/ToastContext'
import { screen, createTestQueryClient } from 'specs/testUtils'
import { server, serverBaseURL, mockEndpoint } from 'specs/mocks/server'
import InvoiceEdit from './index'
import { makeInvoice } from 'specs/fixtures'

const emptyCustomersResponse = {
  customers: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}
const emptyProductsResponse = {
  products: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}

/**
 * InvoiceEdit renders InvoiceForm which calls `useBlocker` — a Data Router
 * API. We must use `createMemoryRouter` + `RouterProvider`; `MemoryRouter`
 * (legacy) does not implement the Data Router interfaces, same constraint
 * as InvoiceCreate (see T-5 in DECISIONS.md).
 */
function renderAtPath(id: number) {
  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(
    [{ path: '/invoices/:id/edit', element: <InvoiceEdit /> }],
    { initialEntries: [`/invoices/${id}/edit`] }
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

beforeEach(() => {
  // InvoiceForm's CustomerAutoComplete and ProductAutoComplete both fire
  // queries on mount — stub them to prevent unhandled request noise.
  mockEndpoint({
    endpointName: 'getSearchCustomers',
    response: emptyCustomersResponse,
  })
  mockEndpoint({
    endpointName: 'getSearchProducts',
    response: emptyProductsResponse,
  })
})

describe('InvoiceEdit', () => {
  it('renders the "Edit Invoice" heading with the invoice id in the breadcrumb', async () => {
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(makeInvoice({ id: 77 }))
      )
    )

    renderAtPath(77)

    expect(await screen.findByText('Edit Invoice')).toBeInTheDocument()
    // breadcrumb button shows "Invoice #77"
    expect(
      screen.getByRole('button', { name: /invoice #77/i })
    ).toBeInTheDocument()
  })

  it('renders existing line items pre-filled in the form', async () => {
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(makeInvoice({ id: 77 }))
      )
    )

    renderAtPath(77)

    // InvoiceForm loads existing lines — the default fixture has one line with
    // quantity 1. The quantity field should be pre-populated.
    await screen.findByText('Edit Invoice')
    const quantityInputs = screen.getAllByRole('spinbutton')
    // JSDOM returns input values as strings regardless of type="number"
    expect(quantityInputs[0]).toHaveValue('1')
  })
})
