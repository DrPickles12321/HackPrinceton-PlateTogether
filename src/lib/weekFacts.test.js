import { describe, it, expect, vi } from 'vitest'
import { buildWeekFacts } from './weekFacts'

vi.mock('./insights', () => ({
  getWeekIsoDates: (offset) =>
    offset === 0 ? ['2026-06-29', '2026-06-30'] : ['2026-06-22', '2026-06-23'],
}))

describe('buildWeekFacts', () => {
  it('returns this-week and last-week stat blocks', () => {
    const mealStatuses = {
      '2026-06-29': { breakfast: 'okay', lunch: 'difficult' },
      '2026-06-22': { breakfast: 'okay' },
    }
    const facts = buildWeekFacts({ mealStatuses, allMealItems: {} })
    expect(facts.thisWeek.total).toBe(2)
    expect(facts.thisWeek.okay).toBe(1)
    expect(facts.lastWeek.total).toBe(1)
  })
  it('is empty-safe', () => {
    const facts = buildWeekFacts({ mealStatuses: {}, allMealItems: {} })
    expect(facts.thisWeek.total).toBe(0)
  })
})
