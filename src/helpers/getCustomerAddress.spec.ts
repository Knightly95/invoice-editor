import getCustomerAddress from 'helpers/getCustomerAddress'
import { makeCustomer } from 'specs/fixtures'

describe('getCustomerAddress', () => {
  it('returns null when called with no argument', () => {
    expect(getCustomerAddress(undefined)).toBeNull()
  })

  it('formats a fully-populated customer as "address, zip_code city"', () => {
    const customer = makeCustomer({
      address: '12 rue de la Paix',
      zip_code: '75001',
      city: 'Paris',
    })
    expect(getCustomerAddress(customer)).toBe('12 rue de la Paix, 75001 Paris')
  })

  it('omits the address segment when address is empty', () => {
    const customer = makeCustomer({
      address: '',
      zip_code: '75001',
      city: 'Paris',
    })
    // With an empty address the leading ", " is trimmed away.
    expect(getCustomerAddress(customer)).toBe('75001 Paris')
  })

  it('omits the zip_code from the city segment when zip_code is empty', () => {
    const customer = makeCustomer({
      address: '12 rue de la Paix',
      zip_code: '',
      city: 'Paris',
    })
    expect(getCustomerAddress(customer)).toBe('12 rue de la Paix, Paris')
  })

  it('omits the city from the city segment when city is empty', () => {
    const customer = makeCustomer({
      address: '12 rue de la Paix',
      zip_code: '75001',
      city: '',
    })
    expect(getCustomerAddress(customer)).toBe('12 rue de la Paix, 75001')
  })
})
