# iMessage Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a quiet AI agent that lives in the parent ↔ clinician iMessage thread, reads meal data from Supabase, and participates — reacting when relevant and proactively messaging at dinner time and before clinician appointments.

**Architecture:** A long-running Node.js ES module (`agent/server.js`) connects to Spectrum's streaming API and iterates over incoming iMessages with `for await`. No Express or webhooks needed — Spectrum handles the connection. Two `setInterval` timers fire proactive messages at the dinner window and before appointments. The React app writes lightweight rows to two new Supabase tables on meal log and appointment actions.

**Tech Stack:** spectrum-ts (already installed), @supabase/supabase-js, @anthropic-ai/sdk, Node.js 18+ (native fetch), dotenv

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `agent/package.json` | create | agent process dependencies + start script |
| `agent/.env.example` | create | env var template |
| `agent/supabaseClient.js` | create | Supabase client with service key |
| `agent/mealSummary.js` | create | format meal_events rows into prompt text |
| `agent/claudeClient.js` | create | Claude API wrapper + all three prompt builders |
| `agent/server.js` | create | Spectrum loop, thread history buffer, timers |
| `src/components/MealLogModal.jsx` | modify | write meal_events row to Supabase on submit |
| `src/pages/ClinicianView.jsx` | modify | add appointment scheduling panel + Supabase write |

---

## Task 1: Create Supabase tables

**Files:** Supabase SQL editor (no local files)

- [ ] **Step 1: Open Supabase dashboard → SQL Editor, run this migration**

```sql
create table if not exists meal_events (
  id uuid primary key default gen_random_uuid(),
  date text not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','snack','dinner')),
  status text not null check (status in ('okay','difficult','refused')),
  food_items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  scheduled_at timestamptz not null,
  clinician_name text not null default 'Clinician',
  patient_name text not null default 'Patient',
  prep_sent boolean not null default false,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Verify tables exist**

In Supabase Table Editor, confirm `meal_events` and `appointments` both appear with the correct columns.

- [ ] **Step 3: Disable RLS on both tables (for hackathon)**

```sql
alter table meal_events disable row level security;
alter table appointments disable row level security;
```

- [ ] **Step 4: Commit a note**

```bash
git add -A
git commit -m "chore: add meal_events and appointments Supabase tables (manual migration)"
```

---

## Task 2: Agent directory scaffold

**Files:**
- Create: `agent/package.json`
- Create: `agent/.env.example`

- [ ] **Step 1: Create `agent/package.json`**

```json
{
  "name": "plate-together-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node --env-file=.env server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.90.0",
    "@supabase/supabase-js": "^2.103.3",
    "spectrum-ts": "^0.4.0"
  }
}
```

- [ ] **Step 2: Create `agent/.env.example`**

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SPECTRUM_PROJECT_ID=
SPECTRUM_PROJECT_SECRET=
SPECTRUM_THREAD_ID=
SPECTRUM_SPACE_TYPE=group
DINNER_WINDOW_HOUR=20
DINNER_WINDOW_MINUTE=30
```

- [ ] **Step 3: Install agent dependencies**

```bash
cd agent && npm install
```

Expected: `node_modules` created, no errors.

- [ ] **Step 4: Copy .env.example to .env and fill in values**

```bash
cp agent/.env.example agent/.env
```

Fill in: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
`SPECTRUM_*` values come after Photon dashboard setup (Task 3).

- [ ] **Step 5: Add agent/.env to .gitignore**

```bash
echo "agent/.env" >> .gitignore
```

- [ ] **Step 6: Commit**

```bash
git add agent/package.json agent/.env.example agent/package-lock.json .gitignore
git commit -m "chore: scaffold agent directory"
```

---

## Task 3: Spectrum setup (Photon dashboard)

**Files:** None — dashboard configuration only.

- [ ] **Step 1: Sign up at app.photon.codes**

Use promo code `HACKPTON2026` to activate Pro.

- [ ] **Step 2: Connect iMessage account**

Follow the iMessage pairing flow in the dashboard.

- [ ] **Step 3: Copy credentials to agent/.env**

From the dashboard, copy:
- Project ID → `SPECTRUM_PROJECT_ID`
- Project Secret → `SPECTRUM_PROJECT_SECRET`

- [ ] **Step 4: Find the thread ID for the parent ↔ clinician iMessage thread**

Send a test message in the thread from the connected iMessage account. In the dashboard or agent logs (after Task 6), the `space.id` will appear. Copy it to `SPECTRUM_THREAD_ID`.

- [ ] **Step 5: Set SPECTRUM_SPACE_TYPE**

If the thread is a 2-person DM, set `SPECTRUM_SPACE_TYPE=dm`. If it's a group chat, set `group`.

---

## Task 4: `agent/supabaseClient.js`

**Files:**
- Create: `agent/supabaseClient.js`

- [ ] **Step 1: Create the file**

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
```

- [ ] **Step 2: Verify env vars are accessible**

```bash
cd agent && node --env-file=.env -e "import('./supabaseClient.js').then(m => console.log('ok', !!m.supabase))"
```

Expected output: `ok true`

- [ ] **Step 3: Commit**

```bash
git add agent/supabaseClient.js
git commit -m "feat(agent): add Supabase client"
```

---

## Task 5: `agent/mealSummary.js`

**Files:**
- Create: `agent/mealSummary.js`

- [ ] **Step 1: Create the file**

```javascript
/**
 * Fetches the last 7 days of meal_events and returns a prompt-ready summary string.
 */
export async function buildWeekSummary(supabase) {
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const { data, error } = await supabase
    .from('meal_events')
    .select('*')
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('meal_type', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) return 'No meals logged in the past 7 days.'

  const byDate = {}
  for (const row of data) {
    if (!byDate[row.date]) byDate[row.date] = []
    byDate[row.date].push(row)
  }

  return Object.entries(byDate).map(([date, rows]) => {
    const meals = rows.map(r => {
      const foods = Array.isArray(r.food_items) && r.food_items.length > 0
        ? ` (${r.food_items.map(f => f.name).join(', ')})`
        : ''
      return `  ${r.meal_type}: ${r.status}${foods}`
    }).join('\n')
    return `${date}:\n${meals}`
  }).join('\n\n')
}

/**
 * Fetches just today's dinner event (if any).
 */
export async function getTodayDinner(supabase) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('meal_events')
    .select('*')
    .eq('date', today)
    .eq('meal_type', 'dinner')
    .maybeSingle()

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Smoke-test against Supabase**

```bash
cd agent && node --env-file=.env -e "
import('./supabaseClient.js').then(async ({ supabase }) => {
  const { buildWeekSummary } = await import('./mealSummary.js')
  const s = await buildWeekSummary(supabase)
  console.log(s)
})
"
```

Expected: Either the summary text or `'No meals logged in the past 7 days.'` (no crash).

- [ ] **Step 3: Commit**

```bash
git add agent/mealSummary.js
git commit -m "feat(agent): add meal summary builder"
```

---

## Task 6: `agent/claudeClient.js`

**Files:**
- Create: `agent/claudeClient.js`

- [ ] **Step 1: Create the file**

```javascript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a quiet, warm support agent embedded in a conversation between a parent and clinician caring for someone in eating disorder recovery. You have access to meal log data from their app. You are NOT a therapist or doctor. You speak briefly, like a thoughtful friend who has been watching — never intrusive, never clinical. You only speak when you have something genuinely worth adding.`

async function callClaude(userContent) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })
  return msg.content[0]?.text?.trim() || ''
}

/**
 * Decide whether to respond to a conversation message and what to say.
 * Returns { shouldRespond: boolean, reply: string | null }
 */
export async function reactiveResponse(threadHistory, weekSummary) {
  const historyText = threadHistory
    .map(m => `${m.sender}: ${m.text}`)
    .join('\n')

  const prompt = `Here is the recent conversation:\n${historyText}\n\nHere is the meal data from their app this week:\n${weekSummary}\n\nShould you add something to this conversation? Reply with YES or NO on the first line, then one sentence explaining why. If YES, add a second paragraph with what you would say (1-2 sentences max, warm and brief).`

  const raw = await callClaude(prompt)
  const lines = raw.split('\n').filter(l => l.trim())
  const decision = lines[0]?.toUpperCase().startsWith('YES')

  if (!decision) return { shouldRespond: false, reply: null }

  const replyLines = lines.slice(2).join(' ').trim()
  return { shouldRespond: true, reply: replyLines || lines[1] || null }
}

/**
 * Generate a gentle proactive message when dinner was skipped or refused.
 */
export async function dinnerWindowMessage(dinnerEvent) {
  const status = dinnerEvent ? `marked as "${dinnerEvent.status}"` : 'not logged yet'
  const prompt = `Dinner tonight was ${status}. Write one gentle, non-alarming message to the parent-clinician thread — offer to share context from the app, don't diagnose or prescribe. One sentence, warm tone.`
  return callClaude(prompt)
}

/**
 * Generate a pre-session summary for the clinician.
 */
export async function appointmentPrepMessage(weekSummary, clinicianName) {
  const prompt = `${clinicianName} has a session starting in 30 minutes. Here is this week's meal data:\n\n${weekSummary}\n\nWrite a brief, warm pre-session summary the clinician can glance at before walking in. 3-4 bullet points max. No medical language, no diagnoses.`
  return callClaude(prompt)
}
```

- [ ] **Step 2: Smoke-test Claude connection**

```bash
cd agent && node --env-file=.env -e "
import('./claudeClient.js').then(async ({ dinnerWindowMessage }) => {
  const msg = await dinnerWindowMessage(null)
  console.log(msg)
})
"
```

Expected: A short warm sentence (no crash, no API key error).

- [ ] **Step 3: Commit**

```bash
git add agent/claudeClient.js
git commit -m "feat(agent): add Claude client with all prompt builders"
```

---

## Task 7: `agent/server.js`

**Files:**
- Create: `agent/server.js`

- [ ] **Step 1: Create the file**

```javascript
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

      for (const appt of data || []) {
        const weekSummary = await buildWeekSummary(supabase)
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
```

- [ ] **Step 2: Start the agent (after Spectrum is configured)**

```bash
cd agent && npm start
```

Expected output:
```
Connecting to Spectrum...
Connected. Listening for messages on thread: <your thread id>
```

If `SPECTRUM_PROJECT_ID` is not yet filled in, you'll see a connection error — that's expected until Task 3 is complete.

- [ ] **Step 3: Send a test message in the iMessage thread and watch the logs**

Expected: `[message] <sender>: <text>` appears, then either `[agent reply] ...` or `[agent] chose not to respond`.

- [ ] **Step 4: Commit**

```bash
git add agent/server.js
git commit -m "feat(agent): add Spectrum message loop with reactive + proactive behaviors"
```

---

## Task 8: Sync meal logs to Supabase from `MealLogModal`

**Files:**
- Modify: `src/components/MealLogModal.jsx`

- [ ] **Step 1: Add Supabase import and date helper at top of file**

After the existing imports, add:

```javascript
import { supabase } from '../lib/supabase'

const DAY_TO_OFFSET = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }

function slotDayToISODate(dayKey) {
  const today = new Date()
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  monday.setDate(monday.getDate() + (DAY_TO_OFFSET[dayKey] ?? 0))
  return monday.toISOString().split('T')[0]
}
```

- [ ] **Step 2: Add the Supabase write inside `handleSubmit`, after `await onSubmit(...)`**

Find `handleSubmit` and replace the try body:

```javascript
  async function handleSubmit() {
    if (!status || !slot?.id || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit({ slotId: slot.id, status, note: note.trim() || null })

      // Sync to meal_events for the iMessage agent
      const date = slotDayToISODate(slot.day)
      const foodItems = foodName ? [{ name: foodName, category: foodCategory || 'familiar' }] : []
      await supabase.from('meal_events').insert({
        date,
        meal_type: slot.meal_type,
        status,
        food_items: foodItems,
      })

      setStatus(null); setNote(''); onClose()
    } catch (err) {
      console.error('Failed to save meal log:', err)
    } finally {
      setIsSubmitting(false)
    }
  }
```

- [ ] **Step 3: Verify in the browser**

Open the app, log a meal with any status. Go to Supabase Table Editor → `meal_events`. Confirm a new row appeared with the correct date, meal_type, status, and food_items.

- [ ] **Step 4: Commit**

```bash
git add src/components/MealLogModal.jsx
git commit -m "feat: sync meal logs to Supabase meal_events for iMessage agent"
```

---

## Task 9: Appointment scheduling in `ClinicianView`

**Files:**
- Modify: `src/pages/ClinicianView.jsx`

- [ ] **Step 1: Add appointment state and handler inside `ClinicianView`**

After the existing state declarations (around line 34), add:

```javascript
  const [apptDateTime, setApptDateTime] = useState('')
  const [apptSaving, setApptSaving] = useState(false)
  const [apptSaved, setApptSaved] = useState(false)

  async function handleScheduleAppointment(e) {
    e.preventDefault()
    if (!apptDateTime || apptSaving) return
    setApptSaving(true)
    try {
      const { error } = await supabase.from('appointments').insert({
        scheduled_at: new Date(apptDateTime).toISOString(),
        clinician_name: 'Clinician',
        patient_name: 'Patient',
      })
      if (error) throw error
      setApptSaved(true)
      setApptDateTime('')
      setTimeout(() => setApptSaved(false), 3000)
    } catch (err) {
      console.error('Failed to schedule appointment:', err)
    } finally {
      setApptSaving(false)
    }
  }
```

- [ ] **Step 2: Add the appointment panel to the JSX**

Inside the `{!loading && !error && (...)}` block, after `<NutritionalTargets />` and before `<NotesPanel .../>`, insert:

```jsx
          <div style={{
            background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb',
            padding: '20px 24px', marginTop: 16,
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
              Schedule Session
            </h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
              The agent will send a prep summary to the iMessage thread 30 minutes before.
            </p>
            <form onSubmit={handleScheduleAppointment} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="datetime-local"
                value={apptDateTime}
                onChange={e => setApptDateTime(e.target.value)}
                required
                style={{
                  border: '1.5px solid #d1d5db', borderRadius: 10, padding: '8px 12px',
                  fontSize: 13, color: '#111827', fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!apptDateTime || apptSaving}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10,
                  border: 'none', background: '#6366f1', color: 'white',
                  cursor: apptDateTime && !apptSaving ? 'pointer' : 'not-allowed',
                  opacity: !apptDateTime || apptSaving ? 0.5 : 1,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {apptSaving ? 'Saving…' : 'Schedule'}
              </button>
              {apptSaved && (
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Scheduled ✓</span>
              )}
            </form>
          </div>
```

- [ ] **Step 3: Verify in the browser**

Open the clinician view. The "Schedule Session" panel should appear. Pick a datetime and submit. Check Supabase `appointments` table for the new row with `prep_sent = false`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ClinicianView.jsx
git commit -m "feat: add appointment scheduling panel to ClinicianView"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Start the agent**

```bash
cd agent && npm start
```

- [ ] **Step 2: Log a refused dinner in the app**

In the parent view, log any dinner slot as "Refused". Check Supabase `meal_events` for the row.

- [ ] **Step 3: Simulate the dinner timer firing**

Temporarily change `DINNER_WINDOW_HOUR` and `DINNER_WINDOW_MINUTE` in `.env` to 2 minutes from now, restart the agent, wait. Expected: the agent sends a message to the iMessage thread.

- [ ] **Step 4: Test reactive behavior**

Send any message in the iMessage thread. Agent logs should show either a reply or "chose not to respond."

- [ ] **Step 5: Test appointment prep**

Schedule an appointment 32 minutes from now via the clinician panel. Wait. Expected: agent sends a prep summary to the thread and `prep_sent` flips to `true` in Supabase.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete iMessage agent integration"
```
