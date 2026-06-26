import { auth } from '../firebase'
import { lookupNutrition } from './nutritionService'
import { describeAnomaly } from './anomalyDetection'

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

export async function generateWeeklyInsights({ parentMealItemsByDate, mealLogs = {}, anomalies = [] }) {
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
  const skipped = typeof mealLogs.skipped === 'number' ? mealLogs.skipped : (mealLogs.filter ? mealLogs.filter(l => l.status === 'skipped').length : 0)

  const anomalyText = anomalies.length
    ? `\nThings that look a little different from this family's usual pattern over the past month:\n${anomalies.map(a => `- ${describeAnomaly(a)}`).join('\n')}\n`
    : ''

  const prompt = `You are a warm, encouraging presence for a family building healthy eating habits together. Look at this week and share 3 brief, uplifting observations — like a supportive friend, not a doctor.

This week (${daysWithFood.length} days):
${daySummaries}

Mood check-ins: ${okay} felt okay, ${difficult} felt hard, ${refused} were refused, ${skipped} were skipped.
${anomalyText}
Write 3 short cheerful observations. Rules:
- Sound like a caring friend, never a doctor or nutritionist
- Zero medical language, zero advice, zero recommendations
- Celebrate effort and small wins — mention specific foods or days when it feels natural
- Each item is one short sentence (under 20 words)
- If meals were skipped or hard, still find something positive to say
- If something above looks different from this family's usual pattern, you may gently note it as one observation — frame it as worth noticing, never as alarming or clinical
- Return ONLY valid JSON, nothing else: [{ "type": "positive"|"tip"|"notice", "icon": "<single emoji>", "text": "..." }]`

  const raw = await callClaude(prompt)
  const parsed = extractJSON(raw)
  return Array.isArray(parsed) ? parsed : null
}

export async function generateClinicianDigest({ mealItemsByDate, mealStatusesByDate = {}, parentNotes = [], anomalies = [] }) {
  const dates = Object.keys(mealItemsByDate).sort()
  const daysWithActivity = dates.filter(d =>
    Object.values(mealItemsByDate[d]).flat().length > 0 ||
    Object.values(mealStatusesByDate[d] || {}).some(s => s === 'skipped')
  )
  if (daysWithActivity.length === 0) return null

  const daySummaries = daysWithActivity.map(date => {
    const day = mealItemsByDate[date]
    const statuses = mealStatusesByDate[date] || {}
    const meals = Object.entries(day)
      .filter(([meal, items]) => items.length > 0 || statuses[meal] === 'skipped')
      .map(([meal, items]) => {
        if (statuses[meal] === 'skipped') return `  ${meal}: [skipped — no food logged]`
        const names = items.map(f => f.name).join(', ')
        const status = statuses[meal] || 'okay'
        return `  ${meal}: ${names} [${status}]`
      }).join('\n')
    return `${date}:\n${meals}`
  }).join('\n\n')

  const notesText = parentNotes.length
    ? parentNotes.filter(n => n?.date && n?.body).map(n => `- ${n.date}: ${n.body}`).join('\n') || '(none this week)'
    : '(none this week)'

  const anomalyText = anomalies.length
    ? anomalies.map(a => `- ${describeAnomaly(a)}`).join('\n')
    : '(nothing notably different from this patient\'s typical pattern over the past month)'

  const prompt = `You are assisting a clinician on a family-based treatment team supporting a patient in eating disorder recovery. Review this patient's meal log for the week and summarize it for a quick clinical scan before a session.

This week's meal log (status in brackets is okay, difficult, refused, or skipped):
${daySummaries}

Parent notes this week:
${notesText}

Changes from this patient's typical pattern, computed from the past month (treat these as verified facts, not your own inference):
${anomalyText}

Write 3-4 short, factual observations. Rules:
- Be neutral and observational, not diagnostic or prescriptive
- Do not suggest treatment changes or next steps — just describe patterns
- Note specific meal types, foods, or days where relevant
- Flag anything in the parent notes worth the clinician's attention
- If the list of changes from typical pattern is non-empty, include at least one observation calling out the most significant one
- Each item is one or two sentences
- Return ONLY valid JSON, nothing else: [{ "type": "pattern"|"improvement"|"watch", "text": "..." }]`

  const raw = await callClaude(prompt)
  const parsed = extractJSON(raw)
  return Array.isArray(parsed) ? parsed : null
}
