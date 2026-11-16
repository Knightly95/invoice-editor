import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router-dom'
import { Button, Result } from 'antd'

/**
 * Rendered by React Router when any child route throws. React Router's native
 * errorElement mechanism catches the error so we don't need a class component.
 *
 * Declared once on an intermediate pathless route so the Navbar and Layout
 * stay mounted — the operator can navigate away without a full page reload.
 */
export function RouteErrorBoundary(): JSX.Element {
  const error = useRouteError()
  const navigate = useNavigate()

  const subTitle = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle={subTitle}
      extra={
        <Button type="primary" onClick={() => navigate('/invoices')}>
          Back to invoices
        </Button>
      }
    />
  )
}
