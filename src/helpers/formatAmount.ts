// Accepts a string or number. For pure display of a single pre-computed value,
// Number() is correct — no arithmetic accumulation means no float precision risk.
// Use big.js before calling this only when the value is the result of arithmetic
// (e.g. price × quantity).
const formatAmount = (value: string | number): string => {
  return Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value))
}

export default formatAmount
