# Food Catalog Firebase Migration (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the food catalog ("Our Foods" sidebar — `food_items`) from the shared/demo Supabase table to per-user Firebase Realtime Database storage, removing the first of several Supabase dependencies.

**Architecture:** Add a `foodItems` collection and CRUD functions to `FirebaseDataContext` (mirroring the existing `prescribedSupplements`/`savedClinicianNotes` patterns: `onValue` subscription + `set()` writes keyed by `uid`). Rewrite `FoodSidebar.jsx` to consume `useFirebaseData()` instead of `supabase`. This is Phase 1 of a 3-phase plan:
- **Phase 1 (this plan):** Food catalog (`food_items` → `users/{uid}/foodItems`)
- **Phase 2 (future plan):** `meal_slots`, `meal_logs`, `clinician_notes`, `appointments` → Firebase
- **Phase 3 (future plan):** Delete dead code — `src/pages/Login.jsx`, `src/hooks/useRealtime.js`, `src/lib/supabase.js`, `src/contexts/RealtimeContext.jsx`, `@supabase/supabase-js` dependency, Supabase env vars

**Tech Stack:** React 19, Firebase Realtime Database (`firebase/database`), Vite. No automated test runner is configured for this app (`package.json` has no `test` script) — verification is manual via the dev server in the browser.

---

## File Structure

- **Modify:** `src/contexts/FirebaseDataContext.jsx` — add `foodItems` state, `onValue` subscription, and `addFoodItem`/`deleteFoodItem`/`updateFoodItemCategory` functions; export them from the context value.
- **Modify:** `src/components/FoodSidebar.jsx` — replace all `supabase` calls with `useFirebaseData()` equivalents; remove `DEMO_FAMILY_ID` import.

No new files. Both files already exist and are read in full below where relevant.

---

### Task 1: Add `foodItems` to FirebaseDataContext

**Files:**
- Modify: `src/contexts/FirebaseDataContext.jsx`

- [ ] **Step 1: Add `foodItems` state**

In `src/contexts/FirebaseDataContext.jsx`, find the "Own user data" state block (around line 68-75):

```javascript
  // ── Own user data ──────────────────────────────────────────────────────────
  const [fbMealData, setFbMealData]                   = useState({})
  const [ownNutritionalTargets, setOwnNutritionalTargets] = useState(DEFAULT_TARGETS)
  const [parentNotesByDate, setParentNotesByDate]     = useState({})
  const [mealTimes, setMealTimes]                     = useState(DEFAULT_MEAL_TIMES)
  const [supplementLog, setSupplementLog]             = useState({})
  const [clinicianNotesRead, setClinicianNotesRead]   = useState({})
  const [savedClinicianNotes, setSavedClinicianNotes] = useState([])
  const [familyCode, setFamilyCode]                   = useState(null)
```

Add a new `foodItems` state right after `savedClinicianNotes`:

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

- [ ] **Step 2: Reset `foodItems` when logged out**

In the same file, find the `if (!uid) { ... return }` block inside the "Subscribe to own data" `useEffect` (around line 88-100):

```javascript
    if (!uid) {
      setFbMealData({})
      setOwnNutritionalTargets(DEFAULT_TARGETS)
      setParentNotesByDate({})
      setMealTimes(DEFAULT_MEAL_TIMES)
      setSupplementLog({})
      setClinicianNotesRead({})
      setSavedClinicianNotes([])
      setFamilyCode(null)
      setPatients([])
      setViewingPatientUid(null)
      setOwnPrescribedSupplements([])
      return
    }
```

Add `setFoodItems([])` to the list:

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

- [ ] **Step 3: Subscribe to `foodItems` from the database**

In the same `useEffect`, find the `savedClinicianNotes` subscription (around line 143-146):

```javascript
    unsubs.push(onValue(ref(db, `${base}/savedClinicianNotes`), snap => {
      const val = snap.val()
      setSavedClinicianNotes(val ? Object.values(val) : [])
    }))
```

Add a new subscription for `foodItems` right after it:

```javascript
    unsubs.push(onValue(ref(db, `${base}/savedClinicianNotes`), snap => {
      const val = snap.val()
      setSavedClinicianNotes(val ? Object.values(val) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/foodItems`), snap => {
      const val = snap.val()
      setFoodItems(val ? Object.values(val) : [])
    }))
```

- [ ] **Step 4: Add `addFoodItem`, `deleteFoodItem`, `updateFoodItemCategory` functions**

Find the `unsaveClinicianNote` function (around line 317-321):

```javascript
  function unsaveClinicianNote(noteId) {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes/${noteId}`), null)
    setSavedClinicianNotes(prev => prev.filter(n => n.id !== noteId))
  }
```

Add the three new functions right after it:

```javascript
  function unsaveClinicianNote(noteId) {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes/${noteId}`), null)
    setSavedClinicianNotes(prev => prev.filter(n => n.id !== noteId))
  }

  function addFoodItem({ name, category }) {
    if (!uid) return
    const id = crypto.randomUUID()
    const food = { id, name, category }
    set(ref(db, `users/${uid}/foodItems/${id}`), food)
    setFoodItems(prev => [...prev, food])
  }

  function deleteFoodItem(id) {
    if (!uid) return
    set(ref(db, `users/${uid}/foodItems/${id}`), null)
    setFoodItems(prev => prev.filter(f => f.id !== id))
  }

  function updateFoodItemCategory(id, category) {
    if (!uid) return
    set(ref(db, `users/${uid}/foodItems/${id}/category`), category)
    setFoodItems(prev => prev.map(f => f.id === id ? { ...f, category } : f))
  }
```

- [ ] **Step 5: Export the new state and functions from the context**

Find the `FirebaseDataContext.Provider` value object (around line 352-381). Add `foodItems`, `addFoodItem`, `deleteFoodItem`, `updateFoodItemCategory` to it:

```javascript
    <FirebaseDataContext.Provider value={{
      allMealItems,
      mealStatuses,
      nutritionalTargets,
      saveNutritionalTargets,
      parentNotesByDate,
      parentNotesArray,
      saveParentNote,
      markParentNoteReadById,
      markPatientParentNoteReadById,
      mealTimes,
      updateMealTime,
      supplementLog,
      toggleSupplement,
      clinicianNotesRead,
      markClinicianNoteRead,
      savedClinicianNotes,
      saveClinicianNote,
      unsaveClinicianNote,
      clearAllSavedNotes,
      setMealItems,
      setMealStatus,
      familyCode,
      patients,
      prescribedSupplements,
      savePrescribedSupplements,
      viewingPatientUid,
      setViewingPatientUid,
      addPatientByCode,
      foodItems,
      addFoodItem,
      deleteFoodItem,
      updateFoodItemCategory,
    }}>
```

- [ ] **Step 6: Commit**

```bash
git add src/contexts/FirebaseDataContext.jsx
git commit -m "feat: add per-user food catalog to FirebaseDataContext"
```

---

### Task 2: Migrate FoodSidebar.jsx off Supabase

**Files:**
- Modify: `src/components/FoodSidebar.jsx`

- [ ] **Step 1: Replace imports**

At the top of `src/components/FoodSidebar.jsx`, replace:

```javascript
import { useState, useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import AddFoodInput from './AddFoodInput'
```

with:

```javascript
import { useState, useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import AddFoodInput from './AddFoodInput'
```

(`useEffect` stays — `FoodCard` still uses it internally for its own menu.)

- [ ] **Step 2: Replace the `FoodSidebar` component body**

Find the `FoodSidebar` component (the last function in the file, currently lines 196-254):

```javascript
export default function FoodSidebar() {
  const [foods, setFoods] = useState([])

  useEffect(() => {
    supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID)
      .then(({ data }) => { if (data) setFoods(data) })

    const ch = supabase.channel('sidebar_food_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_items', filter: `family_id=eq.${DEMO_FAMILY_ID}` }, payload => {
        if (payload.eventType === 'INSERT') setFoods(f => [...f, payload.new])
        if (payload.eventType === 'DELETE') setFoods(f => f.filter(x => x.id !== payload.old.id))
        if (payload.eventType === 'UPDATE') setFoods(f => f.map(x => x.id === payload.new.id ? payload.new : x))
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  async function handleAddFood({ name, category }) {
    const optimistic = { id: crypto.randomUUID(), family_id: DEMO_FAMILY_ID, name, category }
    setFoods(f => [...f, optimistic])
    const { data } = await supabase.from('food_items').insert({ family_id: DEMO_FAMILY_ID, name, category }).select().single()
    if (data) setFoods(f => f.map(x => x.id === optimistic.id ? data : x))
  }

  async function handleDelete(food) {
    setFoods(f => f.filter(x => x.id !== food.id))
    await supabase.from('food_items').delete().eq('id', food.id)
  }

  async function handleChangeCategory(food, newCategory) {
    setFoods(f => f.map(x => x.id === food.id ? { ...x, category: newCategory } : x))
    await supabase.from('food_items').update({ category: newCategory }).eq('id', food.id)
  }

  const existingNames = foods.map(f => f.name)

  return (
    <div style={{ padding: '20px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="font-lora" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-dark)', marginBottom: 14 }}>
        Our Foods
      </h2>
      <div style={{ marginBottom: 16 }}>
        <AddFoodInput onAddFood={handleAddFood} existingFoodNames={existingNames} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CATEGORIES.map(cfg => (
          <Section
            key={cfg.key}
            config={cfg}
            foods={foods.filter(f => f.category === cfg.key)}
            onDelete={handleDelete}
            onChangeCategory={handleChangeCategory}
          />
        ))}
      </div>
    </div>
  )
}
```

Replace it with:

```javascript
export default function FoodSidebar() {
  const { foodItems, addFoodItem, deleteFoodItem, updateFoodItemCategory } = useFirebaseData()

  function handleAddFood({ name, category }) {
    addFoodItem({ name, category })
  }

  function handleDelete(food) {
    deleteFoodItem(food.id)
  }

  function handleChangeCategory(food, newCategory) {
    updateFoodItemCategory(food.id, newCategory)
  }

  const existingNames = foodItems.map(f => f.name)

  return (
    <div style={{ padding: '20px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="font-lora" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-dark)', marginBottom: 14 }}>
        Our Foods
      </h2>
      <div style={{ marginBottom: 16 }}>
        <AddFoodInput onAddFood={handleAddFood} existingFoodNames={existingNames} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CATEGORIES.map(cfg => (
          <Section
            key={cfg.key}
            config={cfg}
            foods={foodItems.filter(f => f.category === cfg.key)}
            onDelete={handleDelete}
            onChangeCategory={handleChangeCategory}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/FoodSidebar.jsx
git commit -m "feat: migrate food sidebar from Supabase to per-user Firebase storage"
```

---

### Task 3: Manual verification in the browser

**Files:** none (manual testing only)

- [ ] **Step 1: Start the dev server (if not already running)**

Run: `npm run dev`
Expected: Vite prints `Local: http://localhost:5173/`

- [ ] **Step 2: Sign in and check the food sidebar loads empty**

In the browser, go to `http://localhost:5173/`, sign in (or sign up) as a **parent**, and navigate to the Daily view (`/parent/daily`).
Expected: The left "Our Foods" sidebar renders with three empty sections (Familiar, Working On, Challenge) and no console errors mentioning `supabase`.

- [ ] **Step 3: Add a food item**

Use the "Add Food" input to add a food, e.g. "Apple" under "Familiar".
Expected: "Apple" appears immediately in the Familiar section. Open the Firebase console → Realtime Database → Data tab → `users/{your-uid}/foodItems/{id}` and confirm `{ id, name: "Apple", category: "familiar" }` was written.

- [ ] **Step 4: Move and delete a food item**

Use the `⋮` menu to move "Apple" to "Working On", then delete it.
Expected: The food moves sections immediately, and after deleting, it disappears from the sidebar and from `users/{your-uid}/foodItems` in the Firebase console.

- [ ] **Step 5: Reload and confirm persistence**

Hard-refresh the browser page.
Expected: Any remaining food items still appear in the sidebar (persisted via Firebase, not lost on reload).

- [ ] **Step 6: Commit (if any fixes were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during food catalog migration verification"
```
(Only run this step if Step 1-5 verification required code changes. Otherwise skip.)

---

## Follow-up Plans (not part of this plan)

- **Phase 2:** Migrate `meal_slots`, `meal_logs`, `clinician_notes`, and `appointments` from Supabase to Firebase, updating `ParentView.jsx`, `ClinicianView.jsx`, `DailyView.jsx`, `WeeklyView.jsx`, and `MealLogModal.jsx` accordingly. This is the larger, more invasive phase since `ParentView`/`ClinicianView` currently load and realtime-subscribe to four Supabase tables each.
- **Phase 3:** Once Phase 2 is complete and no component imports `src/lib/supabase.js`, delete `src/pages/Login.jsx` (dead route, superseded by `LoginScreen.jsx`), `src/hooks/useRealtime.js`, `src/lib/supabase.js`, `src/contexts/RealtimeContext.jsx` (and its usage in `App.jsx`/`ParentView.jsx`/`ClinicianView.jsx`), remove `@supabase/supabase-js` from `package.json`, and remove `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from `.env`.
