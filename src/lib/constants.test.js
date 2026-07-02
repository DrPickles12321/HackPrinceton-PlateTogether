import { describe, it, expect } from 'vitest'
import { getWeekDates, localIsoDate } from './constants'

describe('getWeekDates', () => {
  it('does not shift the week just after local midnight (UTC-offset regression)', () => {
    // Fri Jul 3, 00:30 local. With toISOString() formatting, timezones ahead of
    // UTC (e.g. IST) rendered the whole week one day early (Mon = Jun 28).
    const base = new Date(2026, 6, 3, 0, 30)
    const week = getWeekDates(0, base)
    expect(week.mon).toBe('2026-06-29')
    expect(week.fri).toBe('2026-07-03')
    expect(week.sun).toBe('2026-07-05')
    expect(week.fri).toBe(localIsoDate(base))
  })

  it('offsets by whole weeks', () => {
    const base = new Date(2026, 6, 3, 12, 0)
    expect(getWeekDates(-1, base).mon).toBe('2026-06-22')
    expect(getWeekDates(1, base).mon).toBe('2026-07-06')
  })

  it('treats Sunday as the end of the current week', () => {
    const base = new Date(2026, 6, 5, 10, 0) // Sun Jul 5
    const week = getWeekDates(0, base)
    expect(week.mon).toBe('2026-06-29')
    expect(week.sun).toBe('2026-07-05')
  })
})
