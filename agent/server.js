import { Spectrum, text } from 'spectrum-ts'
import { imessage } from 'spectrum-ts/providers/imessage'
import { supabase } from './supabaseClient.js'
import { buildWeekSummary, getTodayDinner } from './mealSummary.js'
import { reactiveResponse, dinnerWindowMessage, appointmentPrepMessage } from './claudeClient.js'

const THREAD_ID = process.env.SPECTRUM_THREAD_ID
const SPACE_TYPE = process.env.SPECTRUM_SPACE_TYPE || 'group'
const DINNER_HOUR = parseInt(process.env.DINNER_WINDOW_HOUR || '20', 10)
const DINNER_MINUTE = parseInt(process.env.DINNER_WINDOW_MINUTE || '30', 10)

// In-memory thread history (last 20 messages)
const threadHistory = []
function pushHistory(sender, msgText) {
  threadHistory.push({ sender, text: msgText })
  if (threadHistory.length > 20) threadHistory.shift()
}

async function sendToThread(spectrum, msgText) {
  const space = { id: THREAD_ID, type: SPACE_TYPE }
  await spectrum.send(space, text(msgText))
}

// ── Dinner window timer ────────────────────────────────────────────────────
let dinnerFiredToday = null

function startDinnerTimer(spectrum) {
  setInterval(async () => {
    const now = new Date()
    const todayKey = now.toISOString().split('T')[0]
    if (now.getHours() !== DINNER_HOUR || now.getMinutes() < DINNER_MINUTE) return
    if (dinnerFiredToday === todayKey) return
    dinnerFiredToday = todayKey

    try {
      const dinnerEvent = await getTodayDinner(supabase)
      if (!dinnerEvent || dinnerEvent.status === 'refused') {
        const msg = await dinnerWindowMessage(dinnerEvent)
        await sendToThread(spectrum, msg)
        console.log('[dinner timer] sent:', msg)
      }
    } catch (err) {
      console.error('[dinner timer] error:', err)
    }
  }, 15 * 60 * 1000) // every 15 minutes
}

// ── Appointment prep timer ─────────────────────────────────────────────────
function startAppointmentTimer(spectrum) {
  setInterval(async () => {
    try {
      const now = new Date()
      const soon = new Date(now.getTime() + 35 * 60 * 1000)

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', soon.toISOString())
        .eq('prep_sent', false)

      if (error) throw error

      const weekSummary = await buildWeekSummary(supabase)
      for (const appt of data || []) {
        const msg = await appointmentPrepMessage(weekSummary, appt.clinician_name)
        await sendToThread(spectrum, msg)
        await supabase.from('appointments').update({ prep_sent: true }).eq('id', appt.id)
        console.log('[appt timer] sent prep for:', appt.clinician_name, appt.scheduled_at)
      }
    } catch (err) {
      console.error('[appt timer] error:', err)
    }
  }, 15 * 60 * 1000)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to Spectrum...')
  const spectrum = await Spectrum({
    projectId: process.env.SPECTRUM_PROJECT_ID,
    projectSecret: process.env.SPECTRUM_PROJECT_SECRET,
    providers: [imessage({ local: false })],
  })
  console.log('Connected. Listening for messages on thread:', THREAD_ID)

  startDinnerTimer(spectrum)
  startAppointmentTimer(spectrum)

  for await (const [space, message] of spectrum.messages) {
    // Only handle messages from our configured thread
    if (space.id !== THREAD_ID) continue

    const sender = message.user?.id || 'unknown'
    // Spectrum's message shape: try .text first, then .content[0].text
    const msgText = message.text || message.content?.[0]?.text || ''
    if (!msgText.trim()) {
      console.log('[message] received non-text message, raw:', JSON.stringify(message))
      continue
    }

    pushHistory(sender, msgText)
    console.log(`[message] ${sender}: ${msgText}`)

    try {
      const weekSummary = await buildWeekSummary(supabase)
      const last5 = threadHistory.slice(-5)
      const { shouldRespond, reply } = await reactiveResponse(last5, weekSummary)

      if (shouldRespond && reply) {
        await sendToThread(spectrum, reply)
        pushHistory('agent', reply)
        console.log('[agent reply]', reply)
      } else {
        console.log('[agent] chose not to respond')
      }
    } catch (err) {
      console.error('[message handler] error:', err)
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
