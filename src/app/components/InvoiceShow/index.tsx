import CustomerDetails from './CustomerDetails'
import InvoiceLines from './InvoiceLines'
import InvoiceInfo from './InvoiceInfo'
import withInvoice from 'hocs/WithInvoice'
import { Invoice } from 'types'

interface InvoiceShowProps {
  invoice: Invoice
}

const InvoiceShow = ({ invoice }: InvoiceShowProps) => {
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
      <InvoiceInfo invoice={invoice} />
      <CustomerDetails customer={invoice?.customer} />
      <InvoiceLines invoice={invoice} />
    </div>
  )
}

export default withInvoice(InvoiceShow)
