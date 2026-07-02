import { createContext, useContext, useEffect, useState } from 'react'
import { ref, onValue, set, update, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import { fetchFoodInfo } from '../lib/foodData'

const FirebaseDataContext = createContext(null)

const DEFAULT_TARGETS = { protein: 75, carbs: 150, fruitsVeggies: 200 }

export const DEFAULT_MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', snack: '15:30', dinner: '19:00' }

function fbToArr(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return Object.values(val)
}

function normalizeMealData(val) {
  const result = {}
  for (const [date, meals] of Object.entries(val || {})) {
    result[date] = {}
    for (const [mealType, data] of Object.entries(meals || {})) {
      result[date][mealType] = {
        items:  fbToArr(data?.items),
        status: data?.status || null,
      }
    }
  }
  return result
}

function deriveMealItems(fbMealData) {
  const out = {}
  for (const [date, meals] of Object.entries(fbMealData)) {
    out[date] = {}
    for (const [mealType, data] of Object.entries(meals)) {
      out[date][mealType] = data.items || []
    }
  }
  return out
}

function deriveMealStatuses(fbMealData) {
  const out = {}
  for (const [date, meals] of Object.entries(fbMealData)) {
    out[date] = {}
    for (const [mealType, data] of Object.entries(meals)) {
      if (data.status) out[date][mealType] = data.status
    }
  }
  return out
}

export function FirebaseDataProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid || null

  // ── Own user data ──────────────────────────────────────────────────────────
  const [fbMealData, setFbMealData]                   = useState({})
  const [ownNutritionalTargets, setOwnNutritionalTargets] = useState(DEFAULT_TARGETS)
  const [parentNotesByDate, setParentNotesByDate]     = useState({})
  const [mealTimesByDate, setMealTimesByDate]         = useState({})
  const [supplementLog, setSupplementLog]             = useState({})
  const [clinicianNotesRead, setClinicianNotesRead]   = useState({})
  const [savedClinicianNotes, setSavedClinicianNotes] = useState([])
  const [ownClinicianNotes, setOwnClinicianNotes]     = useState([])
  const [foodItems, setFoodItems]                     = useState([])
  const [familyCode, setFamilyCode]                   = useState(null)
  const [mySos, setMySos]                             = useState([])   // parent's own SOS records

  // ── Clinician patient management ──────────────────────────────────────────
  const [patients, setPatients]                       = useState([])   // [{uid, email}]
  const [viewingPatientUid, setViewingPatientUid]     = useState(null)
  const [patientSos, setPatientSos]                   = useState([])   // viewed patient's SOS
  const [patientsWithOpenSos, setPatientsWithOpenSos] = useState({})   // { uid: true }
  const [patientFbMealData, setPatientFbMealData]     = useState({})
  const [patientMealTimesByDate, setPatientMealTimesByDate] = useState({})
  const [patientNutritionalTargets, setPatientNutritionalTargets] = useState(null)
  const [ownPrescribedSupplements, setOwnPrescribedSupplements]       = useState([])
  const [patientPrescribedSupplements, setPatientPrescribedSupplements] = useState([])
  const [patientParentNotesByDate, setPatientParentNotesByDate] = useState({})
  const [patientClinicianNotes, setPatientClinicianNotes] = useState([])

  // ── Subscribe to own data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) {
      setFbMealData({})
      setOwnNutritionalTargets(DEFAULT_TARGETS)
      setParentNotesByDate({})
      setMealTimesByDate({})
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

    const base = `users/${uid}`
    const unsubs = []

    unsubs.push(onValue(ref(db, `${base}/mealLogs`), snap => {
      setFbMealData(normalizeMealData(snap.val()))
    }))

    unsubs.push(onValue(ref(db, `${base}/nutritionalTargets`), snap => {
      const val = snap.val()
      if (!val) {
        set(ref(db, `${base}/nutritionalTargets`), DEFAULT_TARGETS)
      } else {
        setOwnNutritionalTargets(val.breakfast ? DEFAULT_TARGETS : val)
      }
    }))

    unsubs.push(onValue(ref(db, `${base}/parentNotes`), snap => {
      setParentNotesByDate(snap.val() || {})
    }))

    unsubs.push(onValue(ref(db, `${base}/mealTimes`), snap => {
      setMealTimesByDate(snap.val() || {})
    }))

    unsubs.push(onValue(ref(db, `${base}/supplementLog`), snap => {
      const val = snap.val() || {}
      const normalized = {}
      for (const [date, items] of Object.entries(val)) normalized[date] = fbToArr(items)
      setSupplementLog(normalized)
    }))

    unsubs.push(onValue(ref(db, `${base}/prescribedSupplements`), snap => {
      const val = snap.val()
      setOwnPrescribedSupplements(Array.isArray(val) ? val : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/clinicianNotesRead`), snap => {
      setClinicianNotesRead(snap.val() || {})
    }))

    unsubs.push(onValue(ref(db, `${base}/savedClinicianNotes`), snap => {
      const val = snap.val()
      setSavedClinicianNotes(val ? Object.values(val) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/clinicianNotes`), snap => {
      const val = snap.val()
      setOwnClinicianNotes(val ? Object.values(val).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/foodItems`), snap => {
      const val = snap.val()
      setFoodItems(val ? Object.values(val) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/sos`), snap => {
      const val = snap.val() || {}
      setMySos(Object.entries(val).map(([id, v]) => ({ id, ...v })))
    }))

    unsubs.push(onValue(ref(db, `${base}/familyCode`), snap => {
      setFamilyCode(snap.val() || null)
    }))

    unsubs.push(onValue(ref(db, `${base}/patients`), snap => {
      const val = snap.val() || {}
      setPatients(Object.entries(val).map(([pUid, data]) => ({
        uid:   pUid,
        email: typeof data === 'object' ? (data.email || pUid) : pUid,
      })))
    }))

    return () => unsubs.forEach(u => u())
  }, [uid])

  // ── Subscribe to selected patient data (for clinician) ────────────────────
  useEffect(() => {
    if (!viewingPatientUid) {
      setPatientFbMealData({})
      setPatientMealTimesByDate({})
      setPatientNutritionalTargets(null)
      setPatientPrescribedSupplements([])
      setPatientParentNotesByDate({})
      setPatientClinicianNotes([])
      setPatientSos([])
      return
    }
    const unsubs = []
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/mealLogs`), snap => {
      setPatientFbMealData(normalizeMealData(snap.val()))
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/mealTimes`), snap => {
      setPatientMealTimesByDate(snap.val() || {})
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
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/sos`), snap => {
      const val = snap.val() || {}
      setPatientSos(Object.entries(val).map(([id, v]) => ({ id, ...v })))
    }))
    return () => unsubs.forEach(u => u())
  }, [viewingPatientUid])

  // ── Watch every linked patient for an open SOS (patient-list badge) ────────
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

  // ── Active data (patient's when clinician is viewing, own otherwise) ───────
  const activeFbMealData       = viewingPatientUid ? patientFbMealData : fbMealData
  const activeMealTimesByDate  = viewingPatientUid ? patientMealTimesByDate : mealTimesByDate
  const nutritionalTargets     = viewingPatientUid ? patientNutritionalTargets : ownNutritionalTargets
  const allMealItems           = deriveMealItems(activeFbMealData)
  const mealStatuses           = deriveMealStatuses(activeFbMealData)
  const activeParentNotesByDate = viewingPatientUid ? patientParentNotesByDate : parentNotesByDate
  const parentNotesArray       = Object.values(activeParentNotesByDate)
  const prescribedSupplements  = viewingPatientUid ? patientPrescribedSupplements : ownPrescribedSupplements
  const clinicianNotes         = viewingPatientUid ? patientClinicianNotes : ownClinicianNotes

  // ── Write functions ────────────────────────────────────────────────────────

  function setMealItems(date, mealType, items) {
    if (!uid) return
    set(ref(db, `users/${uid}/mealLogs/${date}/${mealType}/items`), items.length ? items : null)
    setFbMealData(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [mealType]: { ...(prev[date]?.[mealType] || {}), items },
      },
    }))
  }

  function setMealStatus(date, mealType, status) {
    if (!uid) return
    if (fbMealData[date]?.[mealType]?.status === status) return
    set(ref(db, `users/${uid}/mealLogs/${date}/${mealType}/status`), status)
    setFbMealData(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [mealType]: { ...(prev[date]?.[mealType] || {}), status },
      },
    }))
  }

  function saveNutritionalTargets(next) {
    // When clinician is viewing a patient, write targets to the patient's path
    const targetUid = viewingPatientUid || uid
    if (!targetUid) return
    set(ref(db, `users/${targetUid}/nutritionalTargets`), next)
    if (viewingPatientUid) setPatientNutritionalTargets(next)
    else setOwnNutritionalTargets(next)
  }

  function saveParentNote({ date, body, existingNoteId }) {
    if (!uid) return
    const note = existingNoteId
      ? { ...(parentNotesByDate[date] || {}), body, read_at: null }
      : { id: crypto.randomUUID(), date, body, read_at: null, created_at: new Date().toISOString() }
    set(ref(db, `users/${uid}/parentNotes/${date}`), note)
    setParentNotesByDate(prev => ({ ...prev, [date]: note }))
  }

  function markParentNoteReadById(noteId) {
    if (!uid) return
    const date = Object.keys(parentNotesByDate).find(d => parentNotesByDate[d]?.id === noteId)
    if (!date) return
    const note = { ...parentNotesByDate[date], read_at: new Date().toISOString() }
    set(ref(db, `users/${uid}/parentNotes/${date}`), note)
    setParentNotesByDate(prev => ({ ...prev, [date]: note }))
  }

  function markPatientParentNoteReadById(noteId) {
    if (!viewingPatientUid) return
    const date = Object.keys(patientParentNotesByDate).find(d => patientParentNotesByDate[d]?.id === noteId)
    if (!date) return
    const note = { ...patientParentNotesByDate[date], read_at: new Date().toISOString() }
    set(ref(db, `users/${viewingPatientUid}/parentNotes/${date}`), note)
    setPatientParentNotesByDate(prev => ({ ...prev, [date]: note }))
  }

  function updateMealTime(date, mealType, value) {
    if (!uid) return
    set(ref(db, `users/${uid}/mealTimes/${date}/${mealType}`), value)
    setMealTimesByDate(prev => ({
      ...prev,
      [date]: { ...(prev[date] || {}), [mealType]: value },
    }))
  }

  function toggleSupplement(date, nutrient) {
    if (!uid) return
    const existing = new Set(supplementLog[date] || [])
    if (existing.has(nutrient)) existing.delete(nutrient)
    else existing.add(nutrient)
    const arr = Array.from(existing)
    set(ref(db, `users/${uid}/supplementLog/${date}`), arr.length ? arr : null)
    setSupplementLog(prev => ({ ...prev, [date]: arr }))
  }

  function markClinicianNoteRead(note) {
    if (!uid) return
    const readAt = new Date().toISOString()
    const noteDate = note.created_at?.slice(0, 10)
    update(ref(db), {
      [`users/${uid}/clinicianNotesRead/${note.id}`]: { readAt, noteCreatedAt: note.created_at, noteBody: note.body },
      [`users/${uid}/clinicianNotesRead/date:${noteDate}`]: { noteId: note.id, readAt, noteCreatedAt: note.created_at, noteBody: note.body },
    })
    setClinicianNotesRead(prev => ({
      ...prev,
      [note.id]: { readAt, noteCreatedAt: note.created_at, noteBody: note.body },
      ['date:' + noteDate]: { noteId: note.id, readAt, noteCreatedAt: note.created_at, noteBody: note.body },
    }))
  }

  function saveClinicianNote(note) {
    if (!uid || savedClinicianNotes.some(n => n.id === note.id)) return
    const saved = { id: note.id, body: note.body, created_at: note.created_at, savedAt: new Date().toISOString() }
    // The savedClinicianNotes onValue listener full-replaces the list from
    // Firebase's local cache during set(), so an optimistic append would dupe it.
    set(ref(db, `users/${uid}/savedClinicianNotes/${note.id}`), saved)
  }

  function unsaveClinicianNote(noteId) {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes/${noteId}`), null)
    setSavedClinicianNotes(prev => prev.filter(n => n.id !== noteId))
  }

  function addFoodItem({ name, category, group, nutrition }) {
    if (!uid) return null
    const id = crypto.randomUUID()
    const food = { id, name, category }
    // The onValue listener on foodItems replaces the full list from Firebase's
    // local cache synchronously during set(), so an optimistic append here would
    // show the item twice. Let the listener be the single source of truth.
    set(ref(db, `users/${uid}/foodItems/${id}`), food)

    if (nutrition) {
      // Already enriched (e.g. picked from a USDA search result, which may be a
      // branded product) — persist its exact macros/group immediately.
      update(ref(db, `users/${uid}/foodItems/${id}`), { ...(group ? { group } : {}), usdaNutrition: nutrition })
    } else {
      // Enrich with USDA food group + macros in the background. Best-effort:
      // failures are ignored and the UI falls back to local estimates.
      fetchFoodInfo(name)
        .then(info => {
          if (!info) return
          const patch = {}
          if (info.group) patch.group = info.group
          if (info.nutrition) patch.usdaNutrition = info.nutrition
          if (Object.keys(patch).length) update(ref(db, `users/${uid}/foodItems/${id}`), patch)
        })
        .catch(() => {})
    }
    return food
  }

  function deleteFoodItem(id) {
    if (!uid) return
    set(ref(db, `users/${uid}/foodItems/${id}`), null)
    setFoodItems(prev => prev.filter(f => f.id !== id))
  }

  // ── SOS (parent → care team) ───────────────────────────────────────────────
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

  // Manually entered nutrition override for a food (overrides the estimated
  // values from the local DB). Pass null/use reset to clear it.
  function setFoodNutrition(id, nutrition) {
    if (!uid) return
    update(ref(db, `users/${uid}/foodItems/${id}`), { nutrition })
  }

  function resetFoodNutrition(id) {
    if (!uid) return
    update(ref(db, `users/${uid}/foodItems/${id}`), { nutrition: null })
  }

  function updateFoodItemCategory(id, category) {
    if (!uid) return
    set(ref(db, `users/${uid}/foodItems/${id}/category`), category)
    setFoodItems(prev => prev.map(f => f.id === id ? { ...f, category } : f))
  }

  function clearAllSavedNotes() {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes`), null)
    setSavedClinicianNotes([])
  }

  function writeClinicianNote({ body, existingNoteId }) {
    if (!viewingPatientUid) return
    // The patientClinicianNotes onValue listener full-replaces the list from
    // Firebase's local cache during set(), so we don't optimistically mutate
    // local state here — a new-note append would otherwise show it twice.
    if (existingNoteId) {
      const existing = patientClinicianNotes.find(n => n.id === existingNoteId)
      const note = { ...existing, body }
      set(ref(db, `users/${viewingPatientUid}/clinicianNotes/${existingNoteId}`), note)
    } else {
      const note = { id: crypto.randomUUID(), body, created_at: new Date().toISOString() }
      set(ref(db, `users/${viewingPatientUid}/clinicianNotes/${note.id}`), note)
    }
  }

  function deleteClinicianNote(noteId) {
    if (!viewingPatientUid) return
    set(ref(db, `users/${viewingPatientUid}/clinicianNotes/${noteId}`), null)
    setPatientClinicianNotes(prev => prev.filter(n => n.id !== noteId))
  }

  function savePrescribedSupplements(supplements) {
    const targetUid = viewingPatientUid || uid
    if (!targetUid) return
    set(ref(db, `users/${targetUid}/prescribedSupplements`), supplements.length ? supplements : null)
    if (viewingPatientUid) setPatientPrescribedSupplements(supplements)
    else setOwnPrescribedSupplements(supplements)
  }

  async function addPatientByCode(code) {
    if (!uid) return { error: 'Not logged in' }
    const upper = code.toUpperCase().trim()
    if (!upper) return { error: 'Enter a family code' }
    const codeSnap = await get(ref(db, `familyCodes/${upper}`))
    if (!codeSnap.exists()) return { error: 'Family code not found' }
    const patientUid = codeSnap.val()
    if (patientUid === uid) return { error: "That's your own family code" }
    if (patients.some(p => p.uid === patientUid)) return { error: 'Patient already added' }
    // Establish the relationship first — the patient's email is only readable
    // once it exists, so we write addedAt, then read the email, then patch it in.
    await set(ref(db, `users/${uid}/patients/${patientUid}`), { addedAt: new Date().toISOString() })
    const emailSnap = await get(ref(db, `users/${patientUid}/email`))
    const email = emailSnap.val() || patientUid
    await set(ref(db, `users/${uid}/patients/${patientUid}/email`), email)
    return { success: true }
  }

  return (
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
      mealTimesByDate,
      activeMealTimesByDate,
      updateMealTime,
      supplementLog,
      toggleSupplement,
      clinicianNotesRead,
      markClinicianNoteRead,
      savedClinicianNotes,
      saveClinicianNote,
      unsaveClinicianNote,
      clearAllSavedNotes,
      clinicianNotes,
      writeClinicianNote,
      deleteClinicianNote,
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
      setFoodNutrition,
      resetFoodNutrition,
      mySos,
      sendSos,
      patientSos,
      patientsWithOpenSos,
      acknowledgeSos,
    }}>
      {children}
    </FirebaseDataContext.Provider>
  )
}

export function useFirebaseData() {
  return useContext(FirebaseDataContext)
}
