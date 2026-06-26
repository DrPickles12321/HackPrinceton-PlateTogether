import { getWeekIsoDates } from './insights'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const CATEGORIES = ['familiar', 'working_on', 'challenge']
const BASELINE_WEEKS = 4
const MIN_BASELINE_WEEKS_WITH_DATA = 2
const TIMING_SHIFT_THRESHOLD_MIN = 45

function timeToMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function computeWeekMetrics(weekDates, allMealItems, mealStatuses, mealTimesByDate) {
  const statusCountsByMeal = {}
  const categoryCounts = { familiar: 0, working_on: 0, challenge: 0 }
  const mealTimeMinutesByType = { breakfast: [], lunch: [], dinner: [], snack: [] }
  let loggedMealSlots = 0

  for (const mealType of MEAL_TYPES) {
    statusCountsByMeal[mealType] = { skipped: 0, refused: 0, difficult: 0 }
  }

  for (const date of weekDates) {
    const dayMeals = allMealItems[date] || {}
    const dayStatuses = mealStatuses[date] || {}
    const dayTimes = mealTimesByDate[date] || {}
    for (const mealType of MEAL_TYPES) {
      const items = dayMeals[mealType] || []
      const status = dayStatuses[mealType]
      if (status) {
        loggedMealSlots++
        if (status in statusCountsByMeal[mealType]) statusCountsByMeal[mealType][status]++
      }
      for (const item of items) {
        const cat = item.category || 'working_on'
        if (cat in categoryCounts) categoryCounts[cat]++
      }
      const minutes = timeToMinutes(dayTimes[mealType])
      if (minutes != null) mealTimeMinutesByType[mealType].push(minutes)
    }
  }

  const avgMealTime = {}
  for (const mealType of MEAL_TYPES) {
    const arr = mealTimeMinutesByType[mealType]
    avgMealTime[mealType] = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  }

  return { statusCountsByMeal, categoryCounts, avgMealTime, loggedMealSlots }
}

function averageBaseline(weekMetricsList) {
  const withData = weekMetricsList.filter(w => w.loggedMealSlots > 0)
  if (withData.length < MIN_BASELINE_WEEKS_WITH_DATA) return null
  const n = withData.length

  const avgStatusByMeal = {}
  for (const mealType of MEAL_TYPES) {
    const sums = { skipped: 0, refused: 0, difficult: 0 }
    for (const w of withData) {
      const m = w.statusCountsByMeal[mealType]
      sums.skipped += m.skipped
      sums.refused += m.refused
      sums.difficult += m.difficult
    }
    avgStatusByMeal[mealType] = { skipped: sums.skipped / n, refused: sums.refused / n, difficult: sums.difficult / n }
  }

  const avgCategoryCounts = { familiar: 0, working_on: 0, challenge: 0 }
  for (const w of withData) {
    for (const cat of CATEGORIES) avgCategoryCounts[cat] += w.categoryCounts[cat]
  }
  for (const cat of CATEGORIES) avgCategoryCounts[cat] /= n

  const avgMealTime = {}
  for (const mealType of MEAL_TYPES) {
    const times = withData.map(w => w.avgMealTime[mealType]).filter(t => t != null)
    avgMealTime[mealType] = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null
  }

  return { avgStatusByMeal, avgCategoryCounts, avgMealTime, weeksUsed: n }
}

// Compares this week against the patient's own trailing 4-week average and
// returns factual, code-verified deltas — no AI involved in deciding what
// counts as unusual, only (optionally) in phrasing the results afterward.
export function detectWeeklyAnomalies({ allMealItems = {}, mealStatuses = {}, mealTimesByDate = {} }) {
  const thisWeekDates = getWeekIsoDates(0)
  const thisWeek = computeWeekMetrics(thisWeekDates, allMealItems, mealStatuses, mealTimesByDate)
  if (thisWeek.loggedMealSlots === 0) return []

  const baselineWeeks = []
  for (let offset = -1; offset >= -BASELINE_WEEKS; offset--) {
    baselineWeeks.push(computeWeekMetrics(getWeekIsoDates(offset), allMealItems, mealStatuses, mealTimesByDate))
  }
  const baseline = averageBaseline(baselineWeeks)
  if (!baseline) return []

  const anomalies = []

  for (const mealType of MEAL_TYPES) {
    const cur = thisWeek.statusCountsByMeal[mealType]
    const base = baseline.avgStatusByMeal[mealType]
    for (const signal of ['skipped', 'refused', 'difficult']) {
      const currentCount = cur[signal]
      const baselineCount = base[signal]
      const isRise = currentCount >= 2 && currentCount >= baselineCount * 1.5 && (currentCount - baselineCount) >= 1
      if (isRise) {
        anomalies.push({
          signal, mealType,
          current: currentCount,
          baseline: Math.round(baselineCount * 10) / 10,
        })
      }
    }
  }

  for (const cat of CATEGORIES) {
    const cur = thisWeek.categoryCounts[cat]
    const base = baseline.avgCategoryCounts[cat]
    if (base >= 1 && cur === 0) {
      anomalies.push({ signal: 'category_dropoff', category: cat, current: 0, baseline: Math.round(base * 10) / 10 })
    } else if (base < 0.5 && cur >= 3) {
      anomalies.push({ signal: 'category_spike', category: cat, current: cur, baseline: Math.round(base * 10) / 10 })
    }
  }

  for (const mealType of MEAL_TYPES) {
    const cur = thisWeek.avgMealTime[mealType]
    const base = baseline.avgMealTime[mealType]
    if (cur != null && base != null) {
      const diff = cur - base
      if (Math.abs(diff) >= TIMING_SHIFT_THRESHOLD_MIN) {
        anomalies.push({
          signal: 'timing_shift', mealType,
          diffMinutes: Math.round(Math.abs(diff)),
          direction: diff > 0 ? 'later' : 'earlier',
        })
      }
    }
  }

  return anomalies
}

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }
const STATUS_VERB = { skipped: 'skipped', refused: 'refused', difficult: 'marked difficult' }
const CATEGORY_LABEL = { familiar: 'familiar', working_on: 'working-on', challenge: 'challenge' }

export function describeAnomaly(a) {
  switch (a.signal) {
    case 'skipped':
    case 'refused':
    case 'difficult':
      return `${MEAL_LABEL[a.mealType]} was ${STATUS_VERB[a.signal]} ${a.current}x this week, vs a typical ${a.baseline}x over the past month.`
    case 'category_dropoff':
      return `No ${CATEGORY_LABEL[a.category]} foods logged this week, vs a typical ${a.baseline}x over the past month.`
    case 'category_spike':
      return `${CATEGORY_LABEL[a.category]} foods logged ${a.current}x this week, vs a typical ${a.baseline}x over the past month.`
    case 'timing_shift':
      return `${MEAL_LABEL[a.mealType]} was logged about ${a.diffMinutes} minutes ${a.direction} than usual this week.`
    default:
      return ''
  }
}
