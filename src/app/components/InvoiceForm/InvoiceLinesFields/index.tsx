import {
  Control,
  useFieldArray,
  useWatch,
  UseFormSetValue,
} from 'react-hook-form'
import Big from 'big.js'
import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import InvoiceLineFields from './InvoiceLineFields'
import { Button } from 'antd'
import formatAmount from 'helpers/formatAmount'
import './InvoiceLines.css'
import { useInvoiceFormContext } from 'app/components/InvoiceForm/InvoiceFormContext'

interface InvoiceLinesFieldsProps {
  control: Control<InvoiceFormValues>
  setValue: UseFormSetValue<InvoiceFormValues>
}
const InvoiceLinesFields = ({ control, setValue }: InvoiceLinesFieldsProps) => {
  const { isEdit } = useInvoiceFormContext()
  const { fields, remove, append } = useFieldArray({
    control,
    name: 'invoice_lines',
  })

  // useWatch at the array level — re-renders only this component when any line changes,
  // keeping InvoiceLineFields isolated to per-row subscriptions
  const lines = useWatch({ control, name: 'invoice_lines' })

  // Exclude _destroy lines from totals — the user sees them greyed out and
  // they won't be sent to the API as active lines.
  const grandTotal = lines.reduce((sum, line) => {
    if (line._destroy || !line.product?.unit_price || !line.quantity) return sum
    return sum.plus(new Big(line.product.unit_price).times(line.quantity))
  }, new Big(0))

  const grandTax = lines.reduce((sum, line) => {
    if (line._destroy || !line.product?.unit_tax || !line.quantity) return sum
    return sum.plus(new Big(line.product.unit_tax).times(line.quantity))
  }, new Big(0))

  const handleToggleDestroy = (index: number) => {
    const line = lines[index]
    if (!line.id) {
      // New (unsaved) lines are removed immediately from the form array.
      remove(index)
    } else {
      // Existing (saved) lines are flagged so the API receives _destroy: true.
      setValue(`invoice_lines.${index}._destroy`, !line._destroy, {
        shouldDirty: true,
      })
    }
  }

  return (
    <>
      <table className="invoice-lines-table">
        <thead>
          <tr>
            <th className="p-2 product-column">Product</th>
            <th className="p-2">Quantity</th>
            <th className="p-2">Unit</th>
            <th className="p-2">Unit Price</th>
            <th className="p-2">Tax Rate</th>
            <th className="p-2">Unit Tax Price</th>
            <th className="p-2">Total Tax</th>
            <th className="p-2">Total Price</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <tr
              key={field.id}
              style={{
                borderLeft: lines[index]?._destroy
                  ? '3px solid #ef4444'
                  : isEdit && !fields[index]?.id
                    ? '3px solid #f59e0b'
                    : '3px solid transparent',
                transition: 'border-left 0.15s ease',
              }}
            >
              <InvoiceLineFields
                control={control}
                index={index}
                isDestroyed={!!lines[index]?._destroy}
                onToggleDestroy={() => handleToggleDestroy(index)}
              />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="invoice-lines-totals">
            <td colSpan={6} className="p-2 text-end fw-bold">
              Totals
            </td>
            <td className="p-2 fw-bold">{formatAmount(grandTax.toNumber())}</td>
            <td className="p-2 fw-bold">
              {formatAmount(grandTotal.toNumber())}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <Button
        type="primary"
        className="mt-4"
        onClick={() => append({ product: undefined, quantity: 0 })}
      >
        Add Line
      </Button>
    </>
  )
}

export default InvoiceLinesFields
