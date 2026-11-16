import { render, screen, userEvent } from 'specs/testUtils'
import { InvoiceRowActions } from './InvoiceRowActions'
import { makeInvoice } from 'specs/fixtures'
import type { Invoice } from 'types'

const noop = jest.fn()

const defaultProps = {
  onEdit: noop,
  onFinalize: noop,
  onDelete: noop,
  onTogglePaid: noop,
  onUseAsTemplate: noop,
}

async function openMenu(invoice: Invoice) {
  render(<InvoiceRowActions invoice={invoice} {...defaultProps} />)
  await userEvent.click(screen.getByRole('button', { name: 'Invoice actions' }))
}

describe('InvoiceRowActions', () => {
  it('shows draft-only actions (Edit, Finalize, Delete) and no paid actions for a draft invoice', async () => {
    await openMenu(makeInvoice({ finalized: false }))

    expect(await screen.findByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Finalize')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.queryByText('Mark as paid')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark as unpaid')).not.toBeInTheDocument()
  })

  it('shows only "Mark as unpaid" for a finalized+paid invoice (no Edit, Finalize, Delete)', async () => {
    await openMenu(makeInvoice({ finalized: true, paid: true }))

    expect(await screen.findByText('Mark as unpaid')).toBeInTheDocument()
    expect(screen.queryByText('Mark as paid')).not.toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Finalize')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('shows only "Mark as paid" for a finalized+unpaid invoice (no Edit, Finalize, Delete)', async () => {
    await openMenu(makeInvoice({ finalized: true, paid: false }))

    expect(await screen.findByText('Mark as paid')).toBeInTheDocument()
    expect(screen.queryByText('Mark as unpaid')).not.toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Finalize')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })
})
