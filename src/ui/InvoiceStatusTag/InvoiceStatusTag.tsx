import { Tag } from 'antd'

/**
 * Ant Design's "success" and "processing" tags use light text that fails the
 * WCAG AA contrast ratio (4.5:1). These keep the same look with darker text.
 */
const paidStyle = {
  color: '#135200',
  background: '#f6ffed',
  borderColor: '#b7eb8f',
}
const finalizedStyle = {
  color: '#003eb3',
  background: '#e6f4ff',
  borderColor: '#91caff',
}

interface InvoiceStatusTagProps {
  finalized: boolean
  paid: boolean
}

export function InvoiceStatusTag({
  finalized,
  paid,
}: InvoiceStatusTagProps): JSX.Element {
  if (paid) return <Tag style={paidStyle}>Paid</Tag>
  if (finalized) return <Tag style={finalizedStyle}>Finalized</Tag>
  return <Tag color="default">Draft</Tag>
}
