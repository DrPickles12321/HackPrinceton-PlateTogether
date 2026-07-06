# Clinician Verification & Parent Access Control — Plan (#4)

**Goal:** Make it trustworthy for *real users* who controls a clinician account and who can see a family's data. Two related holes, addressed together.

---

## The two problems

**A. Anyone can become a "clinician."**
Sign-up lets you self-select the `clinician` role. Nothing verifies you're a real clinician. A bad actor can create a clinician account and accumulate a dashboard.

**B. Parents can't see or revoke who has access to their data.**
A clinician links via family code (`users/{clinicianUid}/patients/{parentUid}`). That link lives in the *clinician's* tree, so the parent has **no visibility** into who's linked to them and **no way to revoke** it. For minors' health data, this is the bigger gap — access with no patient-side control.

> Reframe: the family-code model is actually a reasonable *patient-controlled* access pattern (the parent chooses to share the code with their real clinician — like a share link). The fixes below tighten who can hold the clinician role (A) and give the parent visibility + a kill switch (B).

---

## Recommended approach

### Part B first (higher user value, self-contained): Parent "Care team" with revoke

Give parents a **reverse index** of who's linked to them, plus a revoke that actually cuts access.

1. **Reverse index on link.** When `addPatientByCode` writes the clinician→patient link, also write
   `users/{parentUid}/careTeam/{clinicianUid} = { clinicianEmail, addedAt, active: true }`.
   Rules: the *clinician* may create this node on the parent's tree only when they know the family code
   (same `.validate` pattern as `patients`); the *parent* may read it and set `active`/delete it.

2. **Gate clinician read on the parent's grant.** Change `users/{parentUid}` read rule from
   `…/patients/{parentUid}.exists()` to also require
   `root.child('users/{parentUid}/careTeam/{clinicianUid}/active').val() === true`.
   Now the parent revokes by setting `active: false` (or deleting) — the clinician instantly loses read access.
   *(Requires care: the read rule references a parent-tree node; verify no circular/perf issues in the emulator.)*

3. **Parent UI:** a "Care team" card (in Notes or a new Account view) listing linked clinicians with a
   **Remove access** button per clinician. Both platforms.

4. **Data migration:** existing links have no `careTeam` entry → back-fill on next clinician view, or treat
   missing `active` as `true` during a grace window so current links keep working.

### Part A (policy decision needed): Gate the clinician role

Pick one — in rough order of effort:

- **Invite code (recommended for now).** A short shared secret required to register as `clinician`
  (checked at sign-up; store approved codes at `clinicianInvites/{code}`). Simple, no admin UI, good enough
  to stop random self-registration.
- **Email allow-list.** Only pre-approved emails may hold the clinician role. Stronger, needs list upkeep.
- **Manual approval.** Clinician signs up `pending`; an admin flips them to active. Most robust; needs an
  admin surface + a pending state in routing.

Rules: add a check so `users/{uid}/role === 'clinician'` can only be written if an invite/allow-list
condition holds (e.g. `root.child('clinicianInvites/' + newData.val()).exists()`).

---

## Tasks (when built)
1. Rules + emulator test for `careTeam` (create-with-code, parent read/revoke, clinician read gated on `active`).
2. `addPatientByCode` also writes the `careTeam` reverse-index entry.
3. Parent "Care team" card + Remove-access (both platforms).
4. Back-fill / grace handling for existing links.
5. Clinician invite-code gate at sign-up + rule.
6. Deploy rules; verify: clinician links → shows in parent care team → parent revokes → clinician loses access.

## Notes / risks
- The read-rule change (B2) is the delicate part — test it hard in the RTDB emulator before deploying, or
  you can lock clinicians out of existing patients. Ship behind the grace window.
- A full cascade (parent account deletion removing all clinician links) still wants a Cloud Function (Blaze).
- Keep the family-code hardening already shipped (`patients/$patientUid` `.validate`).
