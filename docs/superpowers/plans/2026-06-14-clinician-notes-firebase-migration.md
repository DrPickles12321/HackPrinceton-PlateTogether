# Clinician Notes Firebase Migration (Phase 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move clinician notes (`clinician_notes` Supabase table) to per-patient Firebase Realtime Database storage (`users/{patientUid}/clinicianNotes`), removing the second Supabase dependency.

**Architecture:** Add `clinicianNotes` (an active array that resolves to the clinician's own data or the currently-viewed patient's data, mirroring the existing `prescribedSupplements`/`parentNotesArray` pattern) plus `writeClinicianNote`/`deleteClinicianNote` functions to `FirebaseDataContext`. `ParentView.jsx` reads `clinicianNotes` from context instead of fetching/subscribing to Supabase. `ClinicianView.jsx` reads `clinicianNotes` from context and calls `writeClinicianNote`/`deleteClinicianNote` instead of Supabase CRUD + realtime. This is **Phase 2a** of the larger Supabase-to-Firebase migration:
- **Phase 1 (done):** Food catalog (`food_items` sidebar → `users/{uid}/foodItems`)
- **Phase 2a (this plan):** Clinician notes (`clinician_notes` → `users/{uid}/clinicianNotes`)
- **Phase 2b (future plan):** Appointments (`appointments` → Firebase) — small, `ClinicianView.jsx` only
- **Phase 2c (future plan):** Weekly plan — `meal_slots`, `meal_logs`, and the second `food_items` Supabase usage (`ParentView.jsx`, `ClinicianView.jsx`, `DailyView.jsx`, `MealLogModal.jsx`, `WeeklyGrid.jsx`, `WeeklyInsights.jsx`, `WeeklyGoals.jsx`, `SupplementChecklist.jsx`)
- **Phase 3 (future plan):** Delete dead Supabase code once Phase 2 is fully complete

**Tech Stack:** React 19, Firebase Realtime Database (`firebase/database`), Vite. No automated test runner is configured for this app (`package.json` has no `test` script) — verification is manual via the dev server in the browser.

---

## File Structure

- **Modify:** `src/contexts/FirebaseDataContext.jsx` — add `clinicianNotes` (own/patient subscriptions + derived active value) and `writeClinicianNote`/`deleteClinicianNote` functions; export them from the context value.
- **Modify:** `src/pages/ParentView.jsx` — remove the `clinician_notes` Supabase fetch and realtime subscription; consume `clinicianNotes` from `useFirebaseData()`.
- **Modify:** `src/pages/ClinicianView.jsx` — remove the `clinician_notes` Supabase fetch, realtime subscription, and CRUD calls; consume `clinicianNotes`/`writeClinicianNote`/`deleteClinicianNote` from `useFirebaseData()`; remove the unused `handleDeleteNote`.

No new files. All three files already exist and are read in full below where relevant.

---

### Task 1: Add `clinicianNotes` to FirebaseDataContext

**Files:**
- Modify: `src/contexts/FirebaseDataContext.jsx`

- [ ] **Step 1: Add `ownClinicianNotes` and `patientClinicianNotes` state**

In `src/contexts/FirebaseDataContext.jsx`, find the "Own user data" state block (around line 68-76):

```javascript
  const [fbMealData, setFbMealData]                   = useState({})
  const [ownNutritionalTargets, setOwnNutritionalTargets] = useState(DEFAULT_TARGETS)
  const [parentNotesByDate, setParentNotesByDate]     = useState({})
  const [mealTimes, setMealTimes]                     = useState(DEFAULT_MEAL_TIMES)
  const [supplementLog, setSupplementLog]             = useState({})
  const [clinicianNotesRead, setClinicianNotesRead]   = useState({})
  const [savedClinicianNotes, setSavedClinicianNotes] = useState([])
  const [foodItems, setFoodItems]                     = useState([])
  const [familyCode, setFamilyCode]                   = useState(null)
```

Add `ownClinicianNotes` right after `savedClinicianNotes`:

```javascript
  const [fbMealData, setFbMealData]                   = useState({})
  const [ownNutritionalTargets, setOwnNutritionalTargets] = useState(DEFAULT_TARGETS)
  const [parentNotesByDate, setParentNotesByDate]     = useState({})
  const [mealTimes, setMealTimes]                     = useState(DEFAULT_MEAL_TIMES)
  const [supplementLog, setSupplementLog]             = useState({})
  const [clinicianNotesRead, setClinicianNotesRead]   = useState({})
  const [savedClinicianNotes, setSavedClinicianNotes] = useState([])
  const [ownClinicianNotes, setOwnClinicianNotes]     = useState([])
  const [foodItems, setFoodItems]                     = useState([])
  const [familyCode, setFamilyCode]                   = useState(null)
```

Now find the "Clinician patient management" state block (around line 79-85):

```javascript
  // ── Clinician patient management ──────────────────────────────────────────
  const [patients, setPatients]                       = useState([])   // [{uid, email}]
  const [viewingPatientUid, setViewingPatientUid]     = useState(null)
  const [patientFbMealData, setPatientFbMealData]     = useState({})
  const [patientNutritionalTargets, setPatientNutritionalTargets] = useState(null)
  const [ownPrescribedSupplements, setOwnPrescribedSupplements]       = useState([])
  const [patientPrescribedSupplements, setPatientPrescribedSupplements] = useState([])
  const [patientParentNotesByDate, setPatientParentNotesByDate] = useState({})
```

Add `patientClinicianNotes` right after `patientParentNotesByDate`:

```javascript
  // ── Clinician patient management ──────────────────────────────────────────
  const [patients, setPatients]                       = useState([])   // [{uid, email}]
  const [viewingPatientUid, setViewingPatientUid]     = useState(null)
  const [patientFbMealData, setPatientFbMealData]     = useState({})
  const [patientNutritionalTargets, setPatientNutritionalTargets] = useState(null)
  const [ownPrescribedSupplements, setOwnPrescribedSupplements]       = useState([])
  const [patientPrescribedSupplements, setPatientPrescribedSupplements] = useState([])
  const [patientParentNotesByDate, setPatientParentNotesByDate] = useState({})
  const [patientClinicianNotes, setPatientClinicianNotes] = useState([])
```

- [ ] **Step 2: Reset `ownClinicianNotes` when logged out**

In the same file, find the `if (!uid) { ... return }` block inside the "Subscribe to own data" `useEffect` (around line 89-103):

```javascript
    if (!uid) {
      setFbMealData({})
      setOwnNutritionalTargets(DEFAULT_TARGETS)
      setParentNotesByDate({})
      setMealTimes(DEFAULT_MEAL_TIMES)
      setSupplementLog({})
      setClinicianNotesRead({})
      setSavedClinicianNotes([])
      setFoodItems([])
      setFamilyCode(null)
      setPatients([])
      setViewingPatientUid(null)
      setOwnPrescribedSupplements([])
      return
    }
```

Add `setOwnClinicianNotes([])` to the list:

```javascript
    if (!uid) {
      setFbMealData({})
      setOwnNutritionalTargets(DEFAULT_TARGETS)
      setParentNotesByDate({})
      setMealTimes(DEFAULT_MEAL_TIMES)
      setSupplementLog({})
      setClinicianNotesRead({})
      setSavedClinicianNotes([])
      setOwnClinicianNotes([])
      setFoodItems([])
      setFamilyCode(null)
      setPatients([])
      setViewingPatientUid(null)
      setOwnPrescribedSupplements([])
      return
    }
```

- [ ] **Step 3: Subscribe to own `clinicianNotes` from the database**

In the same `useEffect`, find the `savedClinicianNotes` subscription (around line 145-148):

```javascript
    unsubs.push(onValue(ref(db, `${base}/savedClinicianNotes`), snap => {
      const val = snap.val()
      setSavedClinicianNotes(val ? Object.values(val) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/foodItems`), snap => {
```

Add a new subscription for `clinicianNotes` right after the `savedClinicianNotes` subscription:

```javascript
    unsubs.push(onValue(ref(db, `${base}/savedClinicianNotes`), snap => {
      const val = snap.val()
      setSavedClinicianNotes(val ? Object.values(val) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/clinicianNotes`), snap => {
      const val = snap.val()
      setOwnClinicianNotes(val ? Object.values(val).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/foodItems`), snap => {
```

- [ ] **Step 4: Subscribe to the viewed patient's `clinicianNotes`**

Find the "Subscribe to selected patient data" `useEffect` (around line 187-211):

```javascript
  useEffect(() => {
    if (!viewingPatientUid) {
      setPatientFbMealData({})
      setPatientNutritionalTargets(null)
      setPatientPrescribedSupplements([])
      setPatientParentNotesByDate({})
      return
    }
    const unsubs = []
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/mealLogs`), snap => {
      setPatientFbMealData(normalizeMealData(snap.val()))
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/nutritionalTargets`), snap => {
      const val = snap.val()
      setPatientNutritionalTargets(val && !val.breakfast ? val : null)
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/prescribedSupplements`), snap => {
      const val = snap.val()
      setPatientPrescribedSupplements(Array.isArray(val) ? val : [])
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/parentNotes`), snap => {
      setPatientParentNotesByDate(snap.val() || {})
    }))
    return () => unsubs.forEach(u => u())
  }, [viewingPatientUid])
```

Replace it with:

```javascript
  useEffect(() => {
    if (!viewingPatientUid) {
      setPatientFbMealData({})
      setPatientNutritionalTargets(null)
      setPatientPrescribedSupplements([])
      setPatientParentNotesByDate({})
      setPatientClinicianNotes([])
      return
    }
    const unsubs = []
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/mealLogs`), snap => {
      setPatientFbMealData(normalizeMealData(snap.val()))
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/nutritionalTargets`), snap => {
      const val = snap.val()
      setPatientNutritionalTargets(val && !val.breakfast ? val : null)
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/prescribedSupplements`), snap => {
      const val = snap.val()
      setPatientPrescribedSupplements(Array.isArray(val) ? val : [])
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/parentNotes`), snap => {
      setPatientParentNotesByDate(snap.val() || {})
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/clinicianNotes`), snap => {
      const val = snap.val()
      setPatientClinicianNotes(val ? Object.values(val).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')) : [])
    }))
    return () => unsubs.forEach(u => u())
  }, [viewingPatientUid])
```

- [ ] **Step 5: Derive the active `clinicianNotes` value**

Find the "Active data" derivation block (around line 213-220):

```javascript
  const activeFbMealData       = viewingPatientUid ? patientFbMealData : fbMealData
  const nutritionalTargets     = viewingPatientUid ? patientNutritionalTargets : ownNutritionalTargets
  const allMealItems           = deriveMealItems(activeFbMealData)
  const mealStatuses           = deriveMealStatuses(activeFbMealData)
  const activeParentNotesByDate = viewingPatientUid ? patientParentNotesByDate : parentNotesByDate
  const parentNotesArray       = Object.values(activeParentNotesByDate)
  const prescribedSupplements  = viewingPatientUid ? patientPrescribedSupplements : ownPrescribedSupplements
```

Add `clinicianNotes` right after `prescribedSupplements`:

```javascript
  const activeFbMealData       = viewingPatientUid ? patientFbMealData : fbMealData
  const nutritionalTargets     = viewingPatientUid ? patientNutritionalTargets : ownNutritionalTargets
  const allMealItems           = deriveMealItems(activeFbMealData)
  const mealStatuses           = deriveMealStatuses(activeFbMealData)
  const activeParentNotesByDate = viewingPatientUid ? patientParentNotesByDate : parentNotesByDate
  const parentNotesArray       = Object.values(activeParentNotesByDate)
  const prescribedSupplements  = viewingPatientUid ? patientPrescribedSupplements : ownPrescribedSupplements
  const clinicianNotes         = viewingPatientUid ? patientClinicianNotes : ownClinicianNotes
```

- [ ] **Step 6: Add `writeClinicianNote` and `deleteClinicianNote` functions**

Find the `clearAllSavedNotes` function (around line 350-354):

```javascript
  function clearAllSavedNotes() {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes`), null)
    setSavedClinicianNotes([])
  }
```

Add the two new functions right after it:

```javascript
  function clearAllSavedNotes() {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes`), null)
    setSavedClinicianNotes([])
  }

  function writeClinicianNote({ body, existingNoteId }) {
    if (!viewingPatientUid) return
    if (existingNoteId) {
      const existing = patientClinicianNotes.find(n => n.id === existingNoteId)
      const note = { ...existing, body }
      set(ref(db, `users/${viewingPatientUid}/clinicianNotes/${existingNoteId}`), note)
      setPatientClinicianNotes(prev => prev.map(n => n.id === existingNoteId ? note : n))
    } else {
      const note = { id: crypto.randomUUID(), body, created_at: new Date().toISOString() }
      set(ref(db, `users/${viewingPatientUid}/clinicianNotes/${note.id}`), note)
      setPatientClinicianNotes(prev => [note, ...prev])
    }
  }

  function deleteClinicianNote(noteId) {
    if (!viewingPatientUid) return
    set(ref(db, `users/${viewingPatientUid}/clinicianNotes/${noteId}`), null)
    setPatientClinicianNotes(prev => prev.filter(n => n.id !== noteId))
  }
```

- [ ] **Step 7: Export the new state and functions from the context**

Find the `FirebaseDataContext.Provider` value object (around line 379-412). Find this section:

```javascript
      clinicianNotesRead,
      markClinicianNoteRead,
      savedClinicianNotes,
      saveClinicianNote,
      unsaveClinicianNote,
      clearAllSavedNotes,
```

Add `clinicianNotes`, `writeClinicianNote`, `deleteClinicianNote` right after `clearAllSavedNotes`:

```javascript
      clinicianNotesRead,
      markClinicianNoteRead,
      savedClinicianNotes,
      saveClinicianNote,
      unsaveClinicianNote,
      clearAllSavedNotes,
      clinicianNotes,
      writeClinicianNote,
      deleteClinicianNote,
```

- [ ] **Step 8: Commit**

```bash
git add src/contexts/FirebaseDataContext.jsx
git commit -m "feat: add per-patient clinician notes to FirebaseDataContext"
```

---

### Task 2: Migrate ParentView.jsx off Supabase for clinician notes

**Files:**
- Modify: `src/pages/ParentView.jsx`

- [ ] **Step 1: Remove the local `clinicianNotes` state**

Find (around line 11-15):

```javascript
export default function ParentView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [clinicianNotes, setClinicianNotes] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
```

Replace with:

```javascript
export default function ParentView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
```

- [ ] **Step 2: Consume `clinicianNotes` from `useFirebaseData()`**

Find the `useFirebaseData()` destructure (around line 19-31):

```javascript
  const {
    allMealItems,
    mealStatuses,
    parentNotesArray: parentNotes,
    saveParentNote,
    clinicianNotesRead,
    markClinicianNoteRead,
    savedClinicianNotes,
    saveClinicianNote,
    unsaveClinicianNote,
    clearAllSavedNotes,
    setMealStatus,
  } = useFirebaseData()
```

Add `clinicianNotes` to the list:

```javascript
  const {
    allMealItems,
    mealStatuses,
    parentNotesArray: parentNotes,
    saveParentNote,
    clinicianNotesRead,
    markClinicianNoteRead,
    savedClinicianNotes,
    saveClinicianNote,
    unsaveClinicianNote,
    clearAllSavedNotes,
    setMealStatus,
    clinicianNotes,
  } = useFirebaseData()
```

- [ ] **Step 3: Remove the `clinician_notes` Supabase fetch**

Find the data-loading `useEffect` (around line 33-45):

```javascript
  useEffect(() => {
    document.title = 'My Week · Plate Together'
    supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID)
      .then(({ data }) => { if (data) setMealSlots(data) })
    supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID)
      .then(({ data }) => { if (data) setFoodItems(data) })
    supabase.from('meal_logs').select('*')
      .then(({ data }) => { if (data) setMealLogs(data) })
    supabase.from('clinician_notes').select('*').eq('family_id', DEMO_FAMILY_ID)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setClinicianNotes(data) })
    return () => setStatus('disconnected')
  }, [setStatus])
```

Replace with:

```javascript
  useEffect(() => {
    document.title = 'My Week · Plate Together'
    supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID)
      .then(({ data }) => { if (data) setMealSlots(data) })
    supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID)
      .then(({ data }) => { if (data) setFoodItems(data) })
    supabase.from('meal_logs').select('*')
      .then(({ data }) => { if (data) setMealLogs(data) })
    return () => setStatus('disconnected')
  }, [setStatus])
```

- [ ] **Step 4: Remove the `clinician_notes` realtime subscription**

Find (around line 71-77):

```javascript
  useRealtime({
    table: 'clinician_notes',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setClinicianNotes(c => [row, ...c]),
    onUpdate: row => setClinicianNotes(c => c.map(n => n.id === row.id ? row : n)),
    onDelete: row => setClinicianNotes(c => c.filter(n => n.id !== row.id)),
  })
```

Delete this entire block (including the blank lines immediately before and after it, leaving exactly one blank line between the surrounding `useRealtime` blocks).

- [ ] **Step 5: Commit**

```bash
git add src/pages/ParentView.jsx
git commit -m "feat: read clinician notes from Firebase in ParentView"
```

---

### Task 3: Migrate ClinicianView.jsx off Supabase for clinician notes

**Files:**
- Modify: `src/pages/ClinicianView.jsx`

- [ ] **Step 1: Remove the local `notes` state**

Find (around line 100-103):

```javascript
export default function ClinicianView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [notes, setNotes] = useState([])
```

Replace with:

```javascript
export default function ClinicianView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
```

- [ ] **Step 2: Consume `clinicianNotes`/`writeClinicianNote`/`deleteClinicianNote` from `useFirebaseData()`**

Find the `useFirebaseData()` destructure (around line 105-118):

```javascript
  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    clinicianNotesRead,
    markParentNoteReadById,
    markPatientParentNoteReadById,
    patients,
    viewingPatientUid,
    setViewingPatientUid,
    addPatientByCode,
    prescribedSupplements,
    savePrescribedSupplements,
  } = useFirebaseData()
```

Add `clinicianNotes` and `writeClinicianNote` (note: `deleteClinicianNote` is not used — `handleDeleteNote` is being removed in Step 5 as it has no call site):

```javascript
  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    clinicianNotesRead,
    markParentNoteReadById,
    markPatientParentNoteReadById,
    patients,
    viewingPatientUid,
    setViewingPatientUid,
    addPatientByCode,
    prescribedSupplements,
    savePrescribedSupplements,
    clinicianNotes,
    writeClinicianNote,
  } = useFirebaseData()
```

- [ ] **Step 3: Remove the `clinician_notes` Supabase fetch from `loadData`**

Find `loadData` (around line 153-181):

```javascript
  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [slotsRes, foodsRes, logsRes, notesRes] = await Promise.all([
        supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase.from('meal_logs')
          .select('*, meal_slots!inner(family_id)')
          .eq('meal_slots.family_id', DEMO_FAMILY_ID)
          .order('logged_at', { ascending: false }),
        supabase.from('clinician_notes').select('*').eq('family_id', DEMO_FAMILY_ID)
          .order('created_at', { ascending: false }),
      ])
      if (slotsRes.error) throw slotsRes.error
      if (foodsRes.error) throw foodsRes.error
      if (logsRes.error) throw logsRes.error
      if (notesRes.error) throw notesRes.error
      setMealSlots(slotsRes.data || [])
      setFoodItems(foodsRes.data || [])
      setMealLogs(logsRes.data || [])
      setNotes(notesRes.data || [])
    } catch (err) {
      console.error('Failed to load clinician data:', err)
      setError('Could not load the board. Please refresh.')
    } finally {
      setLoading(false)
    }
  }
```

Replace with:

```javascript
  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [slotsRes, foodsRes, logsRes] = await Promise.all([
        supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase.from('meal_logs')
          .select('*, meal_slots!inner(family_id)')
          .eq('meal_slots.family_id', DEMO_FAMILY_ID)
          .order('logged_at', { ascending: false }),
      ])
      if (slotsRes.error) throw slotsRes.error
      if (foodsRes.error) throw foodsRes.error
      if (logsRes.error) throw logsRes.error
      setMealSlots(slotsRes.data || [])
      setFoodItems(foodsRes.data || [])
      setMealLogs(logsRes.data || [])
    } catch (err) {
      console.error('Failed to load clinician data:', err)
      setError('Could not load the board. Please refresh.')
    } finally {
      setLoading(false)
    }
  }
```

- [ ] **Step 4: Remove the `clinician_notes` realtime subscription**

Find (around line 217-223):

```javascript
  useRealtime({
    table: 'clinician_notes',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setNotes(c => [row, ...c]),
    onUpdate: row => setNotes(c => c.map(n => n.id === row.id ? row : n)),
    onDelete: row => setNotes(c => c.filter(n => n.id !== row.id)),
  })
```

Delete this entire block (including the blank lines immediately before and after it, leaving exactly one blank line between the surrounding `useRealtime` blocks).

- [ ] **Step 5: Remove `handleDeleteNote` and rewrite `handleSaveNote`**

Find (around line 229-250):

```javascript
  async function handleDeleteNote(noteId) {
    setNotes(c => c.filter(n => n.id !== noteId))
    await supabase.from('clinician_notes').delete().eq('id', noteId)
  }

  async function handleSaveNote({ body, existingNoteId }) {
    if (existingNoteId) {
      const { error } = await supabase
        .from('clinician_notes')
        .update({ body })
        .eq('id', existingNoteId)
      if (error) throw error
      setNotes(c => c.map(n => n.id === existingNoteId ? { ...n, body } : n))
    } else {
      const { data, error } = await supabase
        .from('clinician_notes')
        .insert({ family_id: DEMO_FAMILY_ID, body, slot_id: null })
        .select().single()
      if (error) throw error
      setNotes(c => [data, ...c])
    }
  }
```

Replace with:

```javascript
  function handleSaveNote({ body, existingNoteId }) {
    writeClinicianNote({ body, existingNoteId })
  }
```

- [ ] **Step 6: Pass `clinicianNotes` to `NotesPanel`**

Find (around line 447-452):

```javascript
          <NotesPanel
            notes={notes}
            mode="clinician"
            onSave={handleSaveNote}
            notesReadByParent={clinicianNotesRead}
          />
```

Replace with:

```javascript
          <NotesPanel
            notes={clinicianNotes}
            mode="clinician"
            onSave={handleSaveNote}
            notesReadByParent={clinicianNotesRead}
          />
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/ClinicianView.jsx
git commit -m "feat: migrate clinician notes from Supabase to per-patient Firebase storage"
```

---

### Task 4: Manual verification in the browser

**Files:** none (manual testing only)

- [ ] **Step 1: Start the dev server (if not already running)**

Run: `npm run dev`
Expected: Vite prints `Local: http://localhost:5173/`

- [ ] **Step 2: Write a clinician note as the clinician**

Sign in (or sign up) as a **clinician**, add a patient by family code (or select an existing one from the dropdown), then use the "Clinician Notes" panel at the bottom of the dashboard to write and save a note, e.g. "Great progress this week!"
Expected: The note saves ("✓ Saved" appears), no console errors mentioning `supabase` or `clinician_notes`. Open the Firebase console → Realtime Database → Data tab → `users/{patientUid}/clinicianNotes/{noteId}` and confirm `{ id, body: "Great progress this week!", created_at }` was written.

- [ ] **Step 3: Read the note as the parent**

Sign in as the **parent** for that patient account, navigate to the Daily view (`/parent/daily`).
Expected: The "Clinician Notes" card in the right sidebar shows "Great progress this week!" with today's date, marked unread. Click "Mark as read".

- [ ] **Step 4: Confirm the clinician sees the read receipt**

Switch back to the **clinician** account.
Expected: Under the Clinician Notes panel, "✓ Parent has read this note" appears.

- [ ] **Step 5: Update the note and confirm it propagates**

As the clinician, edit the note body and save again (e.g. append " - keep it up").
Expected: "Update note" button is used (existing note), the saved note updates in Firebase at the same `noteId` (not a new entry), and the parent's Clinician Notes card shows "● Updated" until marked read again.

- [ ] **Step 6: Reload and confirm persistence**

Hard-refresh both the parent and clinician browser tabs.
Expected: Notes and read-state persist (loaded from Firebase, not lost on reload).

- [ ] **Step 7: Commit (if any fixes were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during clinician notes migration verification"
```
(Only run this step if Steps 1-6 verification required code changes. Otherwise skip.)

---

## Follow-up Plans (not part of this plan)

- **Phase 2b:** Migrate `appointments` (currently `ClinicianView.jsx`'s `handleScheduleAppointment` — an insert-only Supabase call with no read/subscribe) to Firebase, e.g. `users/{patientUid}/appointments/{id}`.
- **Phase 2c:** Migrate `meal_slots`, `meal_logs`, and the remaining `food_items` Supabase usage (the weekly-plan grid, separate from the Phase-1-migrated "Our Foods" sidebar) to Firebase. This is the largest remaining piece — it touches `ParentView.jsx`, `ClinicianView.jsx`, `DailyView.jsx`, `MealLogModal.jsx`, `WeeklyGrid.jsx`, `WeeklyInsights.jsx`, `WeeklyGoals.jsx`, and `SupplementChecklist.jsx`.
- **Phase 3:** Once Phase 2 is complete and no component imports `src/lib/supabase.js`, delete `src/pages/Login.jsx` (dead route, superseded by `LoginScreen.jsx`), `src/hooks/useRealtime.js`, `src/lib/supabase.js`, `src/contexts/RealtimeContext.jsx` (and its usage in `App.jsx`/`ParentView.jsx`/`ClinicianView.jsx`), remove `@supabase/supabase-js` from `package.json`, and remove `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from `.env`.
