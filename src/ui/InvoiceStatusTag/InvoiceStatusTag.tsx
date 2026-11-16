import { Tag } from 'antd'

interface InvoiceStatusTagProps {
  finalized: boolean
  paid: boolean
}

export function InvoiceStatusTag({
  finalized,
  paid,
}: InvoiceStatusTagProps): JSX.Element {
  if (paid) return <Tag color="success">Paid</Tag>
  if (finalized) return <Tag color="processing">Finalized</Tag>
  return <Tag color="default">Draft</Tag>
}
