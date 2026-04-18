import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

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
  { key: 'breakfast', label: 'B', full: 'Breakfast', icon: '☀️' },
  { key: 'lunch',     label: 'L', full: 'Lunch',     icon: '🥗' },
  { key: 'snack',     label: 'S', full: 'Snack',     icon: '🍎' },
  { key: 'dinner',    label: 'D', full: 'Dinner',    icon: '🌙' },
]

const STATUS_STYLE = {
  okay:      { bg: '#E2EEE8', text: '#3A7A58',  dot: '#5EA87A', label: 'Okay'      },
  difficult: { bg: '#F5EDD8', text: '#8A6018',  dot: '#C09040', label: 'Difficult' },
  refused:   { bg: '#F0E0E8', text: '#8A3858',  dot: '#B86080', label: 'Refused'   },
  empty:     { bg: '#F7F2EC', text: '#B09880',  dot: null,      label: ''          },
}

export default function WeeklyView() {
  const { mealSlots, foodItems, mealLogs } = useOutletContext()

  const latestLogBySlot = useMemo(() => {
    const map = {}
    for (const log of [...mealLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))) {
      map[log.meal_slot_id] = log
    }
    return map
  }, [mealLogs])

  function getSlot(day, mealType) {
    return mealSlots.find(s => s.day === day && s.meal_type === mealType) || null
  }

  function getFoodName(foodId) {
    return foodItems.find(f => f.id === foodId)?.name || null
  }

  const totalLogged = mealLogs.length
  const okayCount = mealLogs.filter(l => l.status === 'okay').length
  const pct = totalLogged > 0 ? Math.round((okayCount / totalLogged) * 100) : 0

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
          <div>
            <h2 className="font-lora" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text-dark)', marginBottom: 5, lineHeight: 1.15 }}>
              This Week at a Glance
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>Color overview of how each meal went</p>
          </div>
          {totalLogged > 0 && (
            <div style={{
              background: 'white', borderRadius: 16, padding: '12px 20px',
              border: '1.5px solid var(--mint-mid)', textAlign: 'center',
              boxShadow: '0 2px 10px rgba(72,122,103,0.12)',
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--mint)', lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 3, fontWeight: 500 }}>okay meals</div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['okay', 'difficult', 'refused']).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 22, height: 14, borderRadius: 5,
                background: STATUS_STYLE[s].bg,
                border: `1.5px solid ${STATUS_STYLE[s].dot}40`,
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500 }}>
                {STATUS_STYLE[s].label}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 22, height: 14, borderRadius: 5,
              background: STATUS_STYLE.empty.bg, border: '1.5px dashed var(--border-mid)',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500 }}>Not logged</span>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          background: 'white', borderRadius: 20,
          border: '1.5px solid var(--border)',
          boxShadow: '0 4px 20px rgba(39,23,6,0.07)',
          overflow: 'hidden',
        }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
            borderBottom: '1.5px solid var(--border)',
            background: 'var(--surface-warm)',
          }}>
            <div />
            {DAYS.map(day => (
              <div key={day.key} style={{
                padding: '13px 6px', textAlign: 'center',
                fontSize: 12, fontWeight: 600, color: 'var(--text-mid)',
                borderLeft: '1px solid var(--border)',
                letterSpacing: '0.2px',
              }}>
                {day.label}
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {MEALS.map((meal, mi) => (
            <div key={meal.key} style={{
              display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
              borderBottom: mi < MEALS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              {/* Meal label */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '8px 4px', gap: 4,
                borderRight: '1px solid var(--border)', background: 'var(--surface-warm)',
              }}>
                <span style={{ fontSize: 16 }}>{meal.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--text-light)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{meal.label}</span>
              </div>

              {/* Day cells */}
              {DAYS.map(day => {
                const slot = getSlot(day.key, meal.key)
                const log  = slot?.id ? latestLogBySlot[slot.id] : null
                const s    = STATUS_STYLE[log?.status || 'empty']
                const foodName = slot ? getFoodName(slot.assigned_food_id) : null
                const hasDot = s.dot !== null

                return (
                  <div
                    key={day.key}
                    title={[foodName, log ? s.label : null].filter(Boolean).join(' · ') || 'No food assigned'}
                    style={{
                      background: s.bg,
                      borderLeft: '1px solid var(--border)',
                      minHeight: 70,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', gap: 5, padding: 8,
                    }}
                  >
                    {hasDot && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot }} />
                    )}
                    {foodName ? (
                      <span style={{
                        fontSize: 10, color: s.text, textAlign: 'center',
                        lineHeight: 1.3, fontWeight: 500,
                        overflow: 'hidden', maxWidth: '100%',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {foodName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--border-mid)', fontWeight: 300 }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
