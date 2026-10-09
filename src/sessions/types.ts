export type SessionStatus = 'scheduled' | 'completed'

export interface TrainingSession {
  id: string
  title: string
  status: SessionStatus
  // ISO 8601 date-time
  startsAt: string
}

export interface CreateSessionInput {
  title: string
  startsAt: string
}
