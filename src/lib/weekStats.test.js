import { describe, it, expect } from 'vitest'
import { computeWeekStats } from './weekStats'

const dates = ['2026-06-29', '2026-06-30']
const statuses = [
  { date: '2026-06-29', mealType: 'breakfast', status: 'okay' },
  { date: '2026-06-29', mealType: 'lunch', status: 'difficult' },
  { date: '2026-06-30', mealType: 'breakfast', status: 'okay' },
]
const mealItems = {
  '2026-06-29': { lunch: [{ name: 'Pasta', category: 'challenge' }] },
}

describe('computeWeekStats', () => {
  it('counts statuses and success rate', () => {
    const s = computeWeekStats(statuses, mealItems, dates)
    expect(s.total).toBe(3)
    expect(s.okay).toBe(2)
    expect(s.difficult).toBe(1)
    expect(s.successRate).toBe(67) // round(2/3*100)
  })
  it('counts challenge attempts', () => {
    const s = computeWeekStats(statuses, mealItems, dates)
    expect(s.challengeAttempts).toBe(1)
  })
  it('handles an empty week', () => {
    const s = computeWeekStats([], {}, dates)
    expect(s.total).toBe(0)
    expect(s.successRate).toBe(0)
  })
})
