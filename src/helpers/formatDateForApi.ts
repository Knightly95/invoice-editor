import dayjs from 'dayjs'

// Use dayjs to format in local time — Date.toISOString() converts to UTC and
// causes the date to shift back by one day for users east of UTC (e.g. UTC+1).
const formatDateForApi = (date: Date): string => {
  return dayjs(date).format('YYYY-MM-DD')
}

export default formatDateForApi
