import { Components } from 'api/gen/client'
import { tableColumns } from './structure'
import { Table } from 'antd'
import Big from 'big.js'
import formatAmount from 'helpers/formatAmount'
import { InvoiceLine } from 'types'

interface InvoiceLinesProps {
  invoice: Components.Schemas.Invoice
}

const InvoiceLines = ({ invoice }: InvoiceLinesProps) => {
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
        dataSource={invoice.invoice_lines}
        rowKey="id"
        columns={tableColumns}
        pagination={false}
        summary={(lines: readonly InvoiceLine[]) => {
          const total = lines.reduce(
            (sum, line) => sum.plus(new Big(line.price)),
            new Big(0)
          )
          const tax = lines.reduce(
            (sum, line) => sum.plus(new Big(line.tax)),
            new Big(0)
          )
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <strong>Totals</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <strong>{formatAmount(tax.toNumber())}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <strong>{formatAmount(total.toNumber())}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )
        }}
      />
    </div>
  )
}

export default InvoiceLines
