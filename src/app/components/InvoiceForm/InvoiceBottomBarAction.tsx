import { Button, Flex } from 'antd'
import FloatingActionButtonContainer from 'ui/FloatingActionButtonContainer/FloatingActionButtonContainer'

interface InvoiceBottomBarActionProps {
  isUpdate?: boolean
  onCancel: () => void
}

const InvoiceBottomBarAction = ({
  isUpdate = false,
  onCancel,
}: InvoiceBottomBarActionProps) => {
  return (
    <FloatingActionButtonContainer>
      <Flex justify="end" gap="1rem">
        <Button type="link" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit">
          {isUpdate ? 'Update invoice' : 'Save invoice'}
        </Button>
      </Flex>
    </FloatingActionButtonContainer>
  )
}

export default InvoiceBottomBarAction
