import { useMemo } from 'react'
import { computeInsightsFromMealItems, computeNutritionInsightsFromMealItems } from '../lib/insights'
import { FLAG_CONFIG } from './nutrition/FlagChip'

const MEAL_LABELS = { breakfast: 'breakfasts', lunch: 'lunches', dinner: 'dinners', snack: 'snacks' }
const CATEGORY_LABELS = { familiar: 'Familiar foods', working_on: 'Working-on foods', challenge: 'Challenge foods' }

function Stat({ label, value, subtext, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '1.8px',
        textTransform: 'uppercase', color: 'var(--text-light)',
        marginBottom: 10,
      }}>
        {label}
      </span>
      <div style={{
        width: 20, height: 2, borderRadius: 2,
        background: accent || 'var(--border-mid)',
        marginBottom: 12,
      }} />
      <span className="font-lora" style={{
        fontSize: 32, fontWeight: 400, lineHeight: 1,
        color: 'var(--text-dark)', letterSpacing: '-0.3px',
        display: 'block', marginBottom: 6,
      }}>
        {value}
      </span>
      {subtext && (
        <span style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.4, marginTop: 2 }}>
          {subtext}
        </span>
      )}
    </div>
  )
}

export default function WeeklyInsights({ allMealItems, mealStatuses }) {
  const hasAnyLoggedFood = allMealItems && Object.values(allMealItems).some(
    dayMeals => Object.values(dayMeals).some(
      items => Array.isArray(items) && items.length > 0
    )
  )

  const insights = useMemo(() => {
    return hasAnyLoggedFood
      ? computeInsightsFromMealItems(allMealItems, mealStatuses)
      : { totalLogs: 0, okay: 0, difficult: 0, refused: 0, hardestMealType: null, topRefusedCategory: null }
  }, [allMealItems, mealStatuses, hasAnyLoggedFood])

  const nutritionInsights = useMemo(() => {
    return hasAnyLoggedFood
      ? computeNutritionInsightsFromMealItems(allMealItems)
      : { avgDailyCalories: null, topRecoveryNutrient: null }
  }, [allMealItems, hasAnyLoggedFood])

  const stats = [
    {
      label: 'Meals logged',
      value: insights.totalLogs,
      subtext: 'past 7 days',
      accent: 'var(--border-mid)',
    },
    {
      label: 'Okay',
      value: insights.okay,
      subtext: insights.totalLogs > 0
        ? `${Math.round((insights.okay / insights.totalLogs) * 100)}% of meals`
        : '—',
      accent: 'var(--mint)',
    },
    {
      label: 'Difficult',
      value: insights.difficult,
      subtext: insights.hardestMealType
        ? `Often at ${MEAL_LABELS[insights.hardestMealType.mealType]}`
        : 'None this week',
      accent: insights.difficult > 0 ? 'var(--peach)' : 'var(--border-mid)',
    },
    {
      label: 'Refused',
      value: insights.refused,
      subtext: insights.topRefusedCategory
        ? CATEGORY_LABELS[insights.topRefusedCategory.category].toLowerCase()
        : 'None this week',
      accent: insights.refused > 0 ? 'var(--coral)' : 'var(--border-mid)',
    },
  ]

  if (nutritionInsights.avgDailyCalories !== null) {
    stats.push({
      label: 'Avg daily energy',
      value: `${nutritionInsights.avgDailyCalories} kcal`,
      subtext: 'estimated from logs',
      accent: 'var(--border-mid)',
    })
  }

  if (nutritionInsights.topRecoveryNutrient) {
    const flag = nutritionInsights.topRecoveryNutrient.flag
    stats.push({
      label: 'Top nutrient',
      value: FLAG_CONFIG[flag]?.label || flag,
      subtext: `in ${nutritionInsights.topRecoveryNutrient.count} meal${nutritionInsights.topRecoveryNutrient.count !== 1 ? 's' : ''}`,
      accent: 'var(--mint)',
    })
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '28px 32px 24px',
    }}>
      {insights.totalLogs === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-light)' }}>No meals logged yet this week.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '28px 32px',
        }}>
          {stats.map(s => <Stat key={s.label} {...s} />)}
        </div>
      )}
      <p style={{
        fontSize: 11, color: 'var(--text-light)', letterSpacing: '0.2px',
        marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)',
      }}>
        Descriptive summary only · not a clinical recommendation
      </p>
    </div>
  )
}
