import { lookupNutrition } from './nutritionService'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function computeInsightsFromMealItems(allMealItems, mealStatuses = {}) {
  const cutoff = Date.now() - ONE_WEEK_MS
  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

  const recentDates = Object.keys(allMealItems).filter(
    dateStr => new Date(dateStr).getTime() >= cutoff
  )

  if (recentDates.length === 0) {
    return { totalLogs: 0, okay: 0, difficult: 0, refused: 0, hardestMealType: null, topRefusedCategory: null }
  }

  let totalLogs = 0
  let okay = 0, difficult = 0, refused = 0
  const hardCountByMealType = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  const refusedByCategory = { familiar: 0, working_on: 0, challenge: 0 }

  for (const date of recentDates) {
    const dayMeals = allMealItems[date] || {}
    const dayStatuses = mealStatuses[date] || {}
    for (const mealType of MEAL_TYPES) {
      const items = dayMeals[mealType] || []
      if (items.length > 0) {
        totalLogs++
        const status = dayStatuses[mealType] || 'okay'
        if (status === 'okay') okay++
        else if (status === 'difficult') { difficult++; hardCountByMealType[mealType]++ }
        else if (status === 'refused') {
          refused++
          hardCountByMealType[mealType]++
          for (const item of items) {
            const cat = item.category || 'working_on'
            if (cat in refusedByCategory) refusedByCategory[cat]++
          }
        }
      }
    }
  }

  if (totalLogs === 0) {
    return { totalLogs: 0, okay: 0, difficult: 0, refused: 0, hardestMealType: null, topRefusedCategory: null }
  }

  let hardestMealType = null
  let maxHard = 0
  for (const [mealType, count] of Object.entries(hardCountByMealType)) {
    if (count > maxHard) { maxHard = count; hardestMealType = { mealType, count } }
  }

  let topRefusedCategory = null
  let maxCat = 0
  for (const [category, count] of Object.entries(refusedByCategory)) {
    if (count > maxCat) { maxCat = count; topRefusedCategory = { category, count } }
  }

  return { totalLogs, okay, difficult, refused, hardestMealType, topRefusedCategory }
}

export function computeNutritionInsightsFromMealItems(allMealItems) {
  const cutoff = Date.now() - ONE_WEEK_MS
  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

  const recentDates = Object.keys(allMealItems).filter(
    dateStr => new Date(dateStr).getTime() >= cutoff
  )

  if (recentDates.length === 0) return { avgDailyCalories: null, topRecoveryNutrient: null }

  const calsByDate = {}
  const flagCounts = {}

  for (const date of recentDates) {
    const dayMeals = allMealItems[date] || {}
    for (const mealType of MEAL_TYPES) {
      const items = dayMeals[mealType] || []
      for (const item of items) {
        const info = lookupNutrition(item.name, item.category || 'working_on')
        calsByDate[date] = (calsByDate[date] || 0) + info.calories
        for (const flag of (info.an_relevant_flags || [])) {
          flagCounts[flag] = (flagCounts[flag] || 0) + 1
        }
      }
    }
  }

  const days = Object.values(calsByDate)
  const avgDailyCalories = days.length > 0
    ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
    : null

  let topRecoveryNutrient = null
  let maxCount = 0
  for (const [flag, count] of Object.entries(flagCounts)) {
    if (count > maxCount) { maxCount = count; topRecoveryNutrient = { flag, count } }
  }

  return { avgDailyCalories, topRecoveryNutrient }
}
