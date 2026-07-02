import { getWeekDates } from './constants'

const STATUSES = new Set(['okay', 'difficult', 'refused', 'skipped'])

// Weekly logged/okay counts for the last `weeks` weeks (oldest first, current
// week last). Pure function of mealStatuses; `base` is injectable for tests.
export function computeWeeklyTrend({ mealStatuses = {}, weeks = 6, base = new Date() } = {}) {
  const out = []
  for (let offset = -(weeks - 1); offset <= 0; offset++) {
    const week = getWeekDates(offset, base)
    const dates = Object.values(week)
    let logged = 0
    let okay = 0
    for (const date of dates) {
      for (const status of Object.values(mealStatuses[date] || {})) {
        if (!STATUSES.has(status)) continue
        logged += 1
        if (status === 'okay') okay += 1
      }
    }
    const startIso = week.mon
    out.push({
      startIso,
      label: new Date(startIso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      logged,
      okay,
      okayPct: logged > 0 ? Math.round((okay / logged) * 100) : 0,
    })
  }
  return out
}
