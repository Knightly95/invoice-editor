import { http, HttpResponse } from 'msw'
import { act, renderHook, screen } from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import { useDeleteInvoice } from './useDeleteInvoice'
import { makeInvoice } from 'specs/fixtures'

describe('useDeleteInvoice', () => {
  it('shows a success toast and calls onSuccess after deletion', async () => {
    server.use(
      http.delete(
        `${serverBaseURL}/invoices/:id`,
        () => new HttpResponse(null, { status: 200 })
      )
    )
    const onSuccess = jest.fn()

    const { result } = renderHook(() => useDeleteInvoice({ onSuccess }))
    act(() => result.current.deleteInvoice(makeInvoice()))

    await screen.findByText('Invoice deleted successfully')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('shows an error toast when deletion fails', async () => {
    server.use(
      http.delete(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    )

    const { result } = renderHook(() =>
      useDeleteInvoice({ onSuccess: jest.fn() })
    )
    act(() => result.current.deleteInvoice(makeInvoice()))

    await screen.findByText('Failed to delete invoice')
  })
})
