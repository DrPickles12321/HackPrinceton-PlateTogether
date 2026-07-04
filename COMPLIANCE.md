# Compliance & Data-Protection Checklist

Plate Together stores **sensitive health data** (eating-disorder recovery: meals,
distress ratings, clinician notes) tied to identifiable people. That puts real
deployments under **HIPAA** (US, if used by/for healthcare providers) and/or
**GDPR** (EU users). This file is the gap list to close *before onboarding real
patients or clinicians*. It is fine as-is for a demo/hackathon with fake data.

> Not legal advice. Before real clinical use, have a lawyer review.

## Status legend
- [x] done in code  ·  [ ] TODO (mostly console/legal, not code)

## 1. Sign a BAA with Google (HIPAA) — **blocking for real use**
- [ ] Accept the **Google Cloud / Firebase Business Associate Agreement** in the
      Google Cloud console (Firebase is HIPAA-eligible only for *covered* services
      and *only* once a BAA is in place).
- [ ] Confirm every service you use is in-scope of the BAA. **Realtime Database,
      Auth, and Hosting** are the ones this app relies on — verify each is covered
      for your project, and stop using any that aren't for PHI.
- [ ] **Cloudflare Worker (AI proxy):** you send meal/status summaries to Anthropic
      through it. For PHI you need a BAA with **Cloudflare** *and* **Anthropic**
      (Anthropic offers a BAA / zero-retention terms on request), or strip all PHI
      before it leaves Firebase. Today the chat sends deterministic weekly stats +
      food names — treat that as PHI.

## 2. Lock down access (partly code)
- [x] Server-enforced Firebase Security Rules (owner / linked-clinician only).
- [x] **App Check** wired (`src/firebase.js`, reCAPTCHA v3) — set
      `VITE_RECAPTCHA_SITE_KEY` and enable enforcement (see SECURITY steps below).
- [x] Family-code linking now requires proving the code (rules `.validate`), so a
      leaked UID alone can't link.
- [ ] **Verify clinician identity out-of-band.** Anyone can self-register as a
      "clinician" role today. Add an approval/allow-list or invite flow before real
      clinicians get accounts.
- [ ] **Enforce a strong password policy + MFA** for clinician accounts (Firebase
      Auth supports MFA on the Blaze plan / Identity Platform).

## 3. Consent, rights & retention (mostly legal/UX)
- [ ] **Consent at sign-up:** explicit, logged consent to store health data;
      parental consent for minors (most patients here are minors → COPPA also).
- [ ] **Privacy policy + Terms** covering what's stored, why, who sees it, and
      sub-processors (Google, Cloudflare, Anthropic, USDA).
- [ ] **Right to access & delete (GDPR/CCPA):** a real "export my data" and
      "delete my account + all data" path. Account deletion must purge the whole
      `users/{uid}` subtree, the `familyCodes/{code}` entry, and any clinician
      `patients/{uid}` links pointing at them.
- [ ] **Data-retention policy:** how long recovery data is kept after a patient
      leaves care, and automatic purge.

## 4. Audit & monitoring (some code)
- [ ] **Audit log** of clinician access to patient data (who viewed/edited whom,
      when) — a HIPAA expectation. Consider writing an append-only `auditLog` node
      or exporting DB access logs to BigQuery.
- [ ] **Alerting** on unusual access patterns and on billing spikes (abuse signal).
- [ ] Turn on Firebase **budget alerts** once on Blaze.

## 5. Data-handling hygiene (partly code)
- [x] No PHI in URLs/query strings (routing uses IDs, not personal data).
- [x] Anthropic/API keys server-side only (Cloudflare Worker), never in the client.
- [ ] **Scrub PHI from logs.** The Worker currently `console.error`s upstream error
      bodies; make sure request payloads (which contain food/health data) are never
      logged in Cloudflare or anywhere.
- [ ] **Add write validation rules** to cap field sizes/shape on `users/{uid}` data
      (prevents a compromised client from bloating storage / your bill).
- [ ] Encryption: Firebase encrypts at rest & in transit by default — document this;
      no action needed beyond confirming.

## 6. Before launch
- [ ] Move off the free **Spark** plan to **Blaze** (see README/notes) — Spark caps
      at 100 concurrent connections and has no BAA.
- [ ] Penetration test / security review of the rules and the Worker.
- [ ] Incident-response + breach-notification plan (HIPAA requires 60-day breach
      notification).

---

**Bottom line:** the app is technically secure for a demo (rules hold, keys are
server-side, App Check + code-gated linking added). The remaining work to serve
*real patients* is mostly **legal/agreements (BAAs, consent, policies)** and a few
operational features (**account deletion, audit log, clinician verification**) —
not a rewrite.
