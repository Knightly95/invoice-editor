import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
} from 'react-router-dom'
import { App as AntApp, ConfigProvider, Layout } from 'antd'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import reactQueryConfig from 'reactQueryConfig'

import InvoicesList from './components/InvoicesList'
import InvoiceShow from './components/InvoiceShow'
import InvoiceCreate from './components/InvoiceCreate'
import InvoiceEdit from './components/InvoiceEdit'
import { ToastProvider } from './contexts/ToastContext'
import { Navbar } from 'ui/Navbar/Navbar'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import './App.css'

const queryClient = new QueryClient(reactQueryConfig)

function RootLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Navbar />
      <Layout.Content
        style={{ padding: '24px 40px', background: 'var(--surface-bg)' }}
      >
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/invoices/new', Component: InvoiceCreate },
          { path: '/invoices/:id/edit', Component: InvoiceEdit },
          { path: '/invoices/:id', Component: InvoiceShow },
          { path: '/invoices', Component: InvoicesList },
        ],
      },
      { path: '/', element: <Navigate to="/invoices" replace /> },
    ],
  },
])

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          colorLink: '#4f46e5',
          borderRadius: 6,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AntApp>
            <RouterProvider router={router} />
          </AntApp>
        </ToastProvider>
      </QueryClientProvider>
    </ConfigProvider>
  )
}

export default App
