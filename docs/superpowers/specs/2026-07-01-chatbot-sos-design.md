# Parent Chatbot + SOS — Design

**Date:** 2026-07-01
**Status:** Approved (brainstorm), pending implementation plan

## Goal

Add a **parent-facing focused assistant** to Plate Together that (a) gives a warm, accurate **weekly recap** and answers questions about the family's own logged data, and (b) provides a non-urgent **SOS** the parent can send to their care team, which surfaces live on the clinician dashboard.

## Context

Plate Together is a React 18 + Vite + Firebase (Auth + Realtime DB) app with a Cloudflare Worker AI proxy (`worker/src/index.js`, Firebase-JWT authed → Anthropic `claude-haiku-4-5`). Existing, reusable pieces:

- **AI infra:** `src/lib/aiInsights.js` already calls the Worker (`generateWeeklyInsights` = warm/parent voice, `generateClinicianDigest` = clinical). The Worker takes a single `{prompt}` (plus `{query}`/`{search}` for USDA).
- **Week stats (deterministic):** `src/pages/StatsView.jsx` `computeWeekStats()` + `src/lib/insights.js` `getWeekIsoDates()` compute meals okay/difficult/refused/skipped, success rate, hardest meal, challenge attempts — from `mealStatuses` + `allMealItems`.
- **Parent↔clinician link:** clinicians add patients by family code → `patients` list; they read a viewed patient at `users/{viewingPatientUid}/…` and write `clinicianNotes`. Parent data (`parentNotes`, `mealStatuses`, etc.) is readable by a linked clinician per `database.rules.json`.
- **UI primitives:** `BottomSheet` (mobile sheets), `Modal`, `ParentView` (renders the parent Outlet + `MobileTabBar`), `useIsMobile`.

## Decisions (from brainstorm)

1. **SOS intent:** non-urgent "please check in." In-app alert only — **no push/email in v1**. Always shows a "not for emergencies → 988/911" disclaimer.
2. **Chatbot type:** **focused assistant**, not open chat. Bounded capabilities; declines medical/nutrition/calorie/diagnosis; redirects to care team; crisis → 988/911.
3. **Audience:** **parent only** in v1. Clinician *receives* the SOS on their existing dashboard (no clinician chatbot yet).
4. **Placement:** **floating bubble** on every parent screen → slide-up chat panel. SOS button lives inside the panel.
5. **Data grounding:** **deterministic facts + AI phrasing.** The app computes real week-facts; the AI only phrases/answers grounded in them (never counts/invents numbers).
6. **SOS acknowledge:** clinician Acknowledge flips status **and** sends a short **note-back** the parent sees (closes the loop).

## Non-goals (v1)

- No push notifications or email (the SOS is in-app only; document the limitation clearly in UI).
- Not an emergency/crisis service. The assistant is not a therapist and gives no medical/nutrition advice.
- No clinician-side chatbot.
- Chat history is **session-only** (in memory; resets on reload). Persisting transcripts is a later option.

## Architecture

```
Parent app                         Cloudflare Worker            Anthropic
──────────                         ─────────────────            ─────────
ChatWidget (bubble + panel)
   │  user message
   ▼
chatService.buildMessages()
   • system prompt (guardrails + week-facts)
   • conversation so far
   │  POST { system, messages }  (Firebase JWT)
   ▼ ───────────────────────────► chat mode ──────────────────► messages API
                                   (existing prompt/search modes unchanged)
   ◄─────────────── { text } ◄──────────────────────────────────┘

SOS button ──► FirebaseData.sendSos({note})
   └─ write users/{uid}/sos/{id} = { createdAt, note, status:'open' }

Clinician dashboard (existing) ── onValue(users/{patientUid}/sos)
   • red badge on patient + alert card
   • Acknowledge → acknowledgeSos(id, responseText)
       └─ status:'acknowledged', response:{ body, at }
Parent chat ◄── shows care-team response + unread dot on bubble
```

## Components

### `src/components/ChatWidget.jsx` (new)
- Floating circular bubble, fixed bottom-right, above the mobile tab bar (respect `env(safe-area-inset-bottom)`; z-index above content, below modals). Unread dot when a care-team SOS response is unseen.
- Opens a panel: `BottomSheet` on mobile, a fixed bottom-right card (~360×520) on desktop.
- Panel = message list (assistant/user bubbles) + input + **SOS** button (distinct, coral-outline) + a persistent footer disclaimer.
- Rendered once in `ParentView` so it appears on every parent screen. Not rendered for clinicians.

### `src/lib/chatService.js` (new)
- `buildSystemPrompt(weekFacts)` — static guardrails + injected compact facts JSON.
- `sendChat(messages)` — POSTs `{ system, messages }` to `VITE_AI_PROXY_URL` with the Firebase ID token (mirror `aiInsights.callClaude`), returns assistant text. Errors → a friendly inline "I couldn't reach the assistant just now."
- Conversation state lives in `ChatWidget` (in-memory array).

### `src/lib/weekFacts.js` (new, or export from `insights.js`)
- `buildWeekFacts({ mealStatuses, allMealItems, mealTimesByDate })` → `{ thisWeek: {...computeWeekStats}, lastWeek: {...}, perDay: [...] }`. Pure function, unit-tested. Reuses `computeWeekStats` (extract it from `StatsView` into `insights.js` so both share it).

### Worker `worker/src/index.js` (extend)
- New branch: `if (Array.isArray(body.messages))` → validate (≤ ~20 messages, total length cap), call Anthropic with top-level `system` (from `body.system`, length-capped) + `messages`. Return `{ text }`.
- Existing `{query}`/`{search}`/`{prompt}` branches unchanged. Same JWT auth.

### `src/contexts/FirebaseDataContext.jsx` (extend)
- Parent: `sendSos({ note })` → `set(users/{uid}/sos/{id}, { createdAt, note: note?.slice(0,500)||'', status:'open' })`; listener on own `sos` to show the care-team response in chat.
- Clinician: listener on `users/{viewingPatientUid}/sos`; `acknowledgeSos(id, responseText)` → `update(.../sos/{id}, { status:'acknowledged', response:{ body: responseText.slice(0,500), at: now } })`. Also expose open-SOS state for the patient-list badge.

### Clinician UI (`src/pages/ClinicianView.jsx`)
- Red dot + "SOS" badge on any patient with an open SOS in the patient `<select>`/list.
- When viewing a patient with an open SOS: a red alert card (who/when/note) + Acknowledge (opens a tiny note-back composer, prefilled optional). Live via `onValue`.

## Data model

```
users/{uid}/sos/{sosId} = {
  createdAt: <ISO>,
  note: <string ≤500, optional>,
  status: 'open' | 'acknowledged',
  response?: { body: <string ≤500>, at: <ISO> }   // set on acknowledge
}
```

**DB rules (`database.rules.json`):** add under `users/$uid`:
- `sos`: parent (`auth.uid === $uid`) may read/write their own; a linked clinician
  (`root.child('users/'+auth.uid+'/patients/'+$uid).exists()`) may read and write
  `status`/`response`. Deployed manually: `firebase deploy --only database`.

## Chatbot behavior & guardrails (system prompt outline)

- **Role:** warm, brief, non-clinical assistant for a parent using a meal-support app. Voice matches `generateWeeklyInsights` ("a caring friend, not a doctor").
- **Grounding:** "Here are this family's real logged facts for the week: `<JSON>`. Only use these for any numbers or specifics. If asked something not answerable from them, say you don't have that info."
- **Allowed:** weekly recap; questions about the family's own logged data; gently offering the SOS when the parent expresses distress.
- **Refuse:** medical/nutrition/calorie/diagnosis/treatment advice → "I can't give medical or nutrition advice — your care team is the right person. Want me to flag it for them?" Off-topic → redirect.
- **Crisis:** if a message indicates self-harm or danger, respond with 988 / 911 / Crisis Text Line (741741) and offer the SOS; state clearly it is not a substitute for emergency help. (Prompt-level safety net, not guaranteed detection.)
- **Never** claim to be a clinician, never diagnose, never discuss weight/calorie targets.

## Error handling

- Worker/network failure → inline assistant message: "I couldn't reach the assistant just now — try again in a moment." No crash; input stays.
- SOS write failure → toast "Couldn't send — please try again," SOS button re-enabled; never silently drop.
- Missing `VITE_AI_PROXY_URL` or signed-out → chat shows a disabled state; SOS still works (pure Firebase write).
- Clinician acknowledge failure → toast, alert stays open.

## Testing

- **Unit:** `buildWeekFacts` (deterministic from sample `mealStatuses`/`allMealItems`); `buildSystemPrompt` includes guardrails + facts; SOS record shape.
- **Worker:** `messages` mode returns text; oversize messages rejected; `{prompt}`/`{search}` still work.
- **Preview (375px + 1280px, signed in):**
  - Bubble appears on all parent screens; opens/closes; not shown to clinicians.
  - Recap matches the real Insights numbers; a nutrition question is declined.
  - SOS confirm (with disclaimer) → write → **clinician** sees badge + alert → Acknowledge + note-back → parent sees response + unread dot.
- **Desktop unchanged:** existing flows unaffected; chat is additive.

## Rollout / deploy notes

- Worker redeploy (`cd worker && npx wrangler deploy`) for the `messages` mode.
- DB rules deploy (`firebase deploy --only database`) for the `sos` node — **required or SOS writes/reads fail**.
- App deploys via existing hosting CI on push to `main`.
- Ship every UI piece on **both** desktop and mobile, verified in preview (standing rule).
