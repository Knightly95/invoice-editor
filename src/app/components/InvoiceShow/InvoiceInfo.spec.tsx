import { http, HttpResponse } from 'msw'
import { render, screen, userEvent, within } from 'specs/testUtils'
import { server, serverBaseURL } from 'specs/mocks/server'
import InvoiceInfo from './InvoiceInfo'
import { makeInvoice } from 'specs/fixtures'

describe('InvoiceInfo', () => {
  it('shows Finalize and Delete buttons for a draft invoice, and Edit is enabled', () => {
    render(<InvoiceInfo invoice={makeInvoice({ finalized: false })} />)

    expect(
      screen.getByRole('button', { name: /finalize/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    // Edit has `href` on draft invoices → Ant Design renders it as a link, not a button
    expect(screen.getByRole('link', { name: /edit/i })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('shows the paid toggle and disables Edit for a finalized invoice', () => {
    render(
      <InvoiceInfo invoice={makeInvoice({ finalized: true, paid: false })} />
    )

    expect(
      screen.getByRole('button', { name: /mark as paid/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: /finalize/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /delete/i })
    ).not.toBeInTheDocument()
  })

  it('opens a confirmation modal and calls finalizeInvoice on confirm', async () => {
    const user = userEvent.setup()
    const invoice = makeInvoice({ id: 42, finalized: false })
    server.use(
      http.put(`${serverBaseURL}/invoices/:id`, () =>
        HttpResponse.json({ ...invoice, finalized: true })
      )
    )

    render(<InvoiceInfo invoice={invoice} />)
    await user.click(screen.getByRole('button', { name: /finalize/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /finalize/i }))

    await screen.findByText('Invoice finalized successfully')
  })

  it('opens a confirmation modal and calls deleteInvoice on confirm', async () => {
    const user = userEvent.setup()
    const invoice = makeInvoice({ id: 42, finalized: false })
    server.use(
      http.delete(
        `${serverBaseURL}/invoices/:id`,
        () => new HttpResponse(null, { status: 200 })
      )
    )

    render(<InvoiceInfo invoice={invoice} />)
    await user.click(screen.getByRole('button', { name: /delete/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await screen.findByText('Invoice deleted successfully')
  })
})
