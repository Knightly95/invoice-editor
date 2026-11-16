import { Control } from 'react-hook-form'

import { CustomerField } from 'ui/forms/fields/CustomerField'
import InvoiceDateFields from './InvoiceDateFields'
import { Invoice } from 'types'
import { InvoiceFormValues } from './schema'
import { useInvoiceFormContext } from './InvoiceFormContext'

interface InvoiceMainDataFieldProps {
  control: Control<InvoiceFormValues>
  invoice: Invoice | null
}

const InvoiceMainDataField = ({
  control,
  invoice,
}: InvoiceMainDataFieldProps) => {
  const { isEdit } = useInvoiceFormContext()
  return (
    <div>
      <h1>{invoice?.id ? `INVOICE-${invoice.id}` : 'New invoice'}</h1>
      <div>
        <CustomerField
          label="Customer"
          control={control}
          name={'customer'}
          isEdit={isEdit}
        />
      </div>
      <div className="mt-4">
        <InvoiceDateFields control={control} />
      </div>
    </div>
  )
}

export default InvoiceMainDataField
