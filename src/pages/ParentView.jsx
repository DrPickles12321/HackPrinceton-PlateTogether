import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import { useToast } from '../hooks/useToast'
import { useRealtime } from '../hooks/useRealtime'
import { useRealtimeStatus } from '../contexts/RealtimeContext'
import SupplementChecklist from '../components/SupplementChecklist'
import NotesPanel from '../components/NotesPanel'

export default function ParentView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [notes, setNotes] = useState([])
  const { showToast } = useToast()
  const { setStatus } = useRealtimeStatus()

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
      .then(({ data }) => { if (data) setNotes(data) })
    return () => setStatus('disconnected')
  }, [setStatus])

  useRealtime({
    table: 'meal_slots',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setMealSlots(c => c.some(s => s.id === row.id) ? c : [...c, row]),
    onUpdate: row => setMealSlots(c => {
      const existing = c.find(s => s.id === row.id)
      if (existing && existing.assigned_food_id === row.assigned_food_id) return c
      return c.map(s => s.id === row.id ? row : s)
    }),
    onDelete: row => setMealSlots(c => c.filter(s => s.id !== row.id)),
    onStatusChange: setStatus,
  })

  useRealtime({
    table: 'food_items',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setFoodItems(c => c.some(f => f.id === row.id) ? c : [...c, row]),
    onUpdate: row => setFoodItems(c => c.map(f => f.id === row.id ? row : f)),
    onDelete: row => {
      setFoodItems(c => c.filter(f => f.id !== row.id))
      setMealSlots(c => c.map(s => s.assigned_food_id === row.id ? { ...s, assigned_food_id: null } : s))
    },
  })

  useRealtime({
    table: 'clinician_notes',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setNotes(c => [row, ...c]),
    onUpdate: row => setNotes(c => c.map(n => n.id === row.id ? row : n)),
    onDelete: row => setNotes(c => c.filter(n => n.id !== row.id)),
  })

  async function updateMealSlot(slotId, assignedFoodId) {
    if (!slotId) throw new Error('Cannot update meal slot: slot id is required')

    const prevSlots = mealSlots
    setMealSlots(c => c.map(s => s.id === slotId ? { ...s, assigned_food_id: assignedFoodId } : s))

    const { data, error } = await supabase
      .from('meal_slots').update({ assigned_food_id: assignedFoodId }).eq('id', slotId).select().single()

    if (error) {
      setMealSlots(prevSlots)
      showToast('Could not save your meal change. Please try again.', 'error')
      throw error
    }
    if (data) {
      setMealSlots(c => c.map(s => s.id === data.id ? data : s))
    }
  }

  async function insertMealLog({ slotId, status, note }) {
    if (!slotId) throw new Error('Cannot log meal: slot has no id yet')
    if (!['okay', 'difficult', 'refused'].includes(status)) throw new Error(`Invalid status: ${status}`)

    const { data, error } = await supabase
      .from('meal_logs').insert({ meal_slot_id: slotId, status, note }).select().single()

    if (error) {
      showToast('Could not save meal log. Please try again.', 'error')
      throw error
    }
    setMealLogs(c => [...c, data])
    showToast('Meal logged!', 'success')
  }

  async function handleMarkRead(noteId) {
    setNotes(c => c.map(n => n.id === noteId ? { ...n, is_read: true } : n))
    await supabase.from('clinician_notes').update({ is_read: true }).eq('id', noteId)
  }

  async function handleDeleteNote(noteId) {
    setNotes(c => c.filter(n => n.id !== noteId))
    await supabase.from('clinician_notes').delete().eq('id', noteId)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 xl:gap-6">
        <main>
          <Outlet context={{ mealSlots, foodItems, mealLogs, updateMealSlot, insertMealLog }} />
        </main>
        <aside className="xl:sticky xl:top-[72px] xl:self-start xl:max-h-[calc(100vh-88px)] xl:overflow-y-auto space-y-4">
          <NotesPanel
            notes={notes}
            mealSlots={mealSlots}
            foodItems={foodItems}
            mode="parent"
            onSend={() => {}}
            onMarkRead={handleMarkRead}
            onDelete={handleDeleteNote}
          />
          <SupplementChecklist mealSlots={mealSlots} foodItems={foodItems} />
        </aside>
      </div>
    </div>
  )
}
