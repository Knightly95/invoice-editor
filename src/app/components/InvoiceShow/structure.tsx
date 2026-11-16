import formatAmount from 'helpers/formatAmount'
import { InvoiceLine } from 'types'
import { TableProps } from 'antd'
import Big from 'big.js'

export const tableColumns: TableProps<InvoiceLine>['columns'] = [
  {
    key: 'label',
    title: 'Item',
    dataIndex: 'product',
    render: (product: InvoiceLine['product']) => product.label,
  },
  {
    key: 'quantity',
    title: 'Quantity',
    dataIndex: 'quantity',
  },
  {
    key: 'unit',
    title: 'Unit',
    dataIndex: 'unit',
  },
  {
    key: 'price',
    title: 'Unit Price',
    dataIndex: 'product',
    render: (product: InvoiceLine['product']) =>
      formatAmount(product.unit_price),
  },
  {
    key: 'vat_rate',
    title: 'VAT Rate',
    dataIndex: 'product',
    render: (product: InvoiceLine['product']) => `${product.vat_rate}%`,
  },
  {
    key: 'tax',
    title: 'Tax',
    dataIndex: 'tax',
    render: (value: string) => formatAmount(value),
  },
  {
    key: 'amount',
    title: 'Line total',
    dataIndex: 'product',
    // Big is necessary here — multiplication of two decimals requires exact arithmetic
    render: (_, line: InvoiceLine) =>
      formatAmount(
        new Big(line.product.unit_price).times(line.quantity).toNumber()
      ),
  },
]
