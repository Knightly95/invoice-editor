import React, { useState } from 'react'
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  RenderOptions,
  RenderHookOptions,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from 'app/contexts/ToastContext'
import { MemoryRouter } from 'react-router-dom'
import { ApiProvider } from 'api'
import { App as AntApp } from 'antd'
import { serverBaseURL } from './mocks/server'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

/**
 * Returns a { queryClient, Wrapper } pair for tests that need direct cache
 * access — e.g. seeding data before a mutation or verifying invalidation.
 */
export function createTestWrapper(options?: { initialEntries?: string[] }) {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { children: React.ReactNode }): JSX.Element {
    return (
      <ApiProvider url={serverBaseURL} token="">
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AntApp>
              <MemoryRouter initialEntries={options?.initialEntries}>
                {children}
              </MemoryRouter>
            </AntApp>
          </ToastProvider>
        </QueryClientProvider>
      </ApiProvider>
    )
  }
  return { queryClient, Wrapper }
}

// useState ensures the QueryClient is stable for the lifetime of the render
// (i.e. across re-renders within a single test) while being fresh between tests.
function AllTheProviders({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [queryClient] = useState(createTestQueryClient)
  return (
    <ApiProvider url={serverBaseURL} token="">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AntApp>
            <MemoryRouter>{children}</MemoryRouter>
          </AntApp>
        </ToastProvider>
      </QueryClientProvider>
    </ApiProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: AllTheProviders, ...options })

const customRenderHook = <Result, Props>(
  renderFn: (props: Props) => Result,
  options?: RenderHookOptions<Props>
) => {
  const { wrapper = AllTheProviders, ...rest } = options ?? {}
  return rtlRenderHook(renderFn, { wrapper, ...rest })
}

export * from '@testing-library/react'
export { customRender as render, customRenderHook as renderHook }

export { default as userEvent } from '@testing-library/user-event'
