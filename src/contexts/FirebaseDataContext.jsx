import { createContext, useContext, useEffect, useState } from 'react'
import { ref, onValue, set, update } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from './AuthContext'

const FirebaseDataContext = createContext(null)

const DEFAULT_TARGETS = { protein: 95, carbs: 145, fruitsVeggies: 225 }
const DEFAULT_MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', snack: '15:30', dinner: '19:00' }

// Firebase stores arrays as {0: x, 1: y} — convert back
function fbToArr(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return Object.values(val)
}

export function FirebaseDataProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid || null

  // Raw Firebase state
  const [fbMealData, setFbMealData]           = useState({})   // {date: {mealType: {items, status}}}
  const [nutritionalTargets, setNutritionalTargets] = useState(DEFAULT_TARGETS)
  const [parentNotesByDate, setParentNotesByDate]   = useState({})
  const [mealTimes, setMealTimes]             = useState(DEFAULT_MEAL_TIMES)
  const [supplementLog, setSupplementLog]     = useState({})   // {date: string[]}
  const [clinicianNotesRead, setClinicianNotesRead] = useState({})
  const [savedClinicianNotes, setSavedClinicianNotes] = useState([])

  useEffect(() => {
    if (!uid) {
      // Reset all state on logout
      setFbMealData({})
      setNutritionalTargets(DEFAULT_TARGETS)
      setParentNotesByDate({})
      setMealTimes(DEFAULT_MEAL_TIMES)
      setSupplementLog({})
      setClinicianNotesRead({})
      setSavedClinicianNotes([])
      return
    }

    const base = `users/${uid}`
    const unsubs = []

    // mealLogs: items + status per date/mealType
    unsubs.push(onValue(ref(db, `${base}/mealLogs`), snap => {
      const val = snap.val() || {}
      const normalized = {}
      for (const [date, meals] of Object.entries(val)) {
        normalized[date] = {}
        for (const [mealType, data] of Object.entries(meals || {})) {
          normalized[date][mealType] = {
            items:  fbToArr(data?.items),
            status: data?.status || null,
          }
        }
      }
      setFbMealData(normalized)
    }))

    // nutritionalTargets
    unsubs.push(onValue(ref(db, `${base}/nutritionalTargets`), snap => {
      const val = snap.val()
      if (!val) {
        set(ref(db, `${base}/nutritionalTargets`), DEFAULT_TARGETS)
      } else {
        // Migrate old per-meal format
        setNutritionalTargets(val.breakfast ? DEFAULT_TARGETS : val)
      }
    }))

    // parentNotes
    unsubs.push(onValue(ref(db, `${base}/parentNotes`), snap => {
      setParentNotesByDate(snap.val() || {})
    }))

    // mealTimes
    unsubs.push(onValue(ref(db, `${base}/mealTimes`), snap => {
      setMealTimes(snap.val() || DEFAULT_MEAL_TIMES)
    }))

    // supplementLog
    unsubs.push(onValue(ref(db, `${base}/supplementLog`), snap => {
      const val = snap.val() || {}
      const normalized = {}
      for (const [date, items] of Object.entries(val)) {
        normalized[date] = fbToArr(items)
      }
      setSupplementLog(normalized)
    }))

    // clinicianNotesRead
    unsubs.push(onValue(ref(db, `${base}/clinicianNotesRead`), snap => {
      setClinicianNotesRead(snap.val() || {})
    }))

    // savedClinicianNotes (stored as {noteId: noteObj})
    unsubs.push(onValue(ref(db, `${base}/savedClinicianNotes`), snap => {
      const val = snap.val()
      setSavedClinicianNotes(val ? Object.values(val) : [])
    }))

    return () => unsubs.forEach(u => u())
  }, [uid])

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
    if (!uid) return
    set(ref(db, `users/${uid}/nutritionalTargets`), next)
    setNutritionalTargets(next)
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

  function updateMealTime(mealType, value) {
    if (!uid) return
    const next = { ...mealTimes, [mealType]: value }
    set(ref(db, `users/${uid}/mealTimes`), next)
    setMealTimes(next)
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
    const updates = {
      [`users/${uid}/clinicianNotesRead/${note.id}`]: { readAt, noteCreatedAt: note.created_at },
      [`users/${uid}/clinicianNotesRead/date:${noteDate}`]: { noteId: note.id, readAt, noteCreatedAt: note.created_at },
    }
    update(ref(db), updates)
    setClinicianNotesRead(prev => ({
      ...prev,
      [note.id]: { readAt, noteCreatedAt: note.created_at },
      ['date:' + noteDate]: { noteId: note.id, readAt, noteCreatedAt: note.created_at },
    }))
  }

  function saveClinicianNote(note) {
    if (!uid || savedClinicianNotes.some(n => n.id === note.id)) return
    const saved = { id: note.id, body: note.body, created_at: note.created_at, savedAt: new Date().toISOString() }
    set(ref(db, `users/${uid}/savedClinicianNotes/${note.id}`), saved)
    setSavedClinicianNotes(prev => [...prev, saved])
  }

  function unsaveClinicianNote(noteId) {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes/${noteId}`), null)
    setSavedClinicianNotes(prev => prev.filter(n => n.id !== noteId))
  }

  function clearAllSavedNotes() {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes`), null)
    setSavedClinicianNotes([])
  }

  // ── Derived / shaped state for backward compatibility ──────────────────────

  // {date: {mealType: item[]}}
  const allMealItems = {}
  for (const [date, meals] of Object.entries(fbMealData)) {
    allMealItems[date] = {}
    for (const [mealType, data] of Object.entries(meals)) {
      allMealItems[date][mealType] = data.items || []
    }
  }

  // {date: {mealType: status}}
  const mealStatuses = {}
  for (const [date, meals] of Object.entries(fbMealData)) {
    mealStatuses[date] = {}
    for (const [mealType, data] of Object.entries(meals)) {
      if (data.status) mealStatuses[date][mealType] = data.status
    }
  }

  const parentNotesArray = Object.values(parentNotesByDate)

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
    }}>
      {children}
    </FirebaseDataContext.Provider>
  )
}

export function useFirebaseData() {
  return useContext(FirebaseDataContext)
}
