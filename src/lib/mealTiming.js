// Eating-rhythm helper: for each meal, the typical time it happens and whether
// it's kept on a steady schedule across the week. Regular, predictable eating is
// a core recovery signal, so this surfaces it for the clinician.

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { key: 'lunch',     label: 'Lunch',     icon: '🥗' },
  { key: 'snack',     label: 'Snack',     icon: '🍎' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙' },
]

// Mirrors DEFAULT_MEAL_TIMES in FirebaseDataContext; used when a day has no
// explicit time set for a logged meal.
const DEFAULTS = { breakfast: '08:00', lunch: '13:00', snack: '15:30', dinner: '19:00' }

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function toLabel(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

// A meal "happened" on a day if it has items or a non-skip status.
export function computeMealTiming(mealTimesByDate = {}, mealStatuses = {}, allMealItems = {}, isoDates = [], toleranceMin = 90) {
  const meals = MEALS.map(m => {
    const mins = []
    for (const iso of isoDates) {
      const status = mealStatuses[iso]?.[m.key]
      const items = allMealItems[iso]?.[m.key] || []
      const happened = (status && status !== 'skipped') || items.length > 0
      if (!happened) continue
      const t = mealTimesByDate[iso]?.[m.key] || DEFAULTS[m.key]
      mins.push(toMinutes(t))
    }
    const loggedDays = mins.length
    const spreadMin = loggedDays ? Math.max(...mins) - Math.min(...mins) : 0
    return {
      key: m.key,
      label: m.label,
      icon: m.icon,
      loggedDays,
      typicalTime: loggedDays ? toLabel(median(mins)) : null,
      spreadMin,
      consistent: loggedDays >= 2 && spreadMin <= toleranceMin,
    }
  })

  const evaluated = meals.filter(m => m.loggedDays >= 2)
  return {
    meals,
    evaluatedCount: evaluated.length,
    consistentCount: evaluated.filter(m => m.consistent).length,
  }
}
