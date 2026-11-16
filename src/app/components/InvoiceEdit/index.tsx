import { useRef, useCallback } from 'react'
import InvoiceForm from 'app/components/InvoiceForm/InvoiceForm'
import { useNavigate } from 'react-router-dom'
import { useUpdateInvoice } from './hooks/useUpdateInvoice'
import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import withInvoice from 'hocs/WithInvoice'
import { Invoice } from 'types'
import { ArrowLeftOutlined } from '@ant-design/icons'

interface InvoiceEditProps {
  invoice: Invoice
}

const InvoiceEdit = ({ invoice }: InvoiceEditProps) => {
  const navigate = useNavigate()

  const onSaveSuccessRef = useRef<(() => void) | null>(null)

  const { updateInvoice } = useUpdateInvoice({
    onSuccess: () => {
      onSaveSuccessRef.current?.()
      navigate('/invoices')
    },
  })

  const handleSave = useCallback(
    (data: InvoiceFormValues, onSaveSuccess: () => void) => {
      onSaveSuccessRef.current = onSaveSuccess
      updateInvoice({ invoice, data })
    },
    [updateInvoice, invoice]
  )

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--card-radius)',
          padding: '20px 24px',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#6b7280',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            <ArrowLeftOutlined style={{ fontSize: 11 }} />
            Invoice #{invoice.id}
          </button>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1,
            }}
          >
            Edit Invoice
          </span>
        </div>
      </div>
      <InvoiceForm
        invoice={invoice}
        onCancel={() => navigate(`/invoices/${invoice.id}`)}
        onSave={handleSave}
      />
    </div>
  )
}

export default withInvoice(InvoiceEdit)
