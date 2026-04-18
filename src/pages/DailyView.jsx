import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import FoodSidebar from '../components/FoodSidebar'
import FoodCardPreview from '../components/FoodCardPreview'
import SupplementChecklist from '../components/SupplementChecklist'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: '☀️', time: '8:00 AM', color: 'var(--coral)', bg: 'var(--coral-light)' },
  { key: 'lunch',     label: 'Lunch',     icon: '🥗', time: '1:00 PM', color: 'var(--peach)', bg: 'var(--peach-light)' },
  { key: 'snack',     label: 'Snack',     icon: '🍎', time: '3:30 PM', color: 'var(--pink)',  bg: 'var(--pink-light)' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙', time: '7:00 PM', color: 'var(--mint)',  bg: 'var(--mint-light)' },
]

const STATUS_OPTIONS = [
  { key: 'okay',      emoji: '😌', label: 'Ok',   color: 'var(--mint)',  bg: 'var(--mint-light)' },
  { key: 'difficult', emoji: '😰', label: 'Hard', color: 'var(--peach)', bg: 'var(--peach-light)' },
  { key: 'refused',   emoji: '🙅', label: 'No',   color: 'var(--pink)',  bg: 'var(--pink-light)' },
]

function getTodayKey() {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[new Date().getDay()]
}

function DropZone({ slot, food }) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot?.id || `empty-${slot?.day}-${slot?.meal_type}`,
    data: { slot },
  })
  const filled = !!slot?.assigned_food_id

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, minHeight: 48, borderRadius: 12,
        border: filled
          ? '1.5px solid var(--border-mid)'
          : `2px dashed ${isOver ? 'var(--coral)' : 'var(--border-mid)'}`,
        background: isOver ? 'var(--coral-light)' : (filled ? 'var(--surface-warm)' : 'transparent'),
        display: 'flex', alignItems: 'center', padding: '0 14px',
        transition: 'all 0.15s',
      }}
    >
      {filled ? (
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-dark)' }}>{food?.name || '—'}</span>
      ) : (
        <span style={{ fontSize: 12, color: isOver ? 'var(--coral)' : 'var(--text-light)' }}>
          {isOver ? 'Drop here ↓' : '+ drag a food here'}
        </span>
      )}
    </div>
  )
}

function MealCard({ meal, slot, food, latestLog, onQuickLog }) {
  const loggedStatus = latestLog?.status || null

  return (
    <div style={{
      background: 'white', borderRadius: 18,
      border: '1.5px solid var(--border)',
      boxShadow: '0 2px 12px rgba(39,23,6,0.06)',
      overflow: 'hidden',
    }}>
      {/* Colored header strip */}
      <div style={{
        background: meal.bg, padding: '12px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 17 }}>{meal.icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: meal.color }}>{meal.label}</span>
        </div>
        <span style={{ fontSize: 12, color: meal.color, opacity: 0.6, fontWeight: 500 }}>{meal.time}</span>
      </div>

      {/* Body: drop zone + status buttons */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <DropZone slot={slot} food={food} />

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {STATUS_OPTIONS.map(opt => {
            const selected = loggedStatus === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => slot?.id && onQuickLog(slot, opt.key)}
                disabled={!slot?.id || !slot?.assigned_food_id}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '7px 11px', borderRadius: 10,
                  border: `1.5px solid ${selected ? opt.color : 'var(--border)'}`,
                  background: selected ? opt.bg : 'white',
                  cursor: slot?.assigned_food_id ? 'pointer' : 'default',
                  opacity: slot?.assigned_food_id ? 1 : 0.38,
                  transition: 'all 0.15s', minWidth: 50,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: selected ? opt.color : 'var(--text-light)' }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function DailyView() {
  const { mealSlots, foodItems, mealLogs, updateMealSlot, insertMealLog } = useOutletContext()
  const [selectedDay, setSelectedDay] = useState(getTodayKey)
  const [activeDrag, setActiveDrag] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function getSlot(mealType) {
    return mealSlots.find(s => s.day === selectedDay && s.meal_type === mealType)
      || { id: null, day: selectedDay, meal_type: mealType, assigned_food_id: null }
  }

  function getFoodById(id) { return foodItems.find(f => f.id === id) || null }

  function getLatestLog(slotId) {
    if (!slotId) return null
    return [...mealLogs]
      .filter(l => l.meal_slot_id === slotId)
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))[0] || null
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveDrag(null)
    if (!over) return
    const food = active.data.current?.food
    const slot = over.data.current?.slot
    if (!food || !slot?.id) return
    await updateMealSlot(slot.id, food.id)
  }

  async function handleQuickLog(slot, status) {
    if (!slot?.id) return
    try { await insertMealLog({ slotId: slot.id, status, note: null }) } catch {}
  }

  const todayKey = getTodayKey()

  return (
    <DndContext
      sensors={sensors}
      onDragStart={e => { const f = e.active.data.current?.food; if (f) setActiveDrag(f) }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* Left sidebar — food library */}
        <aside style={{
          width: 272, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          background: 'white',
        }}>
          <FoodSidebar />
        </aside>

        {/* Center — day picker + meal cards */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>

          {/* Day selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', gap: 4,
              background: 'white',
              borderRadius: 16, padding: 4,
              border: '1.5px solid var(--border)',
              boxShadow: '0 2px 8px rgba(39,23,6,0.05)',
            }}>
              {DAYS.map(day => {
                const isToday = day.key === todayKey
                const isSelected = day.key === selectedDay
                return (
                  <button
                    key={day.key}
                    onClick={() => setSelectedDay(day.key)}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 12,
                      border: 'none',
                      background: isSelected
                        ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)'
                        : 'transparent',
                      color: isSelected ? 'white' : isToday ? 'var(--text-mid)' : 'var(--text-light)',
                      fontWeight: isSelected ? 600 : isToday ? 500 : 400,
                      fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                      position: 'relative',
                      boxShadow: isSelected ? '0 2px 8px rgba(184,85,53,0.3)' : 'none',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {day.label}
                    {isToday && !isSelected && (
                      <span style={{
                        position: 'absolute', bottom: 4, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 3, height: 3, borderRadius: '50%',
                        background: 'var(--coral)',
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Meal cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MEALS.map(meal => {
              const slot = getSlot(meal.key)
              return (
                <MealCard
                  key={meal.key}
                  meal={meal}
                  slot={slot}
                  food={getFoodById(slot?.assigned_food_id)}
                  latestLog={getLatestLog(slot?.id)}
                  onQuickLog={handleQuickLog}
                />
              )
            })}
          </div>

          <p style={{
            fontSize: 11, color: 'var(--text-light)', lineHeight: 1.6,
            borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 28,
          }}>
            This tool supports meal planning between families and their care team. Not a substitute for medical advice.
          </p>
        </main>

        {/* Right — notes panel */}
        <aside style={{
          width: 214, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          padding: '24px 18px',
          overflowY: 'auto',
          background: 'white',
        }}>
          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
              margin: '0 auto 10px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16,
              boxShadow: '0 3px 10px rgba(184,85,53,0.28)',
            }}>P</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>Parent</div>
          </div>

          {/* Clinician read badge */}
          <div style={{
            background: 'var(--mint-light)', borderRadius: 12, padding: '9px 12px',
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--mint-mid)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 500 }}>Clinician read</span>
          </div>

          {/* Clinician notes */}
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 9,
            }}>Clinician Notes</div>
            <div style={{
              background: 'var(--peach-light)', borderRadius: 14, padding: '13px',
              fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, fontStyle: 'italic',
              border: '1px solid var(--peach-mid)',
            }}>
              "Great progress this week on identifying patterns!"
            </div>
          </div>

          {/* Quick stats */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 9,
            }}>This Week</div>
            {[
              { label: 'Okay',     count: mealLogs.filter(l => l.status === 'okay').length,      color: 'var(--mint)',  bg: 'var(--mint-light)',  border: 'var(--mint-mid)' },
              { label: 'Difficult',count: mealLogs.filter(l => l.status === 'difficult').length,  color: 'var(--peach)', bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
              { label: 'Refused',  count: mealLogs.filter(l => l.status === 'refused').length,    color: 'var(--pink)',  bg: 'var(--pink-light)',  border: 'var(--pink-mid)' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 11px', borderRadius: 10, background: s.bg,
                marginBottom: 7, border: `1px solid ${s.border}`,
              }}>
                <span style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.count}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <SupplementChecklist mealSlots={mealSlots} foodItems={foodItems} />
          </div>
        </aside>
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
        {activeDrag ? <FoodCardPreview name={activeDrag.name} category={activeDrag.category} floating /> : null}
      </DragOverlay>
    </DndContext>
  )
}
