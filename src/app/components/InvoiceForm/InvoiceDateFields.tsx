import { Control, useWatch } from 'react-hook-form'
import { Flex } from 'antd'

import { DateInputField } from 'ui/forms/fields/DateInputField'
import { InvoiceFormValues } from './schema'
import { useInvoiceFormContext } from './InvoiceFormContext'

interface InvoiceDateFieldsProps {
  control: Control<InvoiceFormValues>
}

const InvoiceDateFields = ({ control }: InvoiceDateFieldsProps) => {
  const { isEdit } = useInvoiceFormContext()
  const issueDate = useWatch({ control, name: 'issueDate' })

  return (
    <Flex gap="1rem" wrap="wrap">
      <Flex flex="auto">
        <div className="full-width">
          <DateInputField
            control={control}
            name={'issueDate'}
            label={'Issue date'}
            placeholder={'Select an issue date'}
            isEdit={isEdit}
          />
        </div>
      </Flex>
      <Flex flex="auto">
        <div className="full-width">
          <DateInputField
            control={control}
            name={'deadline'}
            label={'Deadline'}
            placeholder={'Select a deadline'}
            minDate={issueDate ?? undefined}
            isEdit={isEdit}
          />
        </div>
      </Flex>
    </Flex>
  )
}

export default InvoiceDateFields
