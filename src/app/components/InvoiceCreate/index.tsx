import { useRef } from 'react'
import InvoiceForm from 'app/components/InvoiceForm/InvoiceForm'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCreateInvoice } from './hooks/useCreateInvoice'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Invoice } from 'types'
import { buildTemplateValues } from './buildTemplateValues'

const InvoiceCreate = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const onSaveSuccessRef = useRef<(() => void) | null>(null)

  const templateInvoice = (location.state as { template?: Invoice } | null)
    ?.template
  const templateValues = templateInvoice
    ? buildTemplateValues(templateInvoice)
    : undefined

  const { createInvoice } = useCreateInvoice({
    onSuccess: (invoice) => {
      onSaveSuccessRef.current?.()
      navigate(`/invoices/${invoice.id}`)
    },
  })

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
            onClick={() => navigate('/invoices')}
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
            Invoices
          </button>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1,
            }}
          >
            {templateInvoice ? 'New Invoice (from template)' : 'New Invoice'}
          </span>
        </div>
      </div>
      <InvoiceForm
        invoice={null}
        onCancel={() => navigate('/invoices')}
        overrideDefaultValues={templateValues}
        onSave={(data, onSaveSuccess) => {
          onSaveSuccessRef.current = onSaveSuccess
          createInvoice(data)
        }}
      />
    </div>
  )
}

export default InvoiceCreate
