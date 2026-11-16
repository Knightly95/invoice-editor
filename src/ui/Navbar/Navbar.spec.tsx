import { render, screen } from 'specs/testUtils'
import { Navbar } from './Navbar'

describe('Navbar', () => {
  it('renders the brand name and an Invoices navigation link', () => {
    render(<Navbar />)

    expect(screen.getByText('Invoice Editor')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Invoices' })).toBeInTheDocument()
  })
})
