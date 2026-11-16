import formatDate from 'helpers/formatDate'

describe('formatDate', () => {
  it('converts a YYYY-MM-DD API string to DD/MM/YYYY', () => {
    expect(formatDate('2025-10-27')).toBe('27/10/2025')
  })

  it('pads single-digit day and month', () => {
    expect(formatDate('2025-04-09')).toBe('09/04/2025')
  })

  it('returns "N/A" for null', () => {
    expect(formatDate(null)).toBe('N/A')
  })

  it('returns "N/A" for undefined', () => {
    expect(formatDate(undefined)).toBe('N/A')
  })
})
