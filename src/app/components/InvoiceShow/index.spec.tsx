import React from 'react'
import { render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import { ApiProvider } from 'api'
import { ToastProvider } from 'app/contexts/ToastContext'
import { screen, createTestQueryClient } from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import InvoiceShow from './index'
import { makeInvoice, makeCustomer, makeInvoiceLine } from 'specs/fixtures'

function renderAtPath(id: number) {
  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(
    [{ path: '/invoices/:id', element: <InvoiceShow /> }],
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

describe('InvoiceShow', () => {
  it('renders customer details once the invoice loads', async () => {
    const invoice = makeInvoice({
      id: 55,
      customer: makeCustomer({ first_name: 'Sophie', last_name: 'Dupont' }),
    })
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(invoice)
      )
    )

    renderAtPath(55)

    // Customer name appears in the CustomerDetails card
    expect(await screen.findByText('Sophie Dupont')).toBeInTheDocument()
    // Country field is rendered via Descriptions.Item
    expect(screen.getByText('France')).toBeInTheDocument()
  })

  it('renders the invoice lines table with product labels and summary totals', async () => {
    const line = makeInvoiceLine({ label: 'Consulting', quantity: 2 })
    const invoice = makeInvoice({ id: 55, invoice_lines: [line] })
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(invoice)
      )
    )

    renderAtPath(55)

    // Table renders by product label column (structure.tsx `label` column renders product.label)
    expect(await screen.findByText('Test Product')).toBeInTheDocument()
    // Summary row is always rendered
    expect(screen.getByText('Totals')).toBeInTheDocument()
  })

  it('renders "No customer details available" when the invoice has no customer', async () => {
    const invoice = makeInvoice({ id: 55, customer: undefined })
    server.use(
      http.get(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(invoice)
      )
    )

    renderAtPath(55)

    expect(
      await screen.findByText('No customer details available')
    ).toBeInTheDocument()
  })
})
