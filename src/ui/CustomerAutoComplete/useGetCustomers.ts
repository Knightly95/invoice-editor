import { useInfiniteQuery } from '@tanstack/react-query'
import { useApi } from 'api'
import getCustomerName from 'helpers/getCustomerName'

const THIRTY_SECONDS = 1000 * 30

const useGetCustomers = (search: string) => {
  const api = useApi()
  const {
    data: customers,
    isPending,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['customers', search],
    queryFn: ({ pageParam = 1 }) =>
      api.getSearchCustomers({
        query: search,
        per_page: 10,
        page: pageParam,
      }),
    select: (data) =>
      data.pages
        .flatMap((page) => page.data.customers)
        .map((customer) => ({
          ...customer,
          label: getCustomerName(customer) ?? '-',
        })),
    initialPageParam: 1,
    getNextPageParam: (currentPageData) => {
      if (
        currentPageData.data.pagination.page <
        currentPageData.data.pagination.total_pages
      ) {
        return currentPageData.data.pagination.page + 1
      }
      return null
    },
    getPreviousPageParam: (currentPageData) => {
      if (currentPageData.data.pagination.page > 1) {
        return currentPageData.data.pagination.page - 1
      }
      return null
    },
    staleTime: THIRTY_SECONDS,
  })

  return {
    customers,
    isPending,
    fetchNextPage,
    hasNextPage,
  }
}

export default useGetCustomers
