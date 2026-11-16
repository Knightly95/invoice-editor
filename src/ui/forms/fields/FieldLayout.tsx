import { PropsWithChildren } from 'react'

import { Form } from 'antd'

interface FieldLayoutProps extends PropsWithChildren {
  error?: string
  label?: string
  required?: boolean
  isDirty?: boolean
}

const STYLE = {
  marginBottom: 0,
}

const FieldLayout = ({
  children,
  error,
  label,
  required,
  isDirty,
}: PropsWithChildren<FieldLayoutProps>) => {
  return (
    <Form.Item
      label={label}
      required={required}
      validateStatus={error ? 'error' : undefined}
      help={error}
      style={{
        ...STYLE,
        ...(isDirty && {
          borderLeft: '3px solid #f59e0b',
          paddingLeft: 8,
          borderRadius: 2,
        }),
      }}
    >
      {children}
    </Form.Item>
  )
}

export default FieldLayout
