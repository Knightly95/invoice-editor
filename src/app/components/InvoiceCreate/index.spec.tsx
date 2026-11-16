import React from 'react'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import { ApiProvider } from 'api'
import { ToastProvider } from 'app/contexts/ToastContext'
import { screen } from 'specs/testUtils'
import { createTestQueryClient } from 'specs/testUtils'
import { mockEndpoint, serverBaseURL } from 'specs/mocks/server'
import InvoiceCreate from './index'
import { makeInvoice } from 'specs/fixtures'
import type { Invoice } from 'types'

const emptyProductsResponse = {
  products: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}
const emptyCustomersResponse = {
  customers: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}

/**
 * InvoiceForm uses `useBlocker` which requires a data router.
 * `MemoryRouter` (legacy) does not support blocking — so we must use
 * `createMemoryRouter` + `RouterProvider` here instead of testUtils `render`.
 */
function renderInvoiceCreate(state?: { template: Invoice }) {
  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(
    [{ path: '/invoices/new', element: <InvoiceCreate /> }],
    {
      initialEntries: [{ pathname: '/invoices/new', state: state ?? null }],
    }
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
  mockEndpoint({
    endpointName: 'getSearchCustomers',
    response: emptyCustomersResponse,
  })
  mockEndpoint({
    endpointName: 'getSearchProducts',
    response: emptyProductsResponse,
  })
})

describe('InvoiceCreate', () => {
  it('renders the "New Invoice" title when there is no template', async () => {
    renderInvoiceCreate()

    expect(await screen.findByText('New Invoice')).toBeInTheDocument()
    expect(
      screen.queryByText('New Invoice (from template)')
    ).not.toBeInTheDocument()
  })

  it('renders the "New Invoice (from template)" title when a template invoice is provided via location state', async () => {
    renderInvoiceCreate({ template: makeInvoice() })

    expect(
      await screen.findByText('New Invoice (from template)')
    ).toBeInTheDocument()
  })
})
