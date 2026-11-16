import formatAmount from 'helpers/formatAmount'

// Expected values are derived from Intl.NumberFormat directly so the tests
// stay correct across Node versions without hardcoding locale strings.
const eur = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    value
  )

describe('formatAmount', () => {
  it('formats a number', () => {
    expect(formatAmount(100)).toBe(eur(100))
  })

  it('accepts a string — the API returns amounts as strings', () => {
    expect(formatAmount('22070.0')).toBe(eur(22070))
  })

  it('formats a negative value', () => {
    expect(formatAmount(-42.5)).toBe(eur(-42.5))
  })

  it('formats zero', () => {
    expect(formatAmount(0)).toBe(eur(0))
  })
})
