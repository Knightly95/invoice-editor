import React from 'react'
import { render } from '@testing-library/react'
import {
  createMemoryRouter,
  RouterProvider,
  useNavigate,
} from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp } from 'antd'
import userEvent from '@testing-library/user-event'

import { ApiProvider } from 'api'
import { ToastProvider } from 'app/contexts/ToastContext'
import { screen, createTestQueryClient } from 'specs/testUtils'
import { within } from '@testing-library/react'
import { mockEndpoint, serverBaseURL } from 'specs/mocks/server'
import { makeCustomer, makeInvoice, makeProduct } from 'specs/fixtures'
import type { Invoice } from 'types'
import InvoiceForm from './InvoiceForm'
import type { InvoiceFormValues } from './schema'

// ─── MSW stubs ────────────────────────────────────────────────────────────────

const emptyProducts = {
  products: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}
const emptyCustomers = {
  customers: [],
  pagination: { page: 1, page_size: 10, total_pages: 1, total_entries: 0 },
}

// ─── Router wrappers ──────────────────────────────────────────────────────────
//
// InvoiceForm calls useBlocker which requires a Data Router context.
// MemoryRouter (legacy) does not implement blocking — so createMemoryRouter +
// RouterProvider is required here, matching the pattern established in T-5.

interface FormWrapperProps {
  invoice: Invoice | null
  onSave: (data: InvoiceFormValues, onSaveSuccess: () => void) => void
  overrideDefaultValues?: Partial<InvoiceFormValues>
}

function FormWrapper({
  invoice,
  onSave,
  overrideDefaultValues,
}: FormWrapperProps) {
  const navigate = useNavigate()
  return (
    <InvoiceForm
      invoice={invoice}
      onCancel={() => navigate('/invoices')}
      onSave={onSave}
      overrideDefaultValues={overrideDefaultValues}
    />
  )
}

// Simulates the parent's onSuccess handler: calls onSaveSuccess() (sets
// skipBlockerRef = true) then navigates — the exact sequence used in
// InvoiceEdit/InvoiceCreate. Used to verify that post-save navigation never
// triggers the blocker even if isDirty hasn't flushed yet.
function ImmediateSaveFormWrapper({ invoice }: { invoice: Invoice }) {
  const navigate = useNavigate()
  const handleSave = (_data: InvoiceFormValues, onSaveSuccess: () => void) => {
    onSaveSuccess()
    navigate('/invoices')
  }
  return (
    <InvoiceForm
      invoice={invoice}
      onCancel={() => navigate('/invoices')}
      onSave={handleSave}
    />
  )
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function buildProviders(router: ReturnType<typeof createMemoryRouter>) {
  const queryClient = createTestQueryClient()
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

function renderInvoiceForm(
  invoice: Invoice | null = null,
  options: {
    onSave?: (data: InvoiceFormValues, onSaveSuccess: () => void) => void
    overrideDefaultValues?: Partial<InvoiceFormValues>
  } = {}
) {
  const onSave = options.onSave ?? jest.fn()
  const initialPath = invoice ? `/invoices/${invoice.id}/edit` : '/invoices/new'

  const router = createMemoryRouter(
    [
      {
        path: '/invoices/new',
        element: (
          <FormWrapper
            invoice={null}
            onSave={onSave}
            overrideDefaultValues={options.overrideDefaultValues}
          />
        ),
      },
      {
        path: '/invoices/:id/edit',
        element: (
          <FormWrapper
            invoice={invoice}
            onSave={onSave}
            overrideDefaultValues={options.overrideDefaultValues}
          />
        ),
      },
      { path: '/invoices', element: <div>Invoices list</div> },
    ],
    { initialEntries: [initialPath] }
  )

  buildProviders(router)
  return { onSave }
}

function renderForPostSaveTest(invoice: Invoice) {
  const router = createMemoryRouter(
    [
      {
        path: '/invoices/:id/edit',
        element: <ImmediateSaveFormWrapper invoice={invoice} />,
      },
      { path: '/invoices', element: <div>Invoices list</div> },
    ],
    { initialEntries: [`/invoices/${invoice.id}/edit`] }
  )
  return buildProviders(router)
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEndpoint({ endpointName: 'getSearchCustomers', response: emptyCustomers })
  mockEndpoint({ endpointName: 'getSearchProducts', response: emptyProducts })
})

// ─────────────────────────────────────────────────────────────────────────────
// Navigation guard
// ─────────────────────────────────────────────────────────────────────────────

describe('InvoiceForm — navigation guard', () => {
  it('blocks navigation when the form is dirty', async () => {
    const user = userEvent.setup()
    renderInvoiceForm(makeInvoice())

    // Ant Design v5 InputNumber renders the <input> itself as role="spinbutton".
    const input = (await screen.findByRole('spinbutton')) as HTMLInputElement
    await user.clear(input)
    await user.type(input, '2')

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.queryByText('Invoices list')).not.toBeInTheDocument()
  })

  it('proceeds with navigation when "Leave" is confirmed in the modal', async () => {
    const user = userEvent.setup()
    renderInvoiceForm(makeInvoice())

    const input = (await screen.findByRole('spinbutton')) as HTMLInputElement
    await user.clear(input)
    await user.type(input, '2')

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    await screen.findByText('Unsaved changes')
    await user.click(screen.getByRole('button', { name: /^leave$/i }))

    expect(await screen.findByText('Invoices list')).toBeInTheDocument()
  })

  it('keeps the form open when "Stay" is clicked in the modal', async () => {
    const user = userEvent.setup()
    renderInvoiceForm(makeInvoice())

    const input = (await screen.findByRole('spinbutton')) as HTMLInputElement
    await user.clear(input)
    await user.type(input, '2')

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    await screen.findByText('Unsaved changes')
    await user.click(screen.getByRole('button', { name: /^stay$/i }))

    expect(screen.queryByText('Invoices list')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /update invoice/i })
    ).toBeInTheDocument()
  })

  it('does not block post-save navigation even before isDirty resets', async () => {
    // Simulates: dirty the form → submit → parent calls onSaveSuccess()
    // (skipBlockerRef = true) then navigate() in the same synchronous tick.
    // Even if isDirty is still true when navigate fires, the skip flag must
    // prevent the blocker from showing the confirmation modal.
    const user = userEvent.setup()
    const invoice = makeInvoice()
    renderForPostSaveTest(invoice)

    const input = (await screen.findByRole('spinbutton')) as HTMLInputElement
    await user.clear(input)
    await user.type(input, '2')

    await user.click(screen.getByRole('button', { name: /update invoice/i }))

    // Navigation proceeds without a blocker modal — the invoices list is shown.
    expect(await screen.findByText('Invoices list')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('InvoiceForm — validation', () => {
  it('shows "Customer is required" when customer is missing', async () => {
    const user = userEvent.setup()
    renderInvoiceForm()

    await user.click(screen.getByRole('button', { name: /save invoice/i }))

    expect(await screen.findByText('Customer is required')).toBeInTheDocument()
  })

  it('shows "Quantity must be greater than 0" when quantity is zero', async () => {
    const user = userEvent.setup()
    renderInvoiceForm()

    await user.click(screen.getByRole('button', { name: /save invoice/i }))

    expect(
      await screen.findByText('Quantity must be greater than 0')
    ).toBeInTheDocument()
  })

  it('blocks submission when all lines are flagged for destruction', async () => {
    // The at-least-one-active Yup test blocks handleSubmit — onSave is never called.
    const user = userEvent.setup()
    const { onSave } = renderInvoiceForm(makeInvoice())

    await user.click(screen.getByRole('button', { name: /^remove$/i }))
    await user.click(screen.getByRole('button', { name: /update invoice/i }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows the cross-field deadline error when deadline precedes issue date', async () => {
    const user = userEvent.setup()
    renderInvoiceForm(null, {
      overrideDefaultValues: {
        customer: makeCustomer(),
        invoice_lines: [
          { product: makeProduct(), quantity: 1, _destroy: false },
        ],
        issueDate: new Date('2025-02-15'),
        deadline: new Date('2025-01-15'), // before issueDate — invalid
      },
    })

    await user.click(screen.getByRole('button', { name: /save invoice/i }))

    expect(
      await screen.findByText('Deadline cannot be earlier than the issue date')
    ).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Dirty field indicator
// ─────────────────────────────────────────────────────────────────────────────

describe('InvoiceForm — dirty field indicator', () => {
  it('shows an amber left border on a modified field', async () => {
    // FieldLayout applies borderLeft: '3px solid #f59e0b' when isDirty is true.
    // JSDOM normalises the hex to rgb(245, 158, 11) in inline style values.
    const user = userEvent.setup()
    renderInvoiceForm(makeInvoice())

    // Ant Design v5 InputNumber: role="spinbutton" is on the <input> itself.
    const spinbutton = (await screen.findByRole(
      'spinbutton'
    )) as HTMLInputElement
    await user.clear(spinbutton)
    await user.type(spinbutton, '2')

    // FieldLayout renders an Ant Design Form.Item (a plain <div> with no accessible
    // role). RTL provides no upward-traversal API, so .closest() is the only option.
    // eslint-disable-next-line testing-library/no-node-access
    const formItem = spinbutton.closest('[style*="border-left"]')
    expect(formItem).not.toBeNull()
    expect(formItem).toHaveStyle('border-left: 3px solid rgb(245, 158, 11)')
  })

  it('shows a red left border on a line flagged for deletion', async () => {
    // The <tr> receives borderLeft: '3px solid #ef4444' when _destroy is true.
    // JSDOM normalises #ef4444 to rgb(239, 68, 68).
    const user = userEvent.setup()
    renderInvoiceForm(makeInvoice())

    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    await screen.findByRole('button', { name: /restore/i })
    // Find the table row that contains the Restore button via getAllByRole.
    const rows = screen.getAllByRole('row')
    const destroyedRow = rows.find((r) =>
      within(r).queryByRole('button', { name: /restore/i })
    )
    expect(destroyedRow).toHaveStyle('border-left: 3px solid rgb(239, 68, 68)')
  })

  it('removes a new line immediately when "Remove" is clicked', async () => {
    // New lines (no server id) are removed via useFieldArray.remove() — no _destroy flag.
    const user = userEvent.setup()
    renderInvoiceForm()

    expect(
      screen.getByRole('button', { name: /^remove$/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    expect(
      screen.queryByRole('button', { name: /^remove$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /restore/i })
    ).not.toBeInTheDocument()
  })
})
