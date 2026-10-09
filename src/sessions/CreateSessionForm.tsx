import { useState, type FormEvent } from 'react'
import { createSession } from './sessionsClient'
import type { TrainingSession } from './types'

interface FieldErrors {
  title?: string
  startsAt?: string
}

function validate(title: string, startsAtLocal: string, now: number): FieldErrors {
  const errors: FieldErrors = {}
  const trimmedLength = title.trim().length
  if (trimmedLength < 3 || trimmedLength > 80) {
    errors.title = 'Title must be 3–80 characters.'
  }
  const startsAt = new Date(startsAtLocal).getTime()
  if (startsAtLocal === '' || Number.isNaN(startsAt) || startsAt <= now) {
    errors.startsAt = 'Start must be a future date and time.'
  }
  return errors
}

interface CreateSessionFormProps {
  onCreated: (session: TrainingSession) => void
  onCancel: () => void
}

export function CreateSessionForm({ onCreated, onCancel }: CreateSessionFormProps) {
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const nextErrors = validate(title, startsAt, Date.now())
    setErrors(nextErrors)
    setSubmitError(null)
    if (nextErrors.title || nextErrors.startsAt) return

    setPending(true)
    try {
      const created = await createSession({
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
      })
      onCreated(created)
    } catch {
      setSubmitError("Couldn't create the session. Check your connection and try again.")
      setPending(false)
    }
  }

  return (
    <form className="create-form" onSubmit={handleSubmit} noValidate aria-label="New session">
      <div className="field">
        <label htmlFor="session-title">Title</label>
        <input
          id="session-title"
          name="title"
          type="text"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'session-title-error' : undefined}
        />
        {errors.title ? (
          <p id="session-title-error" className="field-error">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="session-starts-at">Start date and time</label>
        <input
          id="session-starts-at"
          name="startsAt"
          type="datetime-local"
          autoComplete="off"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          aria-invalid={errors.startsAt ? true : undefined}
          aria-describedby={errors.startsAt ? 'session-starts-at-error' : undefined}
        />
        {errors.startsAt ? (
          <p id="session-starts-at-error" className="field-error">
            {errors.startsAt}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="form-error">
          {submitError}
        </p>
      ) : null}

      <div className="form-actions">
        <button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create Session'}
        </button>
        <button type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  )
}
