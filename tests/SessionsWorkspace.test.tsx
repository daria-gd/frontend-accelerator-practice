import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, test } from 'vitest'
import App from '../src/App'
import { server } from './server'

test('loads sessions and creates a new one that appears at the end of the list', async () => {
  const user = userEvent.setup()
  render(<App />)

  expect(screen.getByRole('status').textContent).toBe('Loading sessions…')

  const list = await screen.findByRole('list', { name: 'Sessions' })
  const seededItems = within(list).getAllByRole('listitem')
  const seededTitles = [
    'Onboarding basics',
    'React fundamentals',
    'Accessibility review',
    'Testing workshop',
  ]
  expect(seededItems).toHaveLength(seededTitles.length)
  seededTitles.forEach((title, index) => {
    expect(within(seededItems[index]).getByText(title)).toBeTruthy()
  })
  expect(within(seededItems[0]).getByText('completed')).toBeTruthy()

  const seededStartsAt = '2020-03-10T09:00:00.000Z'
  const expectedDateText = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(seededStartsAt))
  const startsAt = within(seededItems[0]).getByText(expectedDateText)
  expect(startsAt.getAttribute('datetime')).toBe(seededStartsAt)

  await user.click(screen.getByRole('button', { name: 'New Session' }))
  await user.type(screen.getByLabelText('Title'), '  Intro to testing  ')
  fireEvent.change(screen.getByLabelText('Start date and time'), {
    target: { value: '2099-06-01T10:00' },
  })
  await user.click(screen.getByRole('button', { name: 'Create Session' }))

  const created = await within(list).findByText('Intro to testing')
  // findByText normalizes whitespace, so check the raw text to prove the title was trimmed.
  expect(created.textContent).toBe('Intro to testing')
  const items = within(list).getAllByRole('listitem')
  const lastItem = items[items.length - 1]
  expect(lastItem.contains(created)).toBe(true)
  expect(within(lastItem).getByText('scheduled')).toBeTruthy()
  expect(screen.queryByRole('form', { name: 'New session' })).toBeNull()
})

test('keeps form values and allows resubmitting when creating fails', async () => {
  server.use(
    http.post('/api/sessions', () => new HttpResponse(null, { status: 500 }), { once: true }),
  )
  const user = userEvent.setup()
  render(<App />)
  const list = await screen.findByRole('list', { name: 'Sessions' })

  await user.click(screen.getByRole('button', { name: 'New Session' }))
  const titleInput = screen.getByLabelText<HTMLInputElement>('Title')
  const dateInput = screen.getByLabelText<HTMLInputElement>('Start date and time')
  await user.type(titleInput, 'Retry me')
  fireEvent.change(dateInput, { target: { value: '2099-06-01T10:00' } })
  await user.click(screen.getByRole('button', { name: 'Create Session' }))

  expect((await screen.findByRole('alert')).textContent).toContain("Couldn't create the session")
  expect(titleInput.value).toBe('Retry me')
  expect(dateInput.value).toBe('2099-06-01T10:00')
  expect(within(list).queryByText('Retry me')).toBeNull()

  const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Create Session' })
  expect(submit.disabled).toBe(false)
  await user.click(submit)
  expect(await within(list).findByText('Retry me')).toBeTruthy()
})

test('shows a recoverable error when loading sessions fails', async () => {
  server.use(
    http.get('/api/sessions', () => new HttpResponse(null, { status: 500 }), { once: true }),
  )
  const user = userEvent.setup()
  render(<App />)

  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toContain("Couldn't load sessions")

  await user.click(within(alert).getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('React fundamentals')).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

test('filters sessions by scheduled status and restores all', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('list', { name: 'Sessions' })

  const select = screen.getByLabelText<HTMLSelectElement>('Status')
  expect(Array.from(select.options).map((option) => option.textContent)).toEqual(['All', 'Scheduled'])
  expect(select.value).toBe('all')

  await user.selectOptions(select, 'scheduled')
  expect(screen.queryByText('Onboarding basics')).toBeNull()
  expect(screen.getByText('React fundamentals')).toBeTruthy()

  await user.selectOptions(select, 'all')
  expect(screen.getByText('Onboarding basics')).toBeTruthy()
})
