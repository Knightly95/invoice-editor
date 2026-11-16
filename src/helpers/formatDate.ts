import dayjs from 'dayjs'

const formatDate = (date: string | null | undefined): string => {
  if (!date) return 'N/A'
  return dayjs(date).format('DD/MM/YYYY')
}

export default formatDate
