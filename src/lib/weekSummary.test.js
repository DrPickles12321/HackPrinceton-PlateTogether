import { describe, it, expect } from 'vitest'
import { daySummaries, longestStreak, weekSummary, localIsoDate, computeDistressSummary } from './weekSummary'

const ISO = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']

describe('daySummaries', () => {
  it('counts statuses per meal and total logged per day', () => {
    const ms = {
      '2026-06-29': { breakfast: 'okay', lunch: 'difficult', dinner: 'okay' },
      '2026-07-01': { snack: 'refused' },
    }
    const s = daySummaries(ms, ISO)
    expect(s[0]).toEqual({ iso: '2026-06-29', counts: { okay: 2, difficult: 1, refused: 0, skipped: 0 }, logged: 3 })
    expect(s[1].logged).toBe(0)
    expect(s[2]).toEqual({ iso: '2026-07-01', counts: { okay: 0, difficult: 0, refused: 1, skipped: 0 }, logged: 1 })
  })

  it('ignores unknown statuses', () => {
    const s = daySummaries({ '2026-06-29': { breakfast: 'bogus' } }, ISO)
    expect(s[0].logged).toBe(0)
  })

  it('handles empty input', () => {
    expect(daySummaries({}, ISO).every(d => d.logged === 0)).toBe(true)
    expect(daySummaries()).toEqual([])
  })
})

describe('longestStreak', () => {
  it('finds the longest consecutive run of logged days', () => {
    const s = daySummaries({
      '2026-06-29': { breakfast: 'okay' },
      '2026-06-30': { lunch: 'okay' },
      '2026-07-01': { dinner: 'difficult' },
      // 07-02 gap
      '2026-07-03': { breakfast: 'okay' },
    }, ISO)
    expect(longestStreak(s)).toBe(3)
  })

  it('is 0 when nothing is logged', () => {
    expect(longestStreak(daySummaries({}, ISO))).toBe(0)
  })

  it('counts a single logged day as 1', () => {
    expect(longestStreak(daySummaries({ '2026-07-02': { lunch: 'okay' } }, ISO))).toBe(1)
  })
})

describe('computeDistressSummary', () => {
  it('averages pre and post across the week, one decimal', () => {
    const mealDistress = {
      '2026-06-29': { breakfast: { pre: 4, post: 2 }, dinner: { pre: 5, post: 3 } },
      '2026-07-01': { lunch: { pre: 3, post: 1 } },
      '2026-07-06': { lunch: { pre: 5, post: 5 } }, // outside the week — ignored
    }
    const s = computeDistressSummary(mealDistress, ISO)
    expect(s.count).toBe(3)
    expect(s.avgPre).toBe(4)
    expect(s.avgPost).toBe(2)
  })

  it('handles partial ratings (pre only / post only)', () => {
    const mealDistress = {
      '2026-06-30': { breakfast: { pre: 3 }, lunch: { post: 2 } },
    }
    const s = computeDistressSummary(mealDistress, ISO)
    expect(s.count).toBe(2)
    expect(s.avgPre).toBe(3)
    expect(s.avgPost).toBe(2)
  })

  it('returns nulls when nothing is rated', () => {
    expect(computeDistressSummary({}, ISO)).toEqual({ count: 0, avgPre: null, avgPost: null })
  })
})

describe('localIsoDate', () => {
  it('formats from local date parts', () => {
    expect(localIsoDate(new Date(2026, 6, 2, 9, 0, 0))).toBe('2026-07-02')
  })

  it('does not shift to the next UTC day in the evening', () => {
    // 11pm local on July 2 — toISOString() would give July 3 in US timezones.
    expect(localIsoDate(new Date(2026, 6, 2, 23, 0, 0))).toBe('2026-07-02')
  })

  it('pads single-digit months and days', () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('weekSummary', () => {
  it('rolls up totals and okay percentage', () => {
    const s = daySummaries({
      '2026-06-29': { breakfast: 'okay', lunch: 'okay', dinner: 'difficult' },
      '2026-06-30': { breakfast: 'okay' },
    }, ISO)
    const w = weekSummary(s)
    expect(w.logged).toBe(4)
    expect(w.okay).toBe(3)
    expect(w.totalSlots).toBe(28)
    expect(w.okayPct).toBe(75)
  })

  it('reports 0% when nothing logged (no divide-by-zero)', () => {
    expect(weekSummary(daySummaries({}, ISO))).toEqual({ logged: 0, okay: 0, totalSlots: 28, okayPct: 0 })
  })
})
