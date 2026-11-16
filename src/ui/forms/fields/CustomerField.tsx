import { useCallback } from 'react'
import { Control, FieldValues, Path, useController } from 'react-hook-form'
import CustomerAutoComplete from 'ui/CustomerAutoComplete/CustomerAutoComplete'
import { Customer } from 'types'
import FieldLayout from './FieldLayout'

interface CustomerFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  isEdit?: boolean
  onChange?: (customer: Customer | null) => void
}

type CustomerItemWithLabel = Customer & { label?: string }

export const CustomerField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required,
  isEdit = false,
  onChange,
}: CustomerFieldProps<T>) => {
  const { field, fieldState } = useController({ name, control })

  // Strip the `label` property added by InfiniteScrollSelect before writing to
  // RHF form state. `label` is a UI-only concern for Ant Design's Select display;
  // storing it would cause RHF's deepEqual to always find the value different from
  // the default Customer (which has no `label`), breaking dirty detection.
  const handleChange = useCallback(
    (customerItem: CustomerItemWithLabel | null) => {
      if (!customerItem) {
        ;(onChange ?? field.onChange)(null)
        return
      }
      const { label: _label, ...customer } = customerItem
      ;(onChange ?? field.onChange)(customer as Customer)
    },
    [onChange, field.onChange]
  )

  return (
    <FieldLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
      isDirty={isEdit && fieldState.isDirty}
    >
      <CustomerAutoComplete
        value={field.value}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </FieldLayout>
  )
}
