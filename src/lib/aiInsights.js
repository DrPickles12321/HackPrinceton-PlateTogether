import { lookupNutrition } from './nutritionService'

async function callClaude(prompt) {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env — restart the dev server after adding it')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true', // required for direct browser calls; use a backend proxy in production
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.content[0]?.text?.trim() || ''
}

function extractJSON(text) {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array found in response')
  return JSON.parse(match[0])
}

export async function generateWeeklyInsights({ parentMealItemsByDate, mealLogs = {} }) {
  const dates = Object.keys(parentMealItemsByDate).sort()
  const daysWithFood = dates.filter(d =>
    Object.values(parentMealItemsByDate[d]).flat().length > 0
  )
  if (daysWithFood.length === 0) return null

  const daySummaries = daysWithFood.map(date => {
    const day = parentMealItemsByDate[date]
    const meals = Object.entries(day)
      .filter(([, items]) => items.length > 0)
      .map(([meal, items]) => {
        const names = items.map(f => f.name).join(', ')
        const cals = items.reduce((s, f) => s + (lookupNutrition(f.name, f.category).calories || 0), 0)
        return `  ${meal}: ${names} (~${Math.round(cals)} kcal)`
      }).join('\n')
    return `${date}:\n${meals}`
  }).join('\n\n')

  const okay = typeof mealLogs.okay === 'number' ? mealLogs.okay : (mealLogs.filter ? mealLogs.filter(l => l.status === 'okay').length : 0)
  const difficult = typeof mealLogs.difficult === 'number' ? mealLogs.difficult : (mealLogs.filter ? mealLogs.filter(l => l.status === 'difficult').length : 0)
  const refused = typeof mealLogs.refused === 'number' ? mealLogs.refused : (mealLogs.filter ? mealLogs.filter(l => l.status === 'refused').length : 0)

  const prompt = `You are a warm, encouraging presence for a family building healthy eating habits together. Look at this week and share 3 brief, uplifting observations — like a supportive friend, not a doctor.

This week (${daysWithFood.length} days):
${daySummaries}

Mood check-ins: ${okay} felt okay, ${difficult} felt hard, ${refused} were skipped.

Write 3 short cheerful observations. Rules:
- Sound like a caring friend, never a doctor or nutritionist
- Zero medical language, zero advice, zero recommendations
- Celebrate effort and small wins — mention specific foods or days when it feels natural
- Each item is one short sentence (under 20 words)
- If meals were skipped or hard, still find something positive to say
- Return ONLY valid JSON, nothing else: [{ "type": "positive"|"tip"|"notice", "icon": "<single emoji>", "text": "..." }]`

  const raw = await callClaude(prompt)
  const parsed = extractJSON(raw)
  return Array.isArray(parsed) ? parsed : null
}
