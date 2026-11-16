import type { SortOrder } from 'antd/es/table/interface'
import { TableProps } from 'antd'
import formatAmount from 'helpers/formatAmount'
import formatDate from 'helpers/formatDate'
import getCustomerAddress from 'helpers/getCustomerAddress'
import getCustomerName from 'helpers/getCustomerName'
import { InvoiceStatusTag } from 'ui/InvoiceStatusTag/InvoiceStatusTag'
import { Customer, Invoice } from 'types'
import { InvoiceRowActions } from './InvoiceRowActions'

interface RowActionCallbacks {
  onEdit: (invoice: Invoice) => void
  onFinalize: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
  onTogglePaid: (invoice: Invoice) => void
  onUseAsTemplate: (invoice: Invoice) => void
}

export function tableColumns(
  sortField: string | null,
  sortOrder: SortOrder,
  actions: RowActionCallbacks
): TableProps<Invoice>['columns'] {
  return [
    {
      key: 'actions',
      title: '',
      width: 48,
      render: (_: unknown, record: Invoice) => (
        <InvoiceRowActions invoice={record} {...actions} />
      ),
      onCell: () => ({ onClick: (e: React.MouseEvent) => e.stopPropagation() }),
    },
    {
      key: 'id',
      title: '#',
      dataIndex: 'id',
      width: 80,
    },
    {
      key: 'customer',
      title: 'Customer',
      dataIndex: 'customer',
      render: (customer: Customer) => getCustomerName(customer) ?? '-',
    },
    {
      key: 'address',
      title: 'Address',
      dataIndex: 'customer',
      render: (customer: Customer) => getCustomerAddress(customer) ?? '-',
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'finalized',
      width: 110,
      render: (_: boolean, record: Invoice) => (
        <InvoiceStatusTag finalized={record.finalized} paid={record.paid} />
      ),
    },
    {
      key: 'tax',
      title: 'Tax',
      dataIndex: 'tax',
      align: 'right',
      sorter: true,
      sortOrder: sortField === 'tax' ? sortOrder : null,
      render: (tax: string | null) => (tax != null ? formatAmount(tax) : '-'),
    },
    {
      key: 'total',
      title: 'Total',
      dataIndex: 'total',
      align: 'right',
      sorter: true,
      sortOrder: sortField === 'total' ? sortOrder : null,
      render: (total: string | null) =>
        total != null ? formatAmount(total) : '-',
    },
    {
      key: 'date',
      title: 'Date',
      dataIndex: 'date',
      width: 110,
      sorter: true,
      sortOrder: sortField === 'date' ? sortOrder : null,
      render: (date: string) => formatDate(date),
    },
    {
      key: 'deadline',
      title: 'Deadline',
      dataIndex: 'deadline',
      width: 110,
      sorter: true,
      sortOrder: sortField === 'deadline' ? sortOrder : null,
      render: (deadline: string) => formatDate(deadline),
    },
  ]
}
