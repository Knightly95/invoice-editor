import { useMemo } from 'react'

import { Select } from 'antd'

interface Props<T extends { id: number; label: string }> {
  value: T | null
  onChange: (item: T | null) => void
  placeholder?: string
  /** Accessible name, for when there is no visible label. */
  ariaLabel?: string
  items: T[] | undefined
  isPending: boolean
  fetchNextPage: () => void
  hasNextPage: boolean
  onSearch: (value: string) => void
}

const STYLE = {
  width: '100%',
}

const REMAINING_SCROLL_HEIGHT_PIXELS_TO_FETCH_NEXT_PAGE = 100

const InfiniteScrollSelect = <T extends { id: number; label: string }>({
  value,
  onChange,
  placeholder = 'Search for a item',
  ariaLabel,
  items,
  isPending,
  fetchNextPage,
  hasNextPage,
  onSearch,
}: Props<T>) => {
  const options = useMemo(() => {
    const itemsOptions: {
      value: number
      label: string
      item: T | null
      disabled: boolean
    }[] = (items || []).map((item) => ({
      value: item.id,
      label: item.label,
      item: item,
      disabled: false,
    }))
    if (isPending || hasNextPage) {
      itemsOptions.push({
        value: 0,
        label: 'Loading...',
        item: null,
        disabled: true,
      } as const)
    }
    return itemsOptions
  }, [items, isPending, hasNextPage])

  return (
    <Select
      showSearch
      allowClear
      value={
        value
          ? {
              value: value.id,
              label: value.label,
              item: value,
              disabled: false,
            }
          : undefined
      }
      placeholder={placeholder}
      aria-label={ariaLabel}
      defaultActiveFirstOption={false}
      suffixIcon={null}
      filterOption={false}
      onSearch={onSearch}
      onChange={(_, option) => {
        if (Array.isArray(option)) {
          // We don't have multiple section option enabled
          return
        } else {
          onChange(option?.item ?? null)
        }
      }}
      notFoundContent={<p>No results</p>}
      onPopupScroll={(e) => {
        const target = e.target as HTMLElement
        const isAtBottom =
          target.scrollTop + target.clientHeight >=
          target.scrollHeight -
            REMAINING_SCROLL_HEIGHT_PIXELS_TO_FETCH_NEXT_PAGE
        if (isAtBottom && hasNextPage) {
          fetchNextPage()
        }
      }}
      options={options}
      style={STYLE}
    />
  )
}

export default InfiniteScrollSelect
