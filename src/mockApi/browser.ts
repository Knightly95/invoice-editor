import { setupWorker } from 'msw/browser'
import { createHandlers } from './handlers'
import { createLocalStorageStore } from './store'

/**
 * Starts the in-browser mock API (MSW service worker). Data is persisted in
 * localStorage so the demo behaves like a real backend across reloads.
 */
export async function startMockApi(baseUrl: string): Promise<void> {
  const worker = setupWorker(
    ...createHandlers(baseUrl, createLocalStorageStore(), { latencyMs: 250 })
  )
  await worker.start({
    serviceWorker: { url: `${process.env.PUBLIC_URL}/mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}
