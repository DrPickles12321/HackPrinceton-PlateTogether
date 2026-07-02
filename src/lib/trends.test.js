import { describe, it, expect } from 'vitest'
import { computeWeeklyTrend } from './trends'

// Fri Jul 3 2026 — current week is Mon Jun 29 … Sun Jul 5.
const BASE = new Date(2026, 6, 3, 12, 0)

describe('computeWeeklyTrend', () => {
  it('returns one entry per week, oldest first, ending with the current week', () => {
    const trend = computeWeeklyTrend({ mealStatuses: {}, weeks: 3, base: BASE })
    expect(trend).toHaveLength(3)
    expect(trend[0].startIso).toBe('2026-06-15')
    expect(trend[1].startIso).toBe('2026-06-22')
    expect(trend[2].startIso).toBe('2026-06-29')
  })

  it('counts logged and okay meals per week and computes okayPct', () => {
    const mealStatuses = {
      // current week: 2 logged, 1 okay
      '2026-06-29': { breakfast: 'okay', lunch: 'difficult' },
      // previous week: 4 logged, 3 okay
      '2026-06-22': { breakfast: 'okay', lunch: 'okay' },
      '2026-06-25': { dinner: 'okay', snack: 'refused' },
    }
    const trend = computeWeeklyTrend({ mealStatuses, weeks: 2, base: BASE })
    expect(trend[0]).toMatchObject({ startIso: '2026-06-22', logged: 4, okay: 3, okayPct: 75 })
    expect(trend[1]).toMatchObject({ startIso: '2026-06-29', logged: 2, okay: 1, okayPct: 50 })
  })

  it('reports 0% for weeks with nothing logged (no divide-by-zero)', () => {
    const trend = computeWeeklyTrend({ mealStatuses: {}, weeks: 2, base: BASE })
    expect(trend.every(w => w.logged === 0 && w.okayPct === 0)).toBe(true)
  })

  it('labels weeks with a short month + day', () => {
    const trend = computeWeeklyTrend({ mealStatuses: {}, weeks: 1, base: BASE })
    expect(trend[0].label).toBe('Jun 29')
  })

  it('ignores unknown statuses', () => {
    const mealStatuses = { '2026-06-29': { breakfast: 'bogus' } }
    const trend = computeWeeklyTrend({ mealStatuses, weeks: 1, base: BASE })
    expect(trend[0].logged).toBe(0)
  })
})
