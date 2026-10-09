import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetSessions } from '../src/mocks/handlers'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetSessions()
})

afterAll(() => server.close())
