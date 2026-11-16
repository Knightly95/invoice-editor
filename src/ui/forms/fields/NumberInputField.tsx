import { Control, FieldValues, Path, useController } from 'react-hook-form'
import FieldLayout from './FieldLayout'
import { InputNumber } from 'antd'

interface NumberInputFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  min?: number
  max?: number
  step?: number
  isEdit?: boolean
  onChange?: (value: number | null) => void
}

const STYLE = {
  width: '100%',
}

export const NumberInputField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  disabled,
  required,
  min,
  max,
  step = 1,
  isEdit = false,
  onChange,
}: NumberInputFieldProps<T>) => {
  const { field, fieldState } = useController({ name, control })

  return (
    <FieldLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
      isDirty={isEdit && fieldState.isDirty}
    >
      <InputNumber
        value={field.value}
        onChange={(newValue) => {
          onChange?.(newValue)
          field.onChange(newValue)
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        style={STYLE}
      />
    </FieldLayout>
  )
}
