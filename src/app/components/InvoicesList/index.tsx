import { useMemo, useState } from 'react'
import Big from 'big.js'
import { useApi } from 'api'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useHref, useNavigate, useSearchParams } from 'react-router-dom'
import type {
  SorterResult,
  SortOrder,
  TablePaginationConfig,
} from 'antd/es/table/interface'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './constants'
import { tableColumns } from './structure'
import { Alert, Empty, Radio, Spin, Table } from 'antd'
import { recalculateInvoiceTotals } from 'helpers/recalculateInvoiceTotals'
import CustomerAutoComplete from 'ui/CustomerAutoComplete/CustomerAutoComplete'
import LinkButton from 'ui/LinkButton/LinkButton'
import {
  useDeleteInvoice,
  useFinalizeInvoice,
  useTogglePaid,
} from 'app/hooks/invoices'
import { Customer, Invoice } from 'types'

/**
 * Fields whose API-stored value may be stale due to BI-1 (product substitution
 * does not recompute snapshot totals). For these fields the API's sort order is
 * unreliable — we re-sort the current page client-side after recalculation.
 *
 * TODO: Remove client-side re-sort once backend fixes BI-1.
 * Cross-page ordering will only be correct after the backend fix.
 */
const CLIENT_SORTED_FIELDS = new Set<string>(['total', 'tax'])

type StatusFilter = 'all' | 'draft' | 'finalized' | 'paid'

interface ApiFilterObject {
  field: string
  operator: string
  value: boolean | number
}

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Finalized', value: 'finalized' },
  { label: 'Paid', value: 'paid' },
]

function buildFilterParam(
  status: StatusFilter,
  customerId?: number | null
): string | undefined {
  const filters: ApiFilterObject[] = []

  if (status === 'draft') {
    filters.push({ field: 'finalized', operator: 'eq', value: false })
  } else if (status === 'finalized') {
    filters.push({ field: 'finalized', operator: 'eq', value: true })
    filters.push({ field: 'paid', operator: 'eq', value: false })
  } else if (status === 'paid') {
    filters.push({ field: 'paid', operator: 'eq', value: true })
  }

  if (customerId != null) {
    filters.push({ field: 'customer_id', operator: 'eq', value: customerId })
  }

  return filters.length > 0 ? JSON.stringify(filters) : undefined
}

function buildSortParam(
  field: string | null,
  order: SortOrder
): string | undefined {
  if (!field || !order) return undefined
  return `${order === 'ascend' ? '+' : '-'}${field}`
}

const InvoicesList = (): React.ReactElement => {
  const api = useApi()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  // Includes the router basename, so new tabs open inside the app on GitHub Pages.
  const invoicesHref = useHref('/invoices')

  const { finalizeInvoice } = useFinalizeInvoice()
  const { deleteInvoice } = useDeleteInvoice({ onSuccess: () => {} })
  const { togglePaid } = useTogglePaid()

  const rowActions = {
    onEdit: (invoice: Invoice) => navigate(`/invoices/${invoice.id}/edit`),
    onFinalize: (invoice: Invoice) => finalizeInvoice(invoice),
    onDelete: (invoice: Invoice) => deleteInvoice(invoice),
    onTogglePaid: (invoice: Invoice) => togglePaid(invoice),
    onUseAsTemplate: (invoice: Invoice) =>
      navigate('/invoices/new', { state: { template: invoice } }),
  }

  const currentPage = Number(searchParams.get('page')) || 1
  const perPage = Number(searchParams.get('perPage')) || DEFAULT_PAGE_SIZE
  const status = (searchParams.get('status') as StatusFilter) ?? 'all'
  const sortField = searchParams.get('sortField')
  const sortOrder = (searchParams.get('sortOrder') as SortOrder) ?? null

  // Customer kept in local state — the full object is required for the autocomplete display
  // and cannot be meaningfully round-tripped through a URL param without an extra fetch.
  const [customer, setCustomer] = useState<Customer | null>(null)

  const filterParam = buildFilterParam(status, customer?.id)
  const sortParam = buildSortParam(sortField, sortOrder)

  const { data, isPending, isError } = useQuery({
    queryKey: ['invoices', currentPage, perPage, filterParam, sortParam],
    queryFn: () =>
      api.getInvoices({
        page: currentPage,
        per_page: perPage,
        filter: filterParam,
        sort: sortParam,
      }),
    select: (responseData) => ({
      ...responseData.data,
      invoices: responseData.data.invoices.map(recalculateInvoiceTotals),
    }),
    placeholderData: keepPreviousData,
  })

  // TODO: Remove client-side re-sort once backend fixes BI-1.
  // The API sorts `total` and `tax` by its own stale snapshot values.
  // After recalculation the values may differ, so we re-sort the current page
  // by the corrected values. This only guarantees within-page consistency —
  // cross-page ordering remains unreliable until the backend is fixed.
  const invoices = useMemo(() => {
    const base = data?.invoices ?? []
    if (!sortField || !sortOrder || !CLIENT_SORTED_FIELDS.has(sortField))
      return base
    return [...base].sort((a, b) => {
      const aVal = new Big(a[sortField as 'total' | 'tax'] ?? 0)
      const bVal = new Big(b[sortField as 'total' | 'tax'] ?? 0)
      const cmp = aVal.minus(bVal).toNumber()
      return sortOrder === 'ascend' ? cmp : -cmp
    })
  }, [data?.invoices, sortField, sortOrder])

  const handleStatusChange = (value: string | number) => {
    setSearchParams((prev) => {
      prev.set('status', value as string)
      prev.set('page', '1')
      return prev
    })
  }

  const handleCustomerChange = (value: Customer | null) => {
    setCustomer(value)
    setSearchParams((prev) => {
      prev.set('page', '1')
      return prev
    })
  }

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _: unknown,
    sorter: SorterResult<Invoice> | SorterResult<Invoice>[]
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter
    setSearchParams((prev) => {
      if (pagination.current) prev.set('page', pagination.current.toString())
      if (pagination.pageSize) {
        if (pagination.pageSize !== perPage) {
          // Page size changed — reset to page 1
          prev.set('perPage', pagination.pageSize.toString())
          prev.set('page', '1')
        }
      }
      if (!s.order) {
        prev.delete('sortField')
        prev.delete('sortOrder')
      } else {
        prev.set('sortField', s.columnKey as string)
        prev.set('sortOrder', s.order)
        prev.set('page', '1')
      }
      return prev
    })
  }

  const renderTable = () => {
    if (isPending) return <Spin size="large" />
    if (isError)
      return (
        <Alert
          type="error"
          message="Failed to load invoices"
          description="Please try again or refresh the page."
          showIcon
        />
      )
    if (invoices.length === 0)
      return (
        <Empty description="No invoices yet. Use the button above to create your first one." />
      )
    return (
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
        }}
      >
        <Table
          dataSource={invoices}
          columns={tableColumns(sortField, sortOrder, rowActions)}
          rowKey="id"
          onChange={handleTableChange}
          pagination={
            data?.pagination && {
              total: data?.pagination?.total_entries ?? 0,
              pageSize: perPage,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showSizeChanger: true,
              current: currentPage,
              style: { padding: '12px 16px' },
            }
          }
          onRow={(record) => ({
            onClick: (e) => {
              if (e.metaKey || e.ctrlKey) {
                const win = window.open(
                  `${invoicesHref}/${record.id}`,
                  '_blank'
                )
                win?.focus()
              } else {
                navigate(`/invoices/${record.id}`)
              }
            },
            // No role="button": the row contains its own action buttons, and
            // nesting interactive elements confuses screen readers.
            style: { cursor: 'pointer' },
          })}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h1
          style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}
        >
          Invoices
        </h1>
        <LinkButton type="primary" to="/invoices/new" size="middle">
          + Create Invoice
        </LinkButton>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Radio.Group
          options={STATUS_OPTIONS}
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
          optionType="button"
          buttonStyle="solid"
          aria-label="Filter by status"
        />
        <div style={{ width: 280 }}>
          <CustomerAutoComplete
            value={customer}
            onChange={handleCustomerChange}
            placeholder="Filter by customer"
            ariaLabel="Filter by customer"
          />
        </div>
      </div>
      {renderTable()}
    </div>
  )
}

export default InvoicesList
