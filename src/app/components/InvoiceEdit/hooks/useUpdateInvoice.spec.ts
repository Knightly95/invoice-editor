import { http, HttpResponse } from 'msw'
import { act, renderHook, screen } from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import { useUpdateInvoice } from './useUpdateInvoice'
import { makeCustomer, makeInvoice, makeProduct } from 'specs/fixtures'
import type { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import type { Invoice } from 'types'

const formValues: InvoiceFormValues = {
  customer: makeCustomer(),
  issueDate: new Date('2025-01-15'),
  deadline: new Date('2025-02-15'),
  invoice_lines: [
    { id: '1', product: makeProduct(), quantity: 1, _destroy: false },
  ],
}

describe('useUpdateInvoice', () => {
  it('shows a success toast and calls onSuccess with the updated invoice', async () => {
    const updatedInvoice = makeInvoice({ total: '200.00' })
    server.use(
      http.put(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(updatedInvoice)
      )
    )
    const onSuccess = jest.fn<void, [Invoice]>()

    const { result } = renderHook(() => useUpdateInvoice({ onSuccess }))
    act(() =>
      result.current.updateInvoice({ invoice: makeInvoice(), data: formValues })
    )

    await screen.findByText('Invoice saved successfully')
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ total: '200.00' })
    )
  })

  it('shows an error toast when the API call fails', async () => {
    server.use(
      http.put(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    )
    const { result } = renderHook(() =>
      useUpdateInvoice({ onSuccess: jest.fn() })
    )
    act(() =>
      result.current.updateInvoice({ invoice: makeInvoice(), data: formValues })
    )

    await screen.findByText('Failed to save invoice')
  })
})
