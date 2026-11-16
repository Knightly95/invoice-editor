import { Product } from 'types'

/**
 * Returns a fully-typed Product with sensible defaults.
 * Override only the fields relevant to the test.
 */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    label: 'Test Product',
    vat_rate: '20',
    unit: 'piece',
    unit_price: '100.00',
    unit_price_without_tax: '83.33',
    unit_tax: '16.67',
    ...overrides,
  }
}
