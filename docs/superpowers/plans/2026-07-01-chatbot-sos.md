# Parent Chatbot + SOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a parent-facing focused chatbot (floating bubble → weekly recap + Q&A grounded in real logged data) and a non-urgent SOS the parent sends to their care team, surfaced live on the clinician dashboard with a note-back on acknowledge.

**Architecture:** A floating `ChatWidget` in `ParentView` talks to the existing Cloudflare Worker (new `messages` chat mode → Anthropic). Answers are grounded in deterministic week-facts computed from `mealStatuses`/`allMealItems` (never invented). SOS is a Firebase write (`users/{uid}/sos/{id}`) the linked clinician reads/acknowledges via existing `onValue` listeners. No push/email in v1.

**Tech Stack:** React 18 + Vite, Firebase Realtime DB, Cloudflare Worker (Anthropic `claude-haiku-4-5`), Vitest (added here for unit tests).

Spec: `docs/superpowers/specs/2026-07-01-chatbot-sos-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.js` (new) | Vitest config, node env |
| `src/lib/weekStats.js` (new) | `computeWeekStats` extracted from `StatsView` (shared, pure) |
| `src/pages/StatsView.jsx` (modify) | import `computeWeekStats` from `weekStats` |
| `src/lib/weekStats.test.js` (new) | unit tests for `computeWeekStats` |
| `src/lib/weekFacts.js` (new) | `buildWeekFacts()` → this-week + last-week facts object |
| `src/lib/weekFacts.test.js` (new) | unit tests for `buildWeekFacts` |
| `src/lib/chatService.js` (new) | `buildSystemPrompt()` + `sendChat()` (Worker call) |
| `src/lib/chatService.test.js` (new) | unit tests for `buildSystemPrompt` |
| `worker/src/index.js` (modify) | new `{ system, messages }` chat branch |
| `src/contexts/FirebaseDataContext.jsx` (modify) | `sendSos`, `acknowledgeSos`, `sos` + `patientSos` listeners, `patientsWithOpenSos` |
| `src/components/ChatWidget.jsx` (new) | floating bubble + chat panel + SOS button |
| `src/pages/ParentView.jsx` (modify) | render `<ChatWidget/>` |
| `src/components/SosAlert.jsx` (new) | clinician-side alert card + acknowledge/note-back |
| `src/pages/ClinicianView.jsx` (modify) | patient-list SOS badge + `<SosAlert/>` |
| `database.rules.json` (modify) | `sos` node rules |

---

## Task 1: Add Vitest

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json` (scripts + devDependency)
- Create: `src/lib/smoke.test.js`

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest`
Expected: adds `vitest` to devDependencies, no errors.

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Write a smoke test**

`src/lib/smoke.test.js`:
```js
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS — 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/lib/smoke.test.js
git commit -m "test: add vitest for unit tests"
```

---

## Task 2: Extract `computeWeekStats` into a shared module

`computeWeekStats` currently lives (unexported) in `src/pages/StatsView.jsx`. Move it to `src/lib/weekStats.js` so both StatsView and the new week-facts builder share one source of truth.

**Files:**
- Create: `src/lib/weekStats.js`
- Create: `src/lib/weekStats.test.js`
- Modify: `src/pages/StatsView.jsx`

- [ ] **Step 1: Write the failing test**

`src/lib/weekStats.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { computeWeekStats } from './weekStats'

const dates = ['2026-06-29', '2026-06-30']
const statuses = [
  { date: '2026-06-29', mealType: 'breakfast', status: 'okay' },
  { date: '2026-06-29', mealType: 'lunch', status: 'difficult' },
  { date: '2026-06-30', mealType: 'breakfast', status: 'okay' },
]
const mealItems = {
  '2026-06-29': { lunch: [{ name: 'Pasta', category: 'challenge' }] },
}

describe('computeWeekStats', () => {
  it('counts statuses and success rate', () => {
    const s = computeWeekStats(statuses, mealItems, dates)
    expect(s.total).toBe(3)
    expect(s.okay).toBe(2)
    expect(s.difficult).toBe(1)
    expect(s.successRate).toBe(67) // round(2/3*100)
  })
  it('counts challenge attempts', () => {
    const s = computeWeekStats(statuses, mealItems, dates)
    expect(s.challengeAttempts).toBe(1)
  })
  it('handles an empty week', () => {
    const s = computeWeekStats([], {}, dates)
    expect(s.total).toBe(0)
    expect(s.successRate).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- weekStats`
Expected: FAIL — cannot import `./weekStats`.

- [ ] **Step 3: Create `src/lib/weekStats.js`**

Copy the function body verbatim from `StatsView.jsx` and export it:
```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- weekStats`
Expected: PASS — 3 passed.

- [ ] **Step 5: Update `StatsView.jsx` to import it**

In `src/pages/StatsView.jsx`: delete the local `computeWeekStats` function definition and its `MEAL_LABELS` const if now unused elsewhere (check: `MEAL_LABELS` is also used in the hardest-meal card JSX — keep that one). Add at top:
```js
import { computeWeekStats } from '../lib/weekStats'
```
Verify no other reference to a local `computeWeekStats` remains.

- [ ] **Step 6: Build to verify nothing broke**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/weekStats.js src/lib/weekStats.test.js src/pages/StatsView.jsx
git commit -m "refactor: extract computeWeekStats into src/lib/weekStats.js"
```

---

## Task 3: `buildWeekFacts` — the grounding facts

**Files:**
- Create: `src/lib/weekFacts.js`
- Create: `src/lib/weekFacts.test.js`

- [ ] **Step 1: Write the failing test**

`src/lib/weekFacts.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { buildWeekFacts } from './weekFacts'

vi.mock('./insights', () => ({
  getWeekIsoDates: (offset) =>
    offset === 0 ? ['2026-06-29', '2026-06-30'] : ['2026-06-22', '2026-06-23'],
}))

describe('buildWeekFacts', () => {
  it('returns this-week and last-week stat blocks', () => {
    const mealStatuses = {
      '2026-06-29': { breakfast: 'okay', lunch: 'difficult' },
      '2026-06-22': { breakfast: 'okay' },
    }
    const facts = buildWeekFacts({ mealStatuses, allMealItems: {} })
    expect(facts.thisWeek.total).toBe(2)
    expect(facts.thisWeek.okay).toBe(1)
    expect(facts.lastWeek.total).toBe(1)
  })
  it('is empty-safe', () => {
    const facts = buildWeekFacts({ mealStatuses: {}, allMealItems: {} })
    expect(facts.thisWeek.total).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- weekFacts`
Expected: FAIL — cannot import `./weekFacts`.

- [ ] **Step 3: Create `src/lib/weekFacts.js`**

```js
import { getWeekIsoDates } from './insights'
import { computeWeekStats } from './weekStats'

function statusesForDates(mealStatuses, dates) {
  return dates.flatMap(date =>
    Object.entries(mealStatuses[date] || {}).map(([mealType, status]) => ({ date, mealType, status }))
  )
}

// Deterministic facts for the assistant to ground its answers in. Never let the
// model compute these itself.
export function buildWeekFacts({ mealStatuses = {}, allMealItems = {} }) {
  const thisWeekDates = getWeekIsoDates(0)
  const lastWeekDates = getWeekIsoDates(-1)
  return {
    thisWeek: computeWeekStats(statusesForDates(mealStatuses, thisWeekDates), allMealItems, thisWeekDates),
    lastWeek: computeWeekStats(statusesForDates(mealStatuses, lastWeekDates), allMealItems, lastWeekDates),
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- weekFacts`
Expected: PASS — 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/weekFacts.js src/lib/weekFacts.test.js
git commit -m "feat: buildWeekFacts grounding facts for the assistant"
```

---

## Task 4: `chatService` — system prompt + Worker call

**Files:**
- Create: `src/lib/chatService.js`
- Create: `src/lib/chatService.test.js`

- [ ] **Step 1: Write the failing test**

`src/lib/chatService.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './chatService'

describe('buildSystemPrompt', () => {
  const facts = { thisWeek: { total: 3, okay: 2 }, lastWeek: { total: 0 } }
  const p = buildSystemPrompt(facts)

  it('embeds the facts JSON', () => {
    expect(p).toContain('"total":3')
  })
  it('forbids medical/nutrition advice', () => {
    expect(p.toLowerCase()).toContain('not able to give medical or nutrition advice')
  })
  it('includes crisis guidance', () => {
    expect(p).toContain('988')
  })
  it('tells the model to only use the provided facts for numbers', () => {
    expect(p.toLowerCase()).toContain('only use these facts')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- chatService`
Expected: FAIL — cannot import `./chatService`.

- [ ] **Step 3: Create `src/lib/chatService.js`**

```js
import { auth } from '../firebase'

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL

export function buildSystemPrompt(weekFacts) {
  return `You are a warm, brief, encouraging assistant inside "Plate Together", an app a parent uses to support a child in eating-disorder recovery. You are a caring friend, NOT a doctor, therapist, or nutritionist.

This family's REAL logged facts for this week and last week (JSON):
${JSON.stringify(weekFacts)}

Rules:
- For ANY number or specific claim about their week, only use these facts. Never estimate, count, or invent. If something isn't in the facts, say you don't have that info.
- You may: give a warm recap of the week, answer questions about their own logged data, and — if the parent sounds like they're struggling — gently offer the in-app SOS ("Would you like me to let your care team know you could use some support?").
- You are not able to give medical or nutrition advice, calorie/weight targets, meal plans, or diagnoses. If asked, say: "I'm not able to give medical or nutrition advice — your care team is the right person for that. Want me to flag it for them?"
- Never discuss calories or weight. Never claim to be a clinician.
- If a message suggests self-harm or danger, respond with crisis resources — call or text 988 (Suicide & Crisis Lifeline), or 911 for emergencies — and offer the SOS. You are not a substitute for emergency help.
- Keep replies to 1-3 short sentences. Warm, plain language, no clinical jargon.`
}

export async function sendChat(messages, weekFacts) {
  if (!PROXY_URL) throw new Error('Assistant is not configured')
  const user = auth.currentUser
  if (!user) throw new Error('Sign in required')
  const idToken = await user.getIdToken()
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ system: buildSystemPrompt(weekFacts), messages }),
  })
  if (!res.ok) throw new Error(`Assistant error ${res.status}`)
  const data = await res.json()
  return (data?.text || '').trim()
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- chatService`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatService.js src/lib/chatService.test.js
git commit -m "feat: chatService system prompt + Worker chat call"
```

---

## Task 5: Worker chat mode

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Add the chat branch**

In `worker/src/index.js`, after the body is parsed and BEFORE the `body?.query` branch, insert:
```js
    // Chat mode: { system?: string, messages: [{ role, content }] }
    if (Array.isArray(body?.messages)) {
      const messages = body.messages
      if (messages.length === 0 || messages.length > 20) {
        return json({ error: 'messages must be 1-20 items' }, 400)
      }
      for (const m of messages) {
        if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
          return json({ error: 'invalid message' }, 400)
        }
        if (m.content.length > 4000) return json({ error: 'message too long' }, 400)
      }
      const system = typeof body.system === 'string' ? body.system.slice(0, 8000) : undefined
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system,
          messages,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        return json({ error: `Anthropic API ${res.status}: ${errText}` }, 502)
      }
      const data = await res.json()
      const text = data.content?.[0]?.text
      return json({ text: typeof text === 'string' ? text.trim() : '' })
    }
```

- [ ] **Step 2: Deploy the Worker**

Run: `cd worker && npx wrangler deploy`
Expected: `Deployed platetogether-ai-proxy` with a new Version ID.

- [ ] **Step 3: Smoke-test auth rejection (proves the route is live)**

Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://platetogether-ai-proxy.dylanmwen.workers.dev -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hi"}]}'`
Expected: `401` (no token → rejected before the branch; confirms the worker is live). Full-path verification happens in Task 9 via the signed-in preview.

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(worker): add chat messages mode"
```

---

## Task 6: SOS data layer in FirebaseDataContext

**Files:**
- Modify: `src/contexts/FirebaseDataContext.jsx`

- [ ] **Step 1: Add parent-side SOS state + listener**

Near the other `useState` declarations add:
```js
  const [mySos, setMySos] = useState([])            // parent's own SOS records
```
In the parent-scoped `useEffect` that sets up `onValue` listeners on `${base}/…` (where `base = users/${uid}`), add:
```js
    unsubs.push(onValue(ref(db, `${base}/sos`), snap => {
      const val = snap.val() || {}
      setMySos(Object.entries(val).map(([id, v]) => ({ id, ...v })))
    }))
```

- [ ] **Step 2: Add clinician-side SOS listeners + open-set**

Add state:
```js
  const [patientSos, setPatientSos] = useState([])          // viewed patient's SOS
  const [patientsWithOpenSos, setPatientsWithOpenSos] = useState({})  // { uid: true }
```
In the `viewingPatientUid` effect (the block reading `users/${viewingPatientUid}/…`), add:
```js
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/sos`), snap => {
      const val = snap.val() || {}
      setPatientSos(Object.entries(val).map(([id, v]) => ({ id, ...v })))
    }))
```
Add a separate effect that watches every linked patient for an open SOS (for the list badge):
```js
  useEffect(() => {
    if (!patients.length) { setPatientsWithOpenSos({}); return }
    const unsubs = patients.map(p =>
      onValue(ref(db, `users/${p.uid}/sos`), snap => {
        const val = snap.val() || {}
        const hasOpen = Object.values(val).some(s => s.status === 'open')
        setPatientsWithOpenSos(prev => ({ ...prev, [p.uid]: hasOpen }))
      })
    )
    return () => unsubs.forEach(u => u())
  }, [patients])
```

- [ ] **Step 3: Add the write functions**

```js
  function sendSos({ note = '' }) {
    if (!uid) return null
    const id = crypto.randomUUID()
    const record = { createdAt: new Date().toISOString(), note: String(note).slice(0, 500), status: 'open' }
    set(ref(db, `users/${uid}/sos/${id}`), record)
    return { id, ...record }
  }

  function acknowledgeSos(sosId, responseText) {
    if (!viewingPatientUid) return
    update(ref(db, `users/${viewingPatientUid}/sos/${sosId}`), {
      status: 'acknowledged',
      response: { body: String(responseText || '').slice(0, 500), at: new Date().toISOString() },
    })
  }
```

- [ ] **Step 4: Expose them in the context value**

Add to the provider `value={{ … }}`:
```js
      mySos,
      sendSos,
      patientSos,
      patientsWithOpenSos,
      acknowledgeSos,
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/FirebaseDataContext.jsx
git commit -m "feat: SOS data layer (send, listen, acknowledge)"
```

---

## Task 7: Database rules for `sos`

**Files:**
- Modify: `database.rules.json`

- [ ] **Step 1: Add the `sos` rule**

Inside `rules → users → $uid`, alongside `foodItems`, `parentNotes`, etc., add:
```json
"sos": {
  ".read": "auth != null && (auth.uid === $uid || root.child('users/' + auth.uid + '/patients/' + $uid).exists())",
  ".write": "auth != null && (auth.uid === $uid || root.child('users/' + auth.uid + '/patients/' + $uid).exists())"
}
```
(Parent reads/writes their own; a clinician who has this patient linked can read and write status/response.)

- [ ] **Step 2: Deploy the rules**

Run: `firebase deploy --only database`
Expected: `✔ Deploy complete!` (rules compiled OK). **This is required — without it SOS writes/reads are denied.**

- [ ] **Step 3: Commit**

```bash
git add database.rules.json
git commit -m "feat: database rules for sos node"
```

---

## Task 8: `ChatWidget` (parent) — bubble, panel, chat, SOS

**Files:**
- Create: `src/components/ChatWidget.jsx`
- Modify: `src/pages/ParentView.jsx`

- [ ] **Step 1: Create `src/components/ChatWidget.jsx`**

```jsx
import { useState, useRef, useEffect, useMemo } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { buildWeekFacts } from '../lib/weekFacts'
import { sendChat } from '../lib/chatService'

const GREETING = { role: 'assistant', content: 'Hi! I can recap how this week went or answer questions about your logs. Want a recap?' }

export default function ChatWidget() {
  // ChatWidget renders as a sibling of <Outlet> (not inside it), so it reads
  // data straight from the context provider, not useOutletContext.
  const { mealStatuses = {}, allMealItems = {}, sendSos, mySos = [] } = useFirebaseData()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSos, setShowSos] = useState(false)
  const [sosNote, setSosNote] = useState('')
  const [sosSent, setSosSent] = useState(false)
  const scrollRef = useRef(null)

  const weekFacts = useMemo(() => buildWeekFacts({ mealStatuses, allMealItems }), [mealStatuses, allMealItems])

  // Unread dot when a care-team response arrived and the panel is closed.
  const latestResponseAt = useMemo(() => {
    const withResp = mySos.filter(s => s.response?.at).map(s => s.response.at).sort()
    return withResp[withResp.length - 1] || null
  }, [mySos])
  const [seenResponseAt, setSeenResponseAt] = useState(null)
  const hasUnread = latestResponseAt && latestResponseAt !== seenResponseAt && !open

  useEffect(() => { if (open && latestResponseAt) setSeenResponseAt(latestResponseAt) }, [open, latestResponseAt])
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const reply = await sendChat(next.filter(m => m.role !== 'assistant' || m !== GREETING).slice(-12), weekFacts)
      setMessages(m => [...m, { role: 'assistant', content: reply || "Sorry, I didn't catch that." }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "I couldn't reach the assistant just now — try again in a moment." }])
    } finally {
      setBusy(false)
    }
  }

  function confirmSos() {
    sendSos({ note: sosNote })
    setSosSent(true)
    setSosNote('')
    setMessages(m => [...m, { role: 'assistant', content: "I've let your care team know. They'll follow up with you here. 💛" }])
    setTimeout(() => { setShowSos(false); setSosSent(false) }, 1500)
  }

  const careResponses = mySos.filter(s => s.response?.body)

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open assistant"
        style={{
          position: 'fixed', right: 18, bottom: 'calc(18px + env(safe-area-inset-bottom))', zIndex: 45,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
          color: 'white', fontSize: 24, boxShadow: '0 6px 18px rgba(184,85,53,0.4)',
        }}
      >
        {open ? '×' : '💬'}
        {hasUnread && <span style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: '50%', background: '#d63f3f', border: '2px solid white' }} />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', right: 18, bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 45,
          width: 'min(360px, calc(100vw - 36px))', height: 'min(520px, calc(100dvh - 130px))',
          background: 'white', borderRadius: 18, border: '1.5px solid var(--border)',
          boxShadow: '0 12px 40px rgba(39,23,6,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: "'Outfit', sans-serif",
        }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)', color: 'white', fontWeight: 600, fontSize: 14 }}>
            Your assistant
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {careResponses.map(s => (
              <div key={s.id} style={{ background: 'var(--mint-light)', border: '1px solid var(--mint-mid)', borderRadius: 12, padding: '9px 12px', fontSize: 13, color: 'var(--text-dark)' }}>
                💛 Your care team: {s.response.body}
              </div>
            ))}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%', padding: '9px 12px', borderRadius: 13, fontSize: 13, lineHeight: 1.5,
                background: m.role === 'user' ? 'var(--coral-light)' : 'var(--surface-warm)',
                color: 'var(--text-dark)',
              }}>{m.content}</div>
            ))}
            {busy && <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-light)' }}>typing…</div>}
          </div>

          {showSos ? (
            <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
              {sosSent ? (
                <p style={{ fontSize: 13, color: 'var(--mint)', textAlign: 'center' }}>Sent to your care team 💛</p>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>Let your care team know?</p>
                  <div style={{ background: '#fdf1ee', border: '1px solid #f0c4b4', color: 'var(--coral)', fontSize: 11, borderRadius: 8, padding: '7px 9px', marginBottom: 8 }}>
                    Not for emergencies. If you're in crisis, call 988 or 911.
                  </div>
                  <textarea value={sosNote} onChange={e => setSosNote(e.target.value)} placeholder="Add a note (optional)…" rows={2}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: 8, fontSize: 13, fontFamily: "'Outfit', sans-serif", resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowSos(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--text-mid)', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                    <button onClick={confirmSos} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Send</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowSos(true)} aria-label="Send SOS to care team" title="I need support"
                style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: '1.5px solid #f0997b', background: 'white', color: 'var(--coral)', fontSize: 16, cursor: 'pointer' }}>🆘</button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about your week…"
                style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 12, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: "'Outfit', sans-serif", background: 'var(--surface-warm)' }} />
              <button onClick={send} disabled={busy} aria-label="Send"
                style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)', color: 'white', fontSize: 16, cursor: 'pointer' }}>↑</button>
            </div>
          )}
          <p style={{ fontSize: 10, color: 'var(--text-light)', textAlign: 'center', padding: '0 10px 8px' }}>
            Not medical advice. In a crisis, call 988 or 911.
          </p>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Render it in `ParentView.jsx`**

In `src/pages/ParentView.jsx`, import and render `<ChatWidget/>` as a sibling of the Outlet wrapper (inside the returned fragment, after the content div and the `MobileTabBar`):
```jsx
import ChatWidget from '../components/ChatWidget'
```
```jsx
      {isMobile && <MobileTabBar />}
      <ChatWidget />
    </>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChatWidget.jsx src/pages/ParentView.jsx
git commit -m "feat: parent ChatWidget (bubble, chat, SOS)"
```

---

## Task 9: Clinician SOS surfacing

**Files:**
- Create: `src/components/SosAlert.jsx`
- Modify: `src/pages/ClinicianView.jsx`

- [ ] **Step 1: Create `src/components/SosAlert.jsx`**

```jsx
import { useState } from 'react'

function fmt(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SosAlert({ sos, patientEmail, onAcknowledge }) {
  const open = sos.filter(s => s.status === 'open')
  const [replyFor, setReplyFor] = useState(null)
  const [reply, setReply] = useState('')
  if (open.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      {open.map(s => (
        <div key={s.id} style={{ background: '#fdeaea', border: '1.5px solid #f5a8a8', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c0392b', marginBottom: 3 }}>🆘 Support requested</div>
          <div style={{ fontSize: 12, color: '#8a5a5a', marginBottom: 10 }}>
            {patientEmail} · {fmt(s.createdAt)}{s.note ? ` — “${s.note}”` : ''}
          </div>
          {replyFor === s.id ? (
            <div>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Note back to the parent (e.g. “Got your message — let's talk at our next check-in”)"
                style={{ width: '100%', border: '1.5px solid #f5a8a8', borderRadius: 10, padding: 8, fontSize: 13, fontFamily: "'Outfit', sans-serif", resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setReplyFor(null); setReply('') }} style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                <button onClick={() => { onAcknowledge(s.id, reply); setReplyFor(null); setReply('') }}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: '#c0392b', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Acknowledge + send</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setReplyFor(s.id)} style={{ background: 'white', border: '1.5px solid #f5a8a8', color: '#c0392b', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>✓ Acknowledge</button>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire into `ClinicianView.jsx`**

Import and pull the SOS data from context:
```jsx
import SosAlert from '../components/SosAlert'
```
In the component, add to the `useFirebaseData()` destructure: `patientSos, patientsWithOpenSos, acknowledgeSos`.
Render `<SosAlert>` at the top of the viewed-patient content (just inside the `viewingPatientUid ? (...)` block, before `<RevealSection eyebrow="Week at a glance">`):
```jsx
<SosAlert
  sos={patientSos}
  patientEmail={patients.find(p => p.uid === viewingPatientUid)?.email || 'Patient'}
  onAcknowledge={acknowledgeSos}
/>
```

- [ ] **Step 3: Add the patient-list SOS badge**

In the patient `<select>`, each `<option>` can't show a colored dot, so add a small red "🆘 SOS" prefix to the option label when that patient has an open SOS:
```jsx
{patients.map(p => (
  <option key={p.uid} value={p.uid}>{patientsWithOpenSos[p.uid] ? '🆘 ' : ''}{p.email}</option>
))}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/SosAlert.jsx src/pages/ClinicianView.jsx
git commit -m "feat: clinician SOS alert + acknowledge with note-back"
```

---

## Task 10: End-to-end verification + deploy

**Files:** none (verification)

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: all suites pass (smoke, weekStats, weekFacts, chatService).

- [ ] **Step 2: Start the preview, sign in as parent (mobile 375px)**

Run the preview (`preview_start dev`), resize to mobile, sign in. Verify:
- Chat bubble appears bottom-right on Today/Week/Insights/Notes.
- Open → greeting shows. Type "how many meals went okay this week?" → the number matches the Insights tab. Ask "what should she eat for more protein?" → it declines and offers to flag the care team.

- [ ] **Step 3: SOS round-trip**

- Tap 🆘 → confirm dialog shows the 988/911 disclaimer → add a note → Send → assistant confirms.
- In a second context signed in as the **clinician** (or switch the demo role), select that patient → red "🆘" prefix in the list + the red alert card with the note.
- Click Acknowledge → type a note back → Acknowledge + send.
- Back as the parent: the chat shows "💛 Your care team: …" and the bubble's unread dot appears if closed.

- [ ] **Step 4: Desktop check (1280px)**

Confirm the bubble + panel render on desktop and the clinician alert looks right; existing screens unaffected.

- [ ] **Step 5: Confirm deploys are done**

- Worker already deployed (Task 5). DB rules already deployed (Task 7).
- Push to `main` → hosting CI deploys the app. Confirm both live URLs serve the new bundle.

- [ ] **Step 6: Final commit / push**

```bash
git push origin main
```

---

## Notes for the implementer

- **Both platforms, always** (standing rule): every UI piece must work on mobile (375px) and desktop (1280px), verified in the preview before marking done.
- **Grounding is the whole point:** never let the model compute week numbers. If a recap number looks wrong, the bug is in `buildWeekFacts`, not the prompt.
- **SOS is not a crisis line** — keep the 988/911 disclaimer visible; don't remove it.
- Chat history is intentionally session-only in v1 (resets on reload). Do not add persistence unless asked.
