import { useState } from 'react'
import NutritionBadge from './NutritionBadge'
import ChevronButton from './ChevronButton'
import { localIsoDate } from '../lib/constants'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snack' },
]

const SLOT_BASE = 'border rounded-lg p-2 min-h-[80px] transition-colors duration-150 relative'
const STATUS_DOT = { okay: 'bg-green-500', difficult: 'bg-yellow-500', refused: 'bg-red-500', skipped: 'bg-stone-400' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TODAY_ISO = localIsoDate()

function getWeekDates(offset = 0) {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function StatusBadge({ log }) {
  if (!log) return null
  return (
    <span
      className={`absolute top-1 right-1 w-3 h-3 rounded-full ${STATUS_DOT[log.status] || ''}`}
      aria-label={`Last logged as ${log.status}`}
      title={`${log.status}${log.note ? ': ' + log.note : ''}`}
    />
  )
}

function ClinicianMealSlot({ items = [], latestLog, isWeekend }) {
  const filled = items.length > 0
  const isSkipped = !filled && latestLog?.status === 'skipped'
  return (
    <div
      className={`${SLOT_BASE} cursor-default bg-white
        ${filled ? 'border-gray-200' : 'border-dashed border-gray-200'}
      `}
    >
      {filled ? (
        <div className="space-y-1 pr-4">
          {items.map((food, i) => (
            <div key={i}>
              <span className="text-xs text-gray-900 leading-tight break-words block">{food.name}</span>
              <NutritionBadge foodName={food.name} category={food.category} mode="clinician" />
            </div>
          ))}
          {latestLog && <StatusBadge log={latestLog} />}
        </div>
      ) : isSkipped ? (
        <div className="flex items-center justify-center h-full text-stone-400 text-xs pt-4">
          Skipped
          <StatusBadge log={latestLog} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-300 text-xs pt-4">—</div>
      )}
    </div>
  )
}

export default function WeeklyGrid({ onDayClick, parentNotes = [], onMarkNoteRead, parentMealItems = {}, mealStatuses = {} }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDates = getWeekDates(weekOffset)

  const weekLabel = weekOffset === 0 ? 'This week'
    : weekOffset === -1 ? 'Last week'
    : weekOffset === 1 ? 'Next week'
    : `${MONTHS[weekDates[0].getMonth()]} ${weekDates[0].getDate()} – ${MONTHS[weekDates[6].getMonth()]} ${weekDates[6].getDate()}`

  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <ChevronButton dir="left" size={40} onClick={() => setWeekOffset(o => o - 1)} />
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: weekOffset === 0 ? '#E8735A' : '#6b7280' }}>
          {weekLabel}
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs font-semibold px-2 py-0.5 rounded border border-gray-300 text-orange-500 hover:bg-orange-50 transition-colors"
            >Today</button>
          )}
        </span>
        <ChevronButton dir="right" size={40} onClick={() => setWeekOffset(o => o + 1)} />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[720px]">
          {/* Sticky day header with dates */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2 sticky top-0 bg-white z-10 pb-2">
            <div />
            {DAYS.map((day, i) => {
              const d = weekDates[i]
              const dateIso = localIsoDate(d)
              const isToday = dateIso === TODAY_ISO
              const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}`
              const clickable = !!onDayClick
              return (
                <div
                  key={day.key}
                  onClick={clickable ? () => onDayClick(day.key, dateIso) : undefined}
                  className={[
                    'text-center py-2 rounded transition-colors',
                    isToday ? 'bg-orange-50 text-orange-600' : 'text-gray-600',
                    clickable ? 'cursor-pointer hover:bg-indigo-50 hover:text-indigo-800' : '',
                  ].join(' ')}
                  title={clickable ? `View ${day.label} nutrition` : undefined}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-orange-500' : ''}`}>{day.label}</div>
                  <div className={`text-xs mt-0.5 ${isToday ? 'text-orange-400 font-medium' : 'text-gray-400'}`}>{dateStr}</div>
                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mx-auto mt-0.5" />}
                  {clickable && !isToday && <div className="text-[9px] text-indigo-400 mt-0.5">tap for nutrition</div>}
                </div>
              )
            })}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map(meal => (
            <div key={meal.key} className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2">
              <div className="flex items-center text-sm font-medium text-gray-700">
                {meal.label}
              </div>
              {DAYS.map((day, i) => {
                const dateIso = localIsoDate(weekDates[i])
                const items = (parentMealItems[dateIso] || {})[meal.key] || []
                const status = (mealStatuses[dateIso] || {})[meal.key] || null
                return (
                  <ClinicianMealSlot
                    key={`${day.key}-${meal.key}`}
                    items={items}
                    latestLog={status ? { status } : null}
                    isWeekend={day.isWeekend}
                  />
                )
              })}
            </div>
          ))}

          {/* Parent notes row */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2 mt-1">
            <div className="flex items-center text-sm font-medium text-gray-700">
              Parent Notes
            </div>
            {DAYS.map((day, i) => {
              const dateIso = localIsoDate(weekDates[i])
              const note = parentNotes.find(n => n.date === dateIso)
              const isUnread = note && !note.read_at
              return (
                <div
                  key={day.key}
                  onClick={() => isUnread && onMarkNoteRead?.(note.id)}
                  title={note ? (isUnread ? 'Click to mark as read' : 'Already read') : undefined}
                  className={[
                    'rounded-lg p-2 border min-h-[64px] transition-colors',
                    note
                      ? isUnread
                        ? 'bg-amber-50 border-amber-300 cursor-pointer hover:bg-amber-100'
                        : 'bg-gray-50 border-gray-200 cursor-default'
                      : 'border-dashed border-gray-200 cursor-default',
                  ].join(' ')}
                >
                  {note ? (
                    <div>
                      <p className="text-xs text-gray-700 leading-snug line-clamp-3">{note.body}</p>
                      {isUnread
                        ? <span className="text-[9px] text-amber-500 mt-1 block font-semibold">● unread — click to mark read</span>
                        : <span className="text-[9px] text-green-500 mt-1 block">✓ read</span>
                      }
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300 text-xs pt-3">—</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
