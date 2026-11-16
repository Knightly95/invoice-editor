import { Customer } from 'types'
import { Card, Descriptions } from 'antd'
import getCustomerName from 'helpers/getCustomerName'
import getCustomerAddress from 'helpers/getCustomerAddress'

interface CustomerDetailsProps {
  customer?: Customer | null
}

const CustomerDetails = ({ customer }: CustomerDetailsProps) => {
  if (!customer) {
    return (
      <Card
        variant="borderless"
        style={{
          boxShadow: 'var(--card-shadow)',
          borderRadius: 'var(--card-radius)',
        }}
      >
        <span style={{ color: '#8c8c8c' }}>No customer details available</span>
      </Card>
    )
  }

  return (
    <Card
      title="Customer"
      size="small"
      variant="borderless"
      style={{
        boxShadow: 'var(--card-shadow)',
        borderRadius: 'var(--card-radius)',
      }}
    >
      <Descriptions
        column={2}
        size="small"
        styles={{ label: { color: '#8c8c8c', fontWeight: 500 } }}
      >
        <Descriptions.Item label="Name">
          {getCustomerName(customer) ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Country">
          {customer.country ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Address">
          {getCustomerAddress(customer) ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Zip Code">
          {customer.zip_code ?? '—'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}

export default CustomerDetails
