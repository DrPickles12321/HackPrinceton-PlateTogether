import { auth } from '../firebase'
import { lookupNutrition } from './nutritionService'

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL

async function callClaude(prompt) {
  if (!AI_PROXY_URL) throw new Error('AI proxy URL is not configured')

  const user = auth.currentUser
  if (!user) throw new Error('Sign in required')
  const idToken = await user.getIdToken()

  const res = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`AI proxy ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return data?.text?.trim() || ''
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

export async function generateClinicianDigest({ mealItemsByDate, mealStatusesByDate = {}, parentNotes = [] }) {
  const dates = Object.keys(mealItemsByDate).sort()
  const daysWithFood = dates.filter(d =>
    Object.values(mealItemsByDate[d]).flat().length > 0
  )
  if (daysWithFood.length === 0) return null

  const daySummaries = daysWithFood.map(date => {
    const day = mealItemsByDate[date]
    const statuses = mealStatusesByDate[date] || {}
    const meals = Object.entries(day)
      .filter(([, items]) => items.length > 0)
      .map(([meal, items]) => {
        const names = items.map(f => f.name).join(', ')
        const status = statuses[meal] || 'okay'
        return `  ${meal}: ${names} [${status}]`
      }).join('\n')
    return `${date}:\n${meals}`
  }).join('\n\n')

  const notesText = parentNotes.length
    ? parentNotes.map(n => `- ${n.date}: ${n.body}`).join('\n')
    : '(none this week)'

  const prompt = `You are assisting a clinician on a family-based treatment team supporting a patient in eating disorder recovery. Review this patient's meal log for the week and summarize it for a quick clinical scan before a session.

This week's meal log (status in brackets is okay, difficult, or refused):
${daySummaries}

Parent notes this week:
${notesText}

Write 3-4 short, factual observations. Rules:
- Be neutral and observational, not diagnostic or prescriptive
- Do not suggest treatment changes or next steps — just describe patterns
- Note specific meal types, foods, or days where relevant
- Flag anything in the parent notes worth the clinician's attention
- Each item is one or two sentences
- Return ONLY valid JSON, nothing else: [{ "type": "pattern"|"improvement"|"watch", "text": "..." }]`

  const raw = await callClaude(prompt)
  const parsed = extractJSON(raw)
  return Array.isArray(parsed) ? parsed : null
}
