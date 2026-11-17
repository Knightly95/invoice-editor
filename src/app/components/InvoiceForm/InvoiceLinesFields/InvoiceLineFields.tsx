import type { CSSProperties } from 'react'
import Big from 'big.js'

import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import { Control, useWatch } from 'react-hook-form'
import { ProductField } from 'ui/forms/fields/ProductField'
import { NumberInputField } from 'ui/forms/fields/NumberInputField'
import formatAmount from 'helpers/formatAmount'
import { Button } from 'antd'
import { useInvoiceFormContext } from 'app/components/InvoiceForm/InvoiceFormContext'

interface InvoiceLineFieldsProps {
  control: Control<InvoiceFormValues>
  index: number
  isDestroyed: boolean
  onToggleDestroy: () => void
}

const InvoiceLineFields = ({
  control,
  index,
  isDestroyed,
  onToggleDestroy,
}: InvoiceLineFieldsProps) => {
  const { isEdit } = useInvoiceFormContext()
  // useWatch subscribes only to this line's fields — no prop drilling of watch needed
  const { product, quantity } = useWatch({
    control,
    name: `invoice_lines.${index}`,
  })

  const totalPrice =
    product?.unit_price != null && quantity != null
      ? new Big(product.unit_price).times(quantity).toNumber()
      : null

  const totalTax =
    product?.unit_tax != null && quantity != null
      ? new Big(product.unit_tax).times(quantity).toNumber()
      : null

  const cellStyle: CSSProperties = {
    opacity: isDestroyed ? 0.35 : 1,
    transition: 'opacity 0.15s ease',
  }

  return (
    <>
      <td className="p-2 product-column" style={cellStyle}>
        <ProductField
          control={control}
          name={`invoice_lines.${index}.product`}
          ariaLabel={`Product, line ${index + 1}`}
          isEdit={isEdit}
        />
      </td>
      <td className="p-2" style={cellStyle}>
        <NumberInputField
          control={control}
          name={`invoice_lines.${index}.quantity`}
          ariaLabel={`Quantity, line ${index + 1}`}
          isEdit={isEdit}
        />
      </td>
      <td style={cellStyle}>{product?.unit ?? '-'}</td>
      <td style={cellStyle}>
        {product?.unit_price ? formatAmount(product.unit_price) : '-'}
      </td>
      <td style={cellStyle}>
        {product?.vat_rate ? `${product.vat_rate}%` : '-'}
      </td>
      <td style={cellStyle}>
        {product?.unit_tax ? formatAmount(product.unit_tax) : '-'}
      </td>
      <td style={cellStyle}>
        {totalTax != null ? formatAmount(totalTax) : '-'}
      </td>
      <td style={cellStyle}>
        {totalPrice != null ? formatAmount(totalPrice) : '-'}
      </td>
      <td className="p-2">
        {isDestroyed ? (
          <Button onClick={onToggleDestroy} color="primary" variant="outlined">
            Restore
          </Button>
        ) : (
          <Button onClick={onToggleDestroy} color="danger" variant="solid">
            Remove
          </Button>
        )}
      </td>
    </>
  )
}

export default InvoiceLineFields
