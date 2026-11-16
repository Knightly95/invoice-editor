import { http, HttpResponse } from 'msw'
import {
  act,
  renderHook,
  screen,
  waitFor,
  createTestWrapper,
} from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import { useTogglePaid } from './useTogglePaid'
import { makeInvoice } from 'specs/fixtures'
import type { Invoice } from 'types'

describe('useTogglePaid', () => {
  it('optimistically flips paid status in the cache before the API responds', async () => {
    // Deferred PUT — we control when it resolves so we can inspect intermediate state
    let resolvePut!: () => void
    server.use(
      http.put(
        `${serverBaseURL}/invoices/:id`,
        () =>
          new Promise<Response>((resolve) => {
            resolvePut = () =>
              resolve(
                HttpResponse.json(
                  makeInvoice({ paid: true })
                ) as unknown as Response
              )
          })
      )
    )

    const { queryClient, Wrapper } = createTestWrapper()
    const unpaidInvoice = makeInvoice({ id: 100, paid: false })
    queryClient.setQueryData(['invoice', '100'], unpaidInvoice)

    const { result } = renderHook(() => useTogglePaid(), { wrapper: Wrapper })

    act(() => result.current.togglePaid(unpaidInvoice))

    // onMutate sets paid:true in the cache before the PUT resolves
    await waitFor(() => {
      expect(
        (queryClient.getQueryData(['invoice', '100']) as Invoice).paid
      ).toBe(true)
    })

    // Clean up: resolve the pending request
    resolvePut()
    await screen.findByText('Invoice marked as paid')
  })

  it('rolls back the optimistic update and shows an error toast on failure', async () => {
    server.use(
      http.put(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    )

    const { queryClient, Wrapper } = createTestWrapper()
    const unpaidInvoice = makeInvoice({ id: 100, paid: false })
    queryClient.setQueryData(['invoice', '100'], unpaidInvoice)

    const { result } = renderHook(() => useTogglePaid(), { wrapper: Wrapper })

    act(() => result.current.togglePaid(unpaidInvoice))

    // After error, onError restores the pre-mutation snapshot
    await waitFor(() => {
      expect(
        (queryClient.getQueryData(['invoice', '100']) as Invoice).paid
      ).toBe(false)
    })
    await screen.findByText('Failed to update paid status')
  })

  it('shows a contextual "marked as unpaid" toast when toggling a paid invoice off', async () => {
    const unpaidResponse = makeInvoice({ id: 100, paid: false })
    server.use(
      http.put(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json(unpaidResponse)
      )
    )

    const { result } = renderHook(() => useTogglePaid())
    act(() => result.current.togglePaid(makeInvoice({ id: 100, paid: true })))

    await screen.findByText('Invoice marked as unpaid')
  })
})
