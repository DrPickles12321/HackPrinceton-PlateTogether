// Lightweight week-shape helpers shared by the Week and Insights tabs.
// All pure functions of (mealStatuses, ordered ISO dates) so they're easy to test.

// Re-exported so stats callers can grab everything week-related in one import.
export { localIsoDate } from './constants'

const MEAL_KEYS = ['breakfast', 'lunch', 'snack', 'dinner']
const STATUS_KEYS = ['okay', 'difficult', 'refused', 'skipped']

// Per-day status counts. `isoDates` is a chronological array (Mon…Sun).
export function daySummaries(mealStatuses = {}, isoDates = []) {
  return isoDates.map(iso => {
    const day = mealStatuses[iso] || {}
    const counts = { okay: 0, difficult: 0, refused: 0, skipped: 0 }
    let logged = 0
    for (const mk of MEAL_KEYS) {
      const s = day[mk]
      if (s && counts[s] !== undefined) {
        counts[s] += 1
        logged += 1
      }
    }
    return { iso, counts, logged }
  })
}

// Longest run of consecutive days that had at least one logged meal.
// Positive framing — always the best stretch in the window.
export function longestStreak(summaries = []) {
  let best = 0
  let run = 0
  for (const d of summaries) {
    if (d.logged > 0) {
      run += 1
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
}

// Roll the per-day summaries up into week totals.
export function weekSummary(summaries = []) {
  let logged = 0
  let okay = 0
  for (const d of summaries) {
    logged += d.logged
    okay += d.counts.okay
  }
  const totalSlots = summaries.length * MEAL_KEYS.length
  const okayPct = logged > 0 ? Math.round((okay / logged) * 100) : 0
  return { logged, totalSlots, okay, okayPct }
}

// Week-level distress averages. mealDistress: { [date]: { [meal]: {pre?, post?} } }.
// Averages are computed independently for pre and post (a meal may have only one),
// rounded to one decimal; null when no ratings of that kind exist.
export function computeDistressSummary(mealDistress = {}, isoDates = []) {
  const pres = []
  const posts = []
  let count = 0
  for (const iso of isoDates) {
    for (const d of Object.values(mealDistress[iso] || {})) {
      if (!d || (!d.pre && !d.post)) continue
      count += 1
      if (d.pre) pres.push(d.pre)
      if (d.post) posts.push(d.post)
    }
  }
  const avg = arr => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null
  return { count, avgPre: avg(pres), avgPost: avg(posts) }
}

export { MEAL_KEYS, STATUS_KEYS }
