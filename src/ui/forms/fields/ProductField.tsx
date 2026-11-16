import { Control, FieldValues, Path, useController } from 'react-hook-form'
import ProductAutoComplete from 'ui/ProductAutoComplete/ProductAutoComplete'
import FieldLayout from './FieldLayout'

interface ProductFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  isEdit?: boolean
}

export const ProductField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required,
  isEdit = false,
}: ProductFieldProps<T>) => {
  const { field, fieldState } = useController({ name, control })

  return (
    <FieldLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
      isDirty={isEdit && fieldState.isDirty}
    >
      <ProductAutoComplete
        value={field.value}
        onChange={field.onChange}
        placeholder={placeholder}
      />
    </FieldLayout>
  )
}
