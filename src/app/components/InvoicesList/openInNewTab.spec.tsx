import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import { ApiProvider } from 'api'
import { ToastProvider } from 'app/contexts/ToastContext'
import { mockEndpoint, serverBaseURL } from 'specs/mocks/server'
import { createTestQueryClient } from 'specs/testUtils'
import { makeInvoice } from 'specs/fixtures'
import InvoicesList from './index'

const emptyPage = { page: 1, page_size: 10, total_pages: 1, total_entries: 0 }

describe('InvoicesList: open in a new tab', () => {
  beforeEach(() => {
    mockEndpoint({
      endpointName: 'getSearchCustomers',
      response: { customers: [], pagination: emptyPage },
    })
    mockEndpoint({
      endpointName: 'getInvoices',
      response: {
        invoices: [makeInvoice({ id: 42 })],
        pagination: { ...emptyPage, total_entries: 1 },
      },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('keeps the base path when a row is Ctrl+clicked', async () => {
    const open = jest.spyOn(window, 'open').mockReturnValue(null)
    const router = createMemoryRouter(
      [{ path: '/invoices', element: <InvoicesList /> }],
      {
        basename: '/invoice-editor',
        initialEntries: ['/invoice-editor/invoices'],
      }
    )
    render(
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

    const user = userEvent.setup()
    await user.keyboard('{Control>}')
    await user.click(await screen.findByText('Alice Martin'))
    await user.keyboard('{/Control}')

    expect(open).toHaveBeenCalledWith('/invoice-editor/invoices/42', '_blank')
  })
})
