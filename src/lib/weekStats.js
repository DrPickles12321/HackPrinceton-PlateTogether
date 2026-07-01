const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }

export function computeWeekStats(weekStatuses, allMealItems, weekDates) {
  const total     = weekStatuses.length
  const okay      = weekStatuses.filter(s => s.status === 'okay').length
  const difficult = weekStatuses.filter(s => s.status === 'difficult').length
  const refused   = weekStatuses.filter(s => s.status === 'refused').length
  const skipped   = weekStatuses.filter(s => s.status === 'skipped').length

  const challengeAttempts = weekStatuses.filter(({ date, mealType }) => {
    const items = (allMealItems[date] || {})[mealType] || []
    return items.some(f => f.category === 'challenge')
  }).length
  const challengeMeals = weekDates.flatMap(date =>
    Object.entries(allMealItems[date] || {}).filter(([, items]) =>
      items.some(f => f.category === 'challenge')
    )
  ).length
  const ringPct = challengeMeals > 0 ? Math.round((challengeAttempts / challengeMeals) * 100) : 0

  const hardByMeal = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }
  const totalByMeal = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }
  for (const { mealType, status } of weekStatuses) {
    totalByMeal[mealType] = (totalByMeal[mealType] || 0) + 1
    if (status === 'difficult' || status === 'refused') {
      hardByMeal[mealType] = (hardByMeal[mealType] || 0) + 1
    }
  }
  let hardestMeal = null, hardestPct = 0
  for (const [mt, count] of Object.entries(hardByMeal)) {
    const t = totalByMeal[mt] || 0
    const pct = t > 0 ? Math.round((count / t) * 100) : 0
    if (pct > hardestPct || (pct === hardestPct && hardestMeal === null)) {
      hardestPct = pct
      hardestMeal = mt
    }
  }
  if (hardestMeal === null) {
    hardestMeal = Object.keys(totalByMeal).find(mt => totalByMeal[mt] > 0) || 'dinner'
  }

  const successRate = total > 0 ? Math.round((okay / total) * 100) : 0
  return { total, okay, difficult, refused, skipped, ringPct, challengeAttempts, challengeSlots: challengeMeals, hardestMeal, hardestMealLabel: MEAL_LABELS[hardestMeal] || 'Dinner', hardestPct, successRate }
}
