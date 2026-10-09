import { delay, http, HttpResponse } from 'msw'
import type { CreateSessionInput, TrainingSession } from '../sessions/types'

const seedSessions: TrainingSession[] = [
  { id: 's1', title: 'Onboarding basics', status: 'completed', startsAt: '2020-03-10T09:00:00.000Z' },
  { id: 's2', title: 'React fundamentals', status: 'scheduled', startsAt: '2099-01-15T10:00:00.000Z' },
  { id: 's3', title: 'Accessibility review', status: 'completed', startsAt: '2020-05-20T13:30:00.000Z' },
  { id: 's4', title: 'Testing workshop', status: 'scheduled', startsAt: '2099-02-01T14:00:00.000Z' },
]

let sessions: TrainingSession[] = [...seedSessions]

export function resetSessions() {
  sessions = [...seedSessions]
}

export const handlers = [
  http.get('/api/sessions', async () => {
    await delay()
    return HttpResponse.json(sessions)
  }),

  http.post('/api/sessions', async ({ request }) => {
    const input = (await request.json()) as CreateSessionInput
    await delay()
    const created: TrainingSession = {
      id: crypto.randomUUID(),
      title: input.title,
      startsAt: input.startsAt,
      status: 'scheduled',
    }
    sessions = [...sessions, created]
    return HttpResponse.json(created, { status: 201 })
  }),
]
