import { Customer } from 'types'

const getCustomerAddress = (customer?: Customer) => {
  if (!customer) return null
  const cityInfos = [customer.zip_code ?? '', customer.city ?? '']
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
  return [customer.address ?? '', cityInfos]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

export default getCustomerAddress
