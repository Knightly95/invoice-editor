import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import LinkButton from './LinkButton'

const setup = (basename: string, disabled = false) => {
  const router = createMemoryRouter(
    [
      {
        path: '/invoices',
        element: (
          <LinkButton to="/invoices/new" disabled={disabled}>
            Create
          </LinkButton>
        ),
      },
      { path: '/invoices/new', element: <p>New invoice page</p> },
    ],
    { basename, initialEntries: [`${basename}/invoices`] }
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('LinkButton', () => {
  it('prefixes the link with the router basename', () => {
    setup('/invoice-editor')

    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute(
      'href',
      '/invoice-editor/invoices/new'
    )
  })

  it('navigates on the client when clicked', async () => {
    const router = setup('/invoice-editor')

    await userEvent.click(screen.getByRole('link', { name: 'Create' }))

    expect(await screen.findByText('New invoice page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/invoice-editor/invoices/new')
  })

  it('renders no link when disabled', () => {
    setup('/invoice-editor', true)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })
})
