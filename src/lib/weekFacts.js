import { getWeekIsoDates } from './insights'
import { computeWeekStats } from './weekStats'
import { computeDistressSummary } from './weekSummary'

function statusesForDates(mealStatuses, dates) {
  return dates.flatMap(date =>
    Object.entries(mealStatuses[date] || {}).map(([mealType, status]) => ({ date, mealType, status }))
  )
}

// Deterministic facts for the assistant to ground its answers in. Never let the
// model compute these itself.
export function buildWeekFacts({ mealStatuses = {}, allMealItems = {}, mealDistress = {} }) {
  const thisWeekDates = getWeekIsoDates(0)
  const lastWeekDates = getWeekIsoDates(-1)
  return {
    thisWeek: {
      ...computeWeekStats(statusesForDates(mealStatuses, thisWeekDates), allMealItems, thisWeekDates),
      distress: computeDistressSummary(mealDistress, thisWeekDates),
    },
    lastWeek: {
      ...computeWeekStats(statusesForDates(mealStatuses, lastWeekDates), allMealItems, lastWeekDates),
      distress: computeDistressSummary(mealDistress, lastWeekDates),
    },
  }
}
