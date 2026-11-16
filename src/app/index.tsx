import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ApiProvider } from '../api'

import 'bootstrap/dist/css/bootstrap.min.css'

/**
 * By default the app runs against an in-browser mock API (MSW) seeded with
 * demo data, so it works out of the box with no backend or token.
 * Set REACT_APP_API_URL (and optionally REACT_APP_API_TOKEN) to point it at a
 * real server implementing `src/api/schema.yml`.
 */
const externalApiUrl = process.env.REACT_APP_API_URL
const apiUrl = externalApiUrl || `${window.location.origin}/api`

async function bootstrap() {
  if (!externalApiUrl) {
    const { startMockApi } = await import('../mockApi/browser')
    await startMockApi(apiUrl)
  }

  const root = createRoot(document.getElementById('root')!)
  root.render(
    <React.StrictMode>
      <ApiProvider url={apiUrl} token={process.env.REACT_APP_API_TOKEN ?? ''}>
        <App />
      </ApiProvider>
    </React.StrictMode>
  )
}

bootstrap()
