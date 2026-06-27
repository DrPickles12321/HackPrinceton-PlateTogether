# Capacitor — Native App Scoping

Plan for wrapping the existing responsive Plate Together build into real
iOS (App Store) and Android (Play Store) apps using [Capacitor](https://capacitorjs.com).

This is a scoping document, not a step-by-step to run verbatim. It captures the
decisions, work, and risks so we can estimate and sequence the native phase.

**Status:** not started. The web + PWA app is live and is the exact artifact
Capacitor wraps — no rewrite, no second codebase.

---

## Why Capacitor fits here

Capacitor takes our compiled `dist/` (the same Vite build deployed to Firebase
Hosting) and runs it inside a native WebView shell, plus native plugins for
device APIs. Everything we already built carries over unchanged:

| Carries over as-is | Why it's fine in Capacitor |
|---|---|
| The whole React/Vite UI (`dist/`) | Runs in the WebView; same bundle as web |
| Firebase Auth (email/password only) | WebView SDK works; **no** OAuth redirect/deep-link needed |
| Firebase Realtime DB | WebSocket works inside the WebView |
| Cloudflare Worker AI proxy | Plain `fetch` over HTTPS |
| `useIsMobile`, bottom-tab nav, sheets | Already phone-sized; the app is always "mobile" in the shell |
| `env(safe-area-inset-*)`, PWA icons | Reused for native safe areas / app icons |

Capacitor 8.4.1 is current; we're on Node 22 (meets requirements).

**Key simplifier:** auth is `signInWithEmailAndPassword` only — no Google sign-in,
so we avoid the biggest Capacitor+Firebase headache (native OAuth redirects,
custom URL schemes, `@capacitor-firebase/authentication`). Plain email/password
runs in the WebView with no extra native auth work.

---

## Decisions needed before starting

1. **Which platforms?** iOS + Android both, or start with one?
   - iOS **requires a Mac with Xcode** to build/submit. (We're on macOS — OK.)
   - Android needs Android Studio (any OS).
2. **Store accounts** (the real gating cost/time, not the code):
   - Apple Developer Program — **$99/year**, ~1–2 day enrollment.
   - Google Play Developer — **$25 one-time**, identity verification can take days.
3. **Distribution goal:** public store listing, or internal/TestFlight + Play
   Internal Testing only (faster, no full review)? Affects review/asset scope.
4. **Bundle identifiers & app name** — e.g. `ai.platetogether.app` (reverse-DNS,
   permanent once published). Display name "Plate Together".
5. **Health-data review risk:** this is an eating-disorder-recovery tool. Apple
   review can scrutinize health/medical apps — we likely need a privacy policy
   URL, a clear "not a medical device / not a substitute for medical advice"
   disclaimer (we already show this in-app), and possibly an age rating note.

---

## Work plan (phased)

### Phase 0 — Project setup (~0.5 day)
- `npm i -D @capacitor/cli && npm i @capacitor/core`
- `npx cap init "Plate Together" ai.platetogether.app --web-dir dist`
- Add `capacitor.config.ts`: `webDir: 'dist'`, app id/name, and a dev
  `server.url` block (commented) for live-reload during development.
- Confirm `BrowserRouter` works under Capacitor's local scheme. If routing
  misbehaves on deep links, fall back to `HashRouter` (small, isolated change).

### Phase 1 — Platforms + core plugins (~1 day)
- `npm i @capacitor/ios @capacitor/android && npx cap add ios android`
- Core plugins:
  - `@capacitor/status-bar` — style the status bar to the cream/coral theme.
  - `@capacitor/splash-screen` — branded launch screen (reuse `app-icon.svg`/PNGs).
  - `@capacitor/keyboard` — native keyboard resize (complements the VisualViewport
    handling already in `BottomSheet`).
  - `@capacitor/app` — Android hardware back button → router back / sheet close.
- `npm run build && npx cap sync` to push web assets + plugins into native projects.

### Phase 2 — Native assets & config (~1 day)
- App icons + splash from our existing artwork via `@capacitor/assets`
  (`npx capacitor-assets generate`) — needs a 1024×1024 source (regenerate from
  `public/app-icon.svg`).
- iOS: set display name, version, `Info.plist` (no special permissions needed —
  no camera/location/notifications in scope).
- Android: `strings.xml` app name, `AndroidManifest` (default permissions fine).
- Firebase Auth → **add the Capacitor origins to Authorized Domains**
  (`localhost`, and the `capacitor://`/`https://localhost` scheme) in the Firebase
  console, or email/password sign-in will be rejected in the shell.

### Phase 3 — Device testing (~1–2 days)
- iOS Simulator + a real iPhone (Safari WebView quirks); Android emulator + a real
  device (Chrome WebView). Verify: login, realtime sync, AI insights fetch,
  bottom-tab nav, add-food sheet + keyboard lift, safe areas, back button.
- Confirm offline behavior (the service worker isn't used in the native shell —
  Capacitor serves assets locally already; decide whether to keep SW registration
  gated to web only, which it currently is via `import.meta.env.PROD` + web origin).

### Phase 4 — Store submission (~2–4 days wall-clock, mostly review wait)
- Screenshots (per device-size matrix), descriptions, privacy policy URL,
  data-safety / privacy-nutrition forms, age rating, the medical disclaimer.
- iOS: archive in Xcode → App Store Connect → TestFlight → review.
- Android: signed AAB → Play Console → Internal testing → production review.

---

## Effort estimate

- **Engineering to a device-installable build:** ~3–4 focused days (Phases 0–3).
- **First store approval:** +1–2 weeks wall-clock, dominated by account enrollment
  and review queues, not coding.
- **Lowest-risk first milestone:** Android internal-testing build — fastest path
  to "it's a real installable app on a phone" without Apple review latency.

---

## Risks / unknowns

- **Apple review of a health/recovery app** — the most likely friction. Mitigate
  with a privacy policy, the existing disclaimer, and accurate age rating.
- **Routing under the native scheme** — `BrowserRouter` usually works; budget a
  small spike, `HashRouter` is the fallback.
- **Firebase authorized domains** — easy to forget; sign-in silently fails in the
  shell until the Capacitor origin is whitelisted.
- **Two new toolchains** (Xcode, Android Studio) — first-time setup overhead.
- **Maintenance** — every native release needs `npm run build && npx cap sync` and
  a re-submit; web stays instant via Firebase Hosting. Keep web as the primary
  channel; treat native as a periodic packaged release.

---

## What we are NOT doing (yet)

- No push notifications, camera, HealthKit/Google Fit, or biometric login in this
  scope — none are required by current features. Each would add a plugin + native
  permission + review surface.
- No separate native codebase or design — Capacitor wraps the one responsive build.

---

## Recommended sequence

1. Confirm the 5 decisions above (esp. platforms + store accounts).
2. Phases 0–3 behind a branch; produce an Android internal-testing build first.
3. Demo on a real device, then iOS/TestFlight, then store submissions.
