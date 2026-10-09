import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Development only: serve /api/* from the MSW mock. `?mock=list-error` makes list
// requests fail for the first 2 seconds, so Retry after that recovers.
async function enableMocking() {
  if (!import.meta.env.DEV) return

  const { http, HttpResponse } = await import('msw')
  const { worker } = await import('./mocks/browser')

  if (new URLSearchParams(window.location.search).get('mock') === 'list-error') {
    const failUntil = Date.now() + 2000
    worker.use(
      http.get('/api/sessions', () => {
        if (Date.now() < failUntil) return new HttpResponse(null, { status: 500 })
      }),
    )
  }

  await worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
