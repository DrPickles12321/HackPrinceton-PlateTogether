import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import { useRealtime } from '../hooks/useRealtime'
import { useRealtimeStatus } from '../contexts/RealtimeContext'

const DAYS = [
  { key: 'mon', label: 'Mon', full: 'Monday' },
  { key: 'tue', label: 'Tue', full: 'Tuesday' },
  { key: 'wed', label: 'Wed', full: 'Wednesday' },
  { key: 'thu', label: 'Thu', full: 'Thursday' },
  { key: 'fri', label: 'Fri', full: 'Friday' },
  { key: 'sat', label: 'Sat', full: 'Saturday' },
  { key: 'sun', label: 'Sun', full: 'Sunday' },
]

const MEALS = [
  { key: 'breakfast', label: 'B', full: 'Breakfast', icon: '☀️' },
  { key: 'lunch',     label: 'L', full: 'Lunch',     icon: '🥗' },
  { key: 'snack',     label: 'S', full: 'Snack',     icon: '🍎' },
  { key: 'dinner',    label: 'D', full: 'Dinner',    icon: '🌙' },
]

const STATUS = {
  okay:      { bg: '#E2EEE8', dot: '#5EA87A', emoji: '😌', label: 'Okay',      textColor: '#3A7A58' },
  difficult: { bg: '#F5EDD8', dot: '#C09040', emoji: '😰', label: 'Difficult', textColor: '#8A6018' },
  refused:   { bg: '#F0E0E8', dot: '#B86080', emoji: '🙅', label: 'Refused',   textColor: '#8A3858' },
  empty:     { bg: '#F7F2EC', dot: null,       emoji: '',   label: '',           textColor: '#B09880' },
}

export default function ClinicianView() {
  const [mealSlots, setMealSlots]       = useState([])
  const [foodItems, setFoodItems]       = useState([])
  const [mealLogs, setMealLogs]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedCell, setSelectedCell] = useState(null)
  const [clinicianNote, setClinicianNote] = useState('')
  const { setStatus } = useRealtimeStatus()

  useEffect(() => {
    document.title = 'Dashboard · Plate Together'
    loadData()
    return () => setStatus('disconnected')
  }, [])

  async function loadData() {
    setLoading(true)
    const [s, f, l] = await Promise.all([
      supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID),
      supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID),
      supabase.from('meal_logs')
        .select('*, meal_slots!inner(family_id)')
        .eq('meal_slots.family_id', DEMO_FAMILY_ID)
        .order('logged_at', { ascending: false }),
    ])
    setMealSlots(s.data || [])
    setFoodItems(f.data || [])
    setMealLogs(l.data || [])
    setLoading(false)
  }

  useRealtime({ table: 'meal_slots', familyId: DEMO_FAMILY_ID,
    onInsert: r => setMealSlots(c => c.some(s => s.id === r.id) ? c : [...c, r]),
    onUpdate: r => setMealSlots(c => c.map(s => s.id === r.id ? r : s)),
    onDelete: r => setMealSlots(c => c.filter(s => s.id !== r.id)),
    onStatusChange: setStatus,
  })
  useRealtime({ table: 'meal_logs', familyId: DEMO_FAMILY_ID, filterOnFamilyId: false,
    onInsert: r => setMealLogs(c => c.some(l => l.id === r.id) ? c : [r, ...c]),
    onUpdate: r => setMealLogs(c => c.map(l => l.id === r.id ? r : l)),
    onDelete: r => setMealLogs(c => c.filter(l => l.id !== r.id)),
  })
  useRealtime({ table: 'food_items', familyId: DEMO_FAMILY_ID,
    onInsert: r => setFoodItems(c => c.some(f => f.id === r.id) ? c : [...c, r]),
    onUpdate: r => setFoodItems(c => c.map(f => f.id === r.id ? r : f)),
    onDelete: r => { setFoodItems(c => c.filter(f => f.id !== r.id)); setMealSlots(c => c.map(s => s.assigned_food_id === r.id ? { ...s, assigned_food_id: null } : s)) },
  })

  const latestLogBySlot = useMemo(() => {
    const map = {}
    for (const log of [...mealLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))) {
      map[log.meal_slot_id] = log
    }
    return map
  }, [mealLogs])

  const kpi = useMemo(() => {
    const total     = mealLogs.length
    const okay      = mealLogs.filter(l => l.status === 'okay').length
    const difficult = mealLogs.filter(l => l.status === 'difficult').length
    const refused   = mealLogs.filter(l => l.status === 'refused').length
    return {
      total, okay, difficult, refused,
      redFlags: difficult + refused,
      successRate: total > 0 ? Math.round((okay / total) * 100) : 0,
    }
  }, [mealLogs])

  function getSlot(day, meal) { return mealSlots.find(s => s.day === day && s.meal_type === meal) || null }
  function getFoodName(id) { return foodItems.find(f => f.id === id)?.name || null }

  const selSlot   = selectedCell ? getSlot(selectedCell.day, selectedCell.meal) : null
  const selLog    = selSlot?.id ? latestLogBySlot[selSlot.id] : null
  const selFood   = selSlot ? getFoodName(selSlot.assigned_food_id) : null
  const selStatus = selLog ? STATUS[selLog.status] : null

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-light)', fontSize: 14 }}>Loading dashboard…</span>
    </div>
  )

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 className="font-lora" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text-dark)', marginBottom: 4, lineHeight: 1.15 }}>
              Clinician Dashboard
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>Family Smith · This week</p>
          </div>
          <select style={{
            padding: '9px 14px', borderRadius: 12, border: '1.5px solid var(--border)',
            fontSize: 13, color: 'var(--text-dark)', background: 'white', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            boxShadow: '0 1px 4px rgba(39,23,6,0.06)',
            outline: 'none',
          }}>
            <option>Family Smith</option>
            <option>Family Garcia</option>
          </select>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Meals Logged', value: kpi.total,            color: 'var(--text-dark)', bg: 'white',              border: 'var(--border)',    shadow: 'rgba(39,23,6,0.07)' },
            { label: 'Success Rate', value: `${kpi.successRate}%`, color: 'var(--mint)',       bg: 'var(--mint-light)',  border: 'var(--mint-mid)',  shadow: 'rgba(72,122,103,0.10)' },
            { label: 'Red Flags',    value: kpi.redFlags,          color: 'var(--coral)',      bg: 'var(--coral-light)', border: 'var(--coral-mid)', shadow: 'rgba(184,85,53,0.10)' },
            { label: 'Refused',      value: kpi.refused,           color: 'var(--pink)',       bg: 'var(--pink-light)',  border: 'var(--pink-mid)',  shadow: 'rgba(174,76,106,0.10)' },
          ].map(k => (
            <div key={k.label} style={{
              background: k.bg, borderRadius: 20, padding: '22px 24px',
              border: `1.5px solid ${k.border}`,
              boxShadow: `0 3px 12px ${k.shadow}`,
            }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 7, fontFamily: "'Outfit', sans-serif" }}>
                {k.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500, letterSpacing: '0.1px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Grid + detail panel */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Weekly grid */}
          <div style={{
            flex: 1, background: 'white', borderRadius: 20,
            border: '1.5px solid var(--border)',
            boxShadow: '0 4px 18px rgba(39,23,6,0.07)', overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
              borderBottom: '1.5px solid var(--border)', background: 'var(--surface-warm)',
            }}>
              <div />
              {DAYS.map(d => (
                <div key={d.key} style={{
                  padding: '13px 6px', textAlign: 'center',
                  fontSize: 12, fontWeight: 600, color: 'var(--text-mid)',
                  borderLeft: '1px solid var(--border)',
                }}>{d.label}</div>
              ))}
            </div>

            {/* Rows */}
            {MEALS.map((meal, mi) => (
              <div key={meal.key} style={{
                display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
                borderBottom: mi < MEALS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '8px 4px', gap: 3,
                  borderRight: '1px solid var(--border)', background: 'var(--surface-warm)',
                }}>
                  <span style={{ fontSize: 15 }}>{meal.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {meal.label}
                  </span>
                </div>

                {DAYS.map(day => {
                  const slot = getSlot(day.key, meal.key)
                  const log  = slot?.id ? latestLogBySlot[slot.id] : null
                  const s    = STATUS[log?.status || 'empty']
                  const isSelected = selectedCell?.day === day.key && selectedCell?.meal === meal.key
                  const foodName = slot ? getFoodName(slot.assigned_food_id) : null

                  return (
                    <div
                      key={day.key}
                      onClick={() => setSelectedCell(isSelected ? null : { day: day.key, meal: meal.key })}
                      title={foodName ? `${foodName}${log ? ` · ${s.label}` : ''}` : undefined}
                      style={{
                        background: s.bg,
                        borderLeft: '1px solid var(--border)',
                        minHeight: 62, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 4, padding: 7,
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? `inset 0 0 0 2px var(--coral)` : 'none',
                        outline: isSelected ? 'none' : undefined,
                      }}
                    >
                      {s.dot && <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />}
                      {foodName ? (
                        <span style={{
                          fontSize: 9, color: s.textColor, textAlign: 'center', lineHeight: 1.25,
                          overflow: 'hidden', maxWidth: '100%', fontWeight: 500,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>{foodName}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--border-mid)' }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedCell ? (
            <div style={{
              width: 256, flexShrink: 0, background: 'white',
              borderRadius: 20, border: '1.5px solid var(--border)',
              padding: '20px', boxShadow: '0 6px 24px rgba(39,23,6,0.10)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              {/* Title row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>
                    {DAYS.find(d => d.key === selectedCell.day)?.full}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>
                    {MEALS.find(m => m.key === selectedCell.meal)?.full}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  style={{
                    width: 28, height: 28, borderRadius: 9, border: '1.5px solid var(--border)',
                    background: 'var(--surface-warm)', cursor: 'pointer', fontSize: 16,
                    color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    flexShrink: 0,
                  }}
                >×</button>
              </div>

              {/* Food served */}
              {selFood && (
                <div style={{ background: 'var(--surface-warm)', borderRadius: 12, padding: '11px 13px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    Food Served
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{selFood}</div>
                </div>
              )}

              {/* Status */}
              {selLog && selStatus && (
                <div style={{ background: selStatus.bg, borderRadius: 12, padding: '11px 13px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
                    Status
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 20 }}>{selStatus.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: selStatus.textColor }}>{selStatus.label}</span>
                  </div>
                </div>
              )}

              {/* Parent note */}
              {selLog?.note && (
                <div style={{ background: 'var(--peach-light)', borderRadius: 12, padding: '11px 13px', border: '1px solid var(--peach-mid)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    Parent Note
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, fontStyle: 'italic' }}>
                    "{selLog.note}"
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {selLog && (
                <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                  {new Date(selLog.logged_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </div>
              )}

              {!selLog && (
                <div style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
                  No meal log recorded yet.
                </div>
              )}

              {/* Clinician feedback */}
              <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Feedback
                </div>
                <textarea
                  value={clinicianNote}
                  onChange={e => setClinicianNote(e.target.value)}
                  placeholder="Leave a note for the family…"
                  rows={3}
                  style={{
                    width: '100%', border: '1.5px solid var(--border)',
                    borderRadius: 11, padding: '9px 11px', fontSize: 13,
                    color: 'var(--text-dark)', resize: 'none', outline: 'none',
                    fontFamily: "'Outfit', sans-serif",
                    background: 'var(--surface-warm)',
                    boxSizing: 'border-box', lineHeight: 1.55,
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--mint)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button style={{
                  marginTop: 8, width: '100%',
                  background: 'linear-gradient(135deg, var(--mint) 0%, #306050 100%)',
                  color: 'white', border: 'none', borderRadius: 11,
                  padding: '10px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  boxShadow: '0 2px 8px rgba(72,122,103,0.28)',
                }}>
                  Save Note
                </button>
              </div>
            </div>
          ) : (
            /* Empty state hint */
            <div style={{
              width: 220, flexShrink: 0, borderRadius: 20,
              border: '1.5px dashed var(--border-mid)', padding: '32px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, color: 'var(--text-light)', textAlign: 'center',
            }}>
              <span style={{ fontSize: 30 }}>👆</span>
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>Click any cell to see meal details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
