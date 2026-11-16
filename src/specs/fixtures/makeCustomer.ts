import { Customer } from 'types'

/**
 * Returns a fully-typed Customer with sensible defaults.
 * Override only the fields relevant to the test.
 */
export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    first_name: 'Alice',
    last_name: 'Martin',
    address: '12 rue de la Paix',
    zip_code: '75001',
    city: 'Paris',
    country: 'France',
    country_code: 'FR',
    ...overrides,
  }
}
