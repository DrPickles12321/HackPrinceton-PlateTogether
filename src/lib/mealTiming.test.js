import { describe, it, expect } from 'vitest'
import { computeMealTiming } from './mealTiming'

const ISO = ['2026-07-01', '2026-07-02', '2026-07-03']

describe('computeMealTiming', () => {
  it('counts a meal as happening when it has items or a non-skip status', () => {
    const items = { '2026-07-01': { breakfast: [{ name: 'Toast' }] } }
    const statuses = { '2026-07-02': { breakfast: 'okay' }, '2026-07-03': { breakfast: 'skipped' } }
    const times = {
      '2026-07-01': { breakfast: '08:00' },
      '2026-07-02': { breakfast: '08:15' },
      '2026-07-03': { breakfast: '11:00' }, // skipped → ignored
    }
    const r = computeMealTiming(times, statuses, items, ISO)
    const b = r.meals.find(m => m.key === 'breakfast')
    expect(b.loggedDays).toBe(2) // day 3 skipped
    expect(b.spreadMin).toBe(15)
    expect(b.consistent).toBe(true)
    expect(b.typicalTime).toMatch(/AM/)
  })

  it('marks a meal inconsistent when times spread beyond tolerance', () => {
    const statuses = {
      '2026-07-01': { dinner: 'okay' },
      '2026-07-02': { dinner: 'okay' },
    }
    const times = {
      '2026-07-01': { dinner: '18:00' },
      '2026-07-02': { dinner: '21:30' }, // 210 min spread > 90
    }
    const r = computeMealTiming(times, statuses, {}, ISO)
    const d = r.meals.find(m => m.key === 'dinner')
    expect(d.spreadMin).toBe(210)
    expect(d.consistent).toBe(false)
  })

  it('falls back to default times when none are set', () => {
    const statuses = { '2026-07-01': { lunch: 'okay' }, '2026-07-02': { lunch: 'okay' } }
    const r = computeMealTiming({}, statuses, {}, ISO)
    const l = r.meals.find(m => m.key === 'lunch')
    expect(l.loggedDays).toBe(2)
    expect(l.spreadMin).toBe(0) // both default 13:00
    expect(l.consistent).toBe(true)
    expect(l.typicalTime).toBe('1:00 PM')
  })

  it('does not evaluate meals logged fewer than 2 days', () => {
    const statuses = { '2026-07-01': { snack: 'okay' } }
    const r = computeMealTiming({}, statuses, {}, ISO)
    const s = r.meals.find(m => m.key === 'snack')
    expect(s.loggedDays).toBe(1)
    expect(s.consistent).toBe(false)
    expect(r.evaluatedCount).toBe(0)
  })

  it('rolls up consistent vs evaluated counts', () => {
    const statuses = {
      '2026-07-01': { breakfast: 'okay', dinner: 'okay' },
      '2026-07-02': { breakfast: 'okay', dinner: 'okay' },
    }
    const times = {
      '2026-07-01': { breakfast: '08:00', dinner: '18:00' },
      '2026-07-02': { breakfast: '08:10', dinner: '22:00' }, // dinner inconsistent
    }
    const r = computeMealTiming(times, statuses, {}, ISO)
    expect(r.evaluatedCount).toBe(2)
    expect(r.consistentCount).toBe(1)
  })

  it('handles no data', () => {
    const r = computeMealTiming({}, {}, {}, ISO)
    expect(r.evaluatedCount).toBe(0)
    expect(r.consistentCount).toBe(0)
    expect(r.meals.every(m => m.loggedDays === 0)).toBe(true)
  })
})
