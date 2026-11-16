import { useMemo, useState } from 'react'

import { Customer } from 'types'
import useDebounceState from 'hooks/useDebounceState'
import useGetCustomers from './useGetCustomers'
import InfiniteScrollSelect from 'ui/InfiniteScrollSelect'

interface Props {
  value: Customer | null
  onChange: (Customer: Customer | null) => void
  placeholder?: string
}

const getCustomerLabel = (customer: Customer) => {
  return `${customer.first_name} ${customer.last_name}`
}

type CustomerItem = Customer & {
  label: string
}

const CustomerAutoComplete = ({
  value,
  onChange,
  placeholder = 'Search for a customer',
}: Props) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounceState(search)
  const { customers, isPending, fetchNextPage, hasNextPage } =
    useGetCustomers(debouncedSearch)

  const memoizedValue = useMemo(() => {
    return value ? { ...value, label: getCustomerLabel(value) } : null
  }, [value])

  return (
    <InfiniteScrollSelect<CustomerItem>
      value={memoizedValue}
      onChange={onChange}
      placeholder={placeholder}
      items={customers}
      isPending={isPending}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      onSearch={setSearch}
    />
  )
}

export default CustomerAutoComplete
