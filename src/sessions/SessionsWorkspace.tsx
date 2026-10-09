import { useEffect, useState } from 'react'
import { CreateSessionForm } from './CreateSessionForm'
import { listSessions } from './sessionsClient'
import type { TrainingSession } from './types'

type Filter = 'all' | 'scheduled'
type LoadState = 'loading' | 'error' | 'ready'

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function SessionsWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    listSessions()
      .then((loaded) => {
        if (ignore) return
        setSessions(loaded)
        setLoadState('ready')
      })
      .catch(() => {
        if (!ignore) setLoadState('error')
      })
    return () => {
      ignore = true
    }
  }, [loadAttempt])

  function retry() {
    setLoadState('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  function handleCreated(session: TrainingSession) {
    setSessions((current) => [...current, session])
    if (filter !== 'all' && session.status !== filter) setFilter('all')
    setIsFormOpen(false)
  }

  const visibleSessions =
    filter === 'all' ? sessions : sessions.filter((session) => session.status === filter)

  return (
    <main className="workspace">
      <h1>Training Sessions</h1>

      <div className="toolbar">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          name="status"
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
        >
          <option value="all">All</option>
          <option value="scheduled">Scheduled</option>
        </select>

        {isFormOpen ? null : (
          <button type="button" onClick={() => setIsFormOpen(true)}>
            New Session
          </button>
        )}
      </div>

      {isFormOpen ? (
        <CreateSessionForm onCreated={handleCreated} onCancel={() => setIsFormOpen(false)} />
      ) : null}

      {loadState === 'loading' ? <p role="status">Loading sessions…</p> : null}

      {loadState === 'error' ? (
        <div role="alert" className="load-error">
          <p>Couldn't load sessions. Check your connection and try again.</p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      ) : null}

      {loadState === 'ready' ? (
        visibleSessions.length === 0 ? (
          <p>{filter === 'scheduled' ? 'No scheduled sessions.' : 'No sessions yet.'}</p>
        ) : (
          <ul className="session-list" aria-label="Sessions">
            {visibleSessions.map((session) => (
              <li key={session.id} className="session">
                <span className="session-title">{session.title}</span>
                <span className="session-status">{session.status}</span>
                <time dateTime={session.startsAt}>
                  {dateTimeFormat.format(new Date(session.startsAt))}
                </time>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </main>
  )
}
