import { useState } from 'react'

import { Product } from 'types'
import useDebounceState from 'hooks/useDebounceState'
import useGetProducts from './useGetProducts'
import InfiniteScrollSelect from 'ui/InfiniteScrollSelect'

interface Props {
  value: Product | null
  onChange: (product: Product | null) => void
  placeholder?: string
}

const ProductAutoComplete = ({
  value,
  onChange,
  placeholder = 'Search for a product',
}: Props) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounceState(search)
  const { products, isPending, fetchNextPage, hasNextPage } =
    useGetProducts(debouncedSearch)

  return (
    <InfiniteScrollSelect<Product>
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      items={products}
      isPending={isPending}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      onSearch={setSearch}
    />
  )
}

export default ProductAutoComplete
