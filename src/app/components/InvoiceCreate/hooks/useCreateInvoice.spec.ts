import { http, HttpResponse } from 'msw'
import { act, renderHook, screen } from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import { mockEndpoint } from 'specs/mocks/server'
import { useCreateInvoice } from './useCreateInvoice'
import { makeCustomer, makeInvoice, makeProduct } from 'specs/fixtures'
import type { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import type { Invoice } from 'types'

const formValues: InvoiceFormValues = {
  customer: makeCustomer(),
  issueDate: new Date('2025-01-15'),
  deadline: new Date('2025-02-15'),
  invoice_lines: [{ product: makeProduct(), quantity: 1, _destroy: false }],
}

describe('useCreateInvoice', () => {
  it('shows a success toast and calls onSuccess with the created invoice', async () => {
    mockEndpoint({ endpointName: 'postInvoices', response: makeInvoice() })
    const onSuccess = jest.fn<void, [Invoice]>()

    const { result } = renderHook(() => useCreateInvoice({ onSuccess }))
    act(() => result.current.createInvoice(formValues))

    await screen.findByText('Invoice created successfully')
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 100 }))
  })

  it('shows an error toast when the API call fails', async () => {
    server.use(
      http.post(`${serverBaseURL}/invoices`, () =>
        HttpResponse.json({ message: 'Unprocessable' }, { status: 422 })
      )
    )
    const { result } = renderHook(() =>
      useCreateInvoice({ onSuccess: jest.fn() })
    )
    act(() => result.current.createInvoice(formValues))

    await screen.findByText('Failed to create invoice')
  })
})
