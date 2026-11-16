import { Control, FieldValues, Path, useController } from 'react-hook-form'
import FieldLayout from './FieldLayout'
import { DatePicker } from 'antd'
import { useMemo } from 'react'
import dayjs from 'dayjs'

interface DateInputFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  required?: boolean
  isEdit?: boolean
}

const STYLE = {
  width: '100%',
}

export const DateInputField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  minDate: rawMinDate,
  maxDate: rawMaxDate,
  disabled,
  required,
  isEdit = false,
}: DateInputFieldProps<T>) => {
  const { field, fieldState } = useController({ name, control })
  const minDate = useMemo(() => {
    return rawMinDate ? dayjs(rawMinDate) : undefined
  }, [rawMinDate])
  const maxDate = useMemo(() => {
    return rawMaxDate ? dayjs(rawMaxDate) : undefined
  }, [rawMaxDate])
  const value = useMemo(() => {
    return field.value ? dayjs(field.value) : undefined
  }, [field.value])

  return (
    <FieldLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
      isDirty={isEdit && fieldState.isDirty}
    >
      <DatePicker
        format="DD/MM/YYYY"
        value={value}
        onChange={(date) => {
          field.onChange(date ? date.toDate() : null)
        }}
        placeholder={placeholder}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        style={STYLE}
      />
    </FieldLayout>
  )
}
