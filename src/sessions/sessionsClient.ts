import type { CreateSessionInput, TrainingSession } from './types'

// The only module that knows the sessions API. Swap the URL to point at a real backend.
function sessionsUrl(): URL {
  return new URL('/api/sessions', window.location.origin)
}

function isTrainingSession(value: unknown): value is TrainingSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Record<string, unknown>
  return (
    typeof session.id === 'string' &&
    typeof session.title === 'string' &&
    (session.status === 'scheduled' || session.status === 'completed') &&
    typeof session.startsAt === 'string'
  )
}

export async function listSessions(): Promise<TrainingSession[]> {
  const response = await fetch(sessionsUrl())
  if (!response.ok) throw new Error(`Failed to load sessions (${response.status})`)

  const data: unknown = await response.json()
  if (!Array.isArray(data) || !data.every(isTrainingSession)) {
    throw new Error('Unexpected sessions response')
  }
  return data
}

export async function createSession(input: CreateSessionInput): Promise<TrainingSession> {
  const response = await fetch(sessionsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(`Failed to create session (${response.status})`)

  const data: unknown = await response.json()
  if (!isTrainingSession(data)) throw new Error('Unexpected create response')
  return data
}
