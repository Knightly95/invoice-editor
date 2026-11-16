import { useParams } from 'react-router-dom'
import { Invoice } from 'types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useApi } from 'api'
import { recalculateInvoiceTotals } from 'helpers/recalculateInvoiceTotals'

interface WithInvoiceProps {
  invoice: Invoice
}

function withInvoice(WrappedComponent: React.ComponentType<WithInvoiceProps>) {
  return function WithValidInvoiceIdHOC() {
    const api = useApi()

    const { id } = useParams<{ id: string }>()
    const isValidInvoiceId = id !== undefined && !isNaN(Number(id))

    const { data: invoice, isPending: isGetInvoicePending } = useQuery({
      queryKey: ['invoice', id],
      queryFn: isValidInvoiceId
        ? async () => (await api.getInvoice({ id: Number(id) })).data
        : skipToken,
      // TODO: Remove `recalculateInvoiceTotals` select once backend fixes BI-1 (stale snapshot fields).
      select: recalculateInvoiceTotals,
    })

    const isPending = isValidInvoiceId && isGetInvoicePending

    if (isPending) {
      return <div>Loading...</div>
    }
    if (!invoice) {
      return <div>Invoice not found</div>
    }

    return <WrappedComponent invoice={invoice} />
  }
}

export default withInvoice
