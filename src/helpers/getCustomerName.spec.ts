import getCustomerName from 'helpers/getCustomerName'
import { makeCustomer } from 'specs/fixtures'

describe('getCustomerName', () => {
  it('returns "FirstName LastName" for a customer with both names', () => {
    expect(
      getCustomerName(
        makeCustomer({ first_name: 'Alice', last_name: 'Martin' })
      )
    ).toBe('Alice Martin')
  })

  it('returns null when called with no argument', () => {
    expect(getCustomerName(undefined)).toBeNull()
  })

  it('returns just the first name when last_name is empty', () => {
    expect(
      getCustomerName(makeCustomer({ first_name: 'Alice', last_name: '' }))
    ).toBe('Alice')
  })

  it('returns just the last name when first_name is empty', () => {
    expect(
      getCustomerName(makeCustomer({ first_name: '', last_name: 'Martin' }))
    ).toBe('Martin')
  })
})
