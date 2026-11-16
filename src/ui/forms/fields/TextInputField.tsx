import { Control, FieldValues, Path, useController } from 'react-hook-form'
import FieldLayout from './FieldLayout'
import { Input } from 'antd'

interface TextInputFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  type?: 'text' | 'email' | 'password'
}

const STYLE = {
  width: '100%',
}

export const TextInputField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  disabled,
  required,
}: TextInputFieldProps<T>) => {
  const { field, fieldState } = useController({ name, control })
  return (
    <FieldLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
    >
      <Input
        value={field.value}
        onChange={field.onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-label={label}
        style={STYLE}
      />
    </FieldLayout>
  )
}
