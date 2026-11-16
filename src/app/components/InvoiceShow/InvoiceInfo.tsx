import { App, Button, Flex, Tooltip } from 'antd'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { Components } from 'api/gen/client'
import formatDate from 'helpers/formatDate'
import { useNavigate } from 'react-router-dom'
import {
  useDeleteInvoice,
  useFinalizeInvoice,
  useTogglePaid,
} from 'app/hooks/invoices'
import { InvoiceStatusTag } from 'ui/InvoiceStatusTag/InvoiceStatusTag'
import LinkButton from 'ui/LinkButton/LinkButton'

interface InvoiceInfoProps {
  invoice: Components.Schemas.Invoice
}

const InvoiceInfo = ({ invoice }: InvoiceInfoProps) => {
  const { modal } = App.useApp()
  const navigate = useNavigate()
  const { finalizeInvoice, isPending: isFinalizePending } = useFinalizeInvoice()
  const { deleteInvoice, isPending: isDeletePending } = useDeleteInvoice({
    onSuccess: () => navigate('/invoices'),
  })
  const { togglePaid, isPending: isTogglePaidPending } = useTogglePaid()

  const handleFinalize = () => {
    modal.confirm({
      title: 'Finalize this invoice?',
      content:
        'This action is irreversible. Once finalized, the invoice can no longer be edited.',
      okText: 'Finalize',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: () => finalizeInvoice(invoice),
    })
  }

  const handleDelete = () => {
    modal.confirm({
      title: 'Delete this invoice?',
      content:
        'This invoice will be permanently deleted. This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteInvoice(invoice),
    })
  }

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--card-radius)',
        padding: '20px 24px',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <Flex align="center" justify="space-between" gap={24} wrap="wrap">
        {/* Left: breadcrumb + invoice identity */}
        <Flex align="center" gap={16}>
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
            <Flex align="center" gap={8}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#111827',
                  lineHeight: 1,
                }}
              >
                #{invoice.id}
              </span>
              <InvoiceStatusTag
                finalized={invoice.finalized}
                paid={invoice.paid}
              />
            </Flex>
          </div>
        </Flex>

        {/* Center: dates */}
        <Flex gap={40}>
          <div>
            <div
              style={{
                color: '#8c8c8c',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 2,
              }}
            >
              Issue Date
            </div>
            <div style={{ fontWeight: 500 }}>{formatDate(invoice.date)}</div>
          </div>
          <div>
            <div
              style={{
                color: '#8c8c8c',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 2,
              }}
            >
              Deadline
            </div>
            <div style={{ fontWeight: 500 }}>
              {formatDate(invoice.deadline)}
            </div>
          </div>
        </Flex>

        {/* Right: actions */}
        <Flex gap={8} align="center">
          {!invoice.finalized && (
            <>
              <Button
                onClick={handleFinalize}
                loading={isFinalizePending}
                type="primary"
                icon={<LockOutlined />}
              >
                Finalize
              </Button>
              <Button
                onClick={handleDelete}
                loading={isDeletePending}
                danger
                type="text"
                icon={<DeleteOutlined />}
              >
                Delete
              </Button>
            </>
          )}
          {invoice.finalized && (
            <Button
              onClick={() => togglePaid(invoice)}
              loading={isTogglePaidPending}
              type={invoice.paid ? 'default' : 'primary'}
              icon={invoice.paid ? <CloseOutlined /> : <CheckOutlined />}
            >
              {invoice.paid ? 'Mark as Unpaid' : 'Mark as Paid'}
            </Button>
          )}
          <Button
            onClick={() =>
              navigate('/invoices/new', { state: { template: invoice } })
            }
            icon={<CopyOutlined />}
          >
            Use as template
          </Button>
          <Tooltip
            title={
              invoice.finalized
                ? 'Finalized invoices cannot be edited'
                : undefined
            }
          >
            <LinkButton
              type="primary"
              to={`/invoices/${invoice.id}/edit`}
              disabled={invoice.finalized}
              icon={<EditOutlined />}
            >
              Edit
            </LinkButton>
          </Tooltip>
        </Flex>
      </Flex>
    </div>
  )
}

export default InvoiceInfo
