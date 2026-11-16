import { http, HttpResponse } from 'msw'
import { act, renderHook, screen } from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import { useFinalizeInvoice } from './useFinalizeInvoice'
import { makeInvoice } from 'specs/fixtures'

describe('useFinalizeInvoice', () => {
  it('shows a success toast when the invoice is finalized', async () => {
    const finalizedInvoice = makeInvoice({ id: 100, finalized: true })
    server.use(
      http.put(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(finalizedInvoice)
      )
    )

    const { result } = renderHook(useFinalizeInvoice)
    act(() => result.current.finalizeInvoice(makeInvoice()))

    await screen.findByText('Invoice finalized successfully')
  })

  it('shows an error toast when finalization fails', async () => {
    server.use(
      http.put(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      )
    )

    const { result } = renderHook(useFinalizeInvoice)
    act(() => result.current.finalizeInvoice(makeInvoice()))

    await screen.findByText('Failed to finalize invoice')
  })
})
