import { App, Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import { Invoice } from 'types'

interface InvoiceRowActionsProps {
  invoice: Invoice
  onEdit: (invoice: Invoice) => void
  onFinalize: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
  onTogglePaid: (invoice: Invoice) => void
  onUseAsTemplate: (invoice: Invoice) => void
}

export function InvoiceRowActions({
  invoice,
  onEdit,
  onFinalize,
  onDelete,
  onTogglePaid,
  onUseAsTemplate,
}: InvoiceRowActionsProps): JSX.Element {
  const { modal } = App.useApp()

  const items: MenuProps['items'] = [
    // --- Draft-only actions ---
    !invoice.finalized && {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => onEdit(invoice),
    },
    !invoice.finalized && {
      key: 'finalize',
      label: 'Finalize',
      icon: <LockOutlined />,
      onClick: () =>
        modal.confirm({
          title: 'Finalize invoice',
          content:
            'This action cannot be undone. The invoice will be locked for editing.',
          okText: 'Finalize',
          okType: 'primary',
          cancelText: 'Cancel',
          onOk: () => onFinalize(invoice),
        }),
    },
    !invoice.finalized && {
      key: 'delete',
      label: 'Delete',
      danger: true,
      icon: <DeleteOutlined />,
      onClick: () =>
        modal.confirm({
          title: 'Delete invoice',
          content:
            'This invoice will be permanently deleted. This action cannot be undone.',
          okText: 'Delete',
          okType: 'danger',
          cancelText: 'Cancel',
          onOk: () => onDelete(invoice),
        }),
    },
    // --- Finalized-only actions ---
    invoice.finalized &&
      !invoice.paid && {
        key: 'mark-paid',
        label: 'Mark as paid',
        icon: <CheckOutlined />,
        onClick: () => onTogglePaid(invoice),
      },
    invoice.finalized &&
      invoice.paid && {
        key: 'mark-unpaid',
        label: 'Mark as unpaid',
        icon: <CloseOutlined />,
        onClick: () => onTogglePaid(invoice),
      },
    // --- Always available ---
    { type: 'divider' },
    {
      key: 'template',
      label: 'Use as template',
      icon: <CopyOutlined />,
      onClick: () => onUseAsTemplate(invoice),
    },
  ].filter(Boolean) as MenuProps['items']

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomLeft">
      <Button
        type="text"
        size="small"
        icon={<MoreOutlined />}
        onClick={(e) => e.stopPropagation()}
        aria-label="Invoice actions"
      />
    </Dropdown>
  )
}
