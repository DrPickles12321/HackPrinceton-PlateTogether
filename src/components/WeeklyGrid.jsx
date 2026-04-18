import { Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat', isWeekend: true },
  { key: 'sun', label: 'Sun', isWeekend: true },
]

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { key: 'lunch',     label: 'Lunch',     icon: '🥗' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙' },
  { key: 'snack',     label: 'Snack',     icon: '🍎' },
]

const DAY_LABELS_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const SLOT_BASE = 'border rounded-lg p-2 min-h-[80px] transition-colors duration-150 relative'
const STATUS_DOT = { okay: 'bg-green-500', difficult: 'bg-yellow-500', refused: 'bg-red-500' }

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

function ParentMealSlot({ slot, foodName, onSlotClick, isWeekend }) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id || `empty-${slot.day}-${slot.meal_type}`,
    data: { slot },
  })
  const filled = !!slot.assigned_food_id

  return (
    <div
      ref={setNodeRef}
      onClick={() => filled && onSlotClick(slot)}
      onKeyDown={e => filled && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSlotClick(slot))}
      role={filled ? 'button' : undefined}
      tabIndex={filled ? 0 : undefined}
      aria-label={filled ? `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, ${foodName}. Click to log meal.` : `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, empty. Drag a food here.`}
      className={`${SLOT_BASE}
        ${isWeekend ? 'bg-blue-50/30' : 'bg-white'}
        ${filled ? 'cursor-pointer hover:bg-gray-50 hover:shadow-md' : 'border-dashed border-gray-300 cursor-default'}
        ${isOver ? '!bg-blue-100 !border-blue-400 border-2' : 'border-gray-200'}
      `}
    >
      {filled
        ? <span className="text-sm text-gray-900 leading-tight break-words pr-4 block">{foodName}</span>
        : <div className="flex items-center justify-center h-full text-gray-400 text-xs pt-4">+ drag food</div>
      }
    </div>
  )
}

function ClinicianMealSlot({ slot, foodName, latestLog, isWeekend }) {
  const filled = !!slot.assigned_food_id
  return (
    <div
      aria-label={filled ? `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, ${foodName}` : `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, empty`}
      className={`${SLOT_BASE} cursor-default
        ${isWeekend ? 'bg-blue-50/30' : 'bg-white'}
        ${filled ? 'border-gray-200' : 'border-dashed border-gray-200'}
      `}
    >
      {filled
        ? <span className="text-sm text-gray-900 leading-tight break-words pr-4 block">{foodName}</span>
        : <div className="flex items-center justify-center h-full text-gray-300 text-xs pt-4">—</div>
      }
      {filled && <StatusBadge log={latestLog} />}
    </div>
  )
}

export default function WeeklyGrid({ mealSlots, foodItems, mode = 'parent', onSlotClick, latestLogBySlot = {} }) {
  function getSlot(day, mealType) {
    return mealSlots.find(s => s.day === day && s.meal_type === mealType)
      || { id: null, day, meal_type: mealType, assigned_food_id: null }
  }
  function getFoodName(foodId) {
    if (!foodId) return ''
    return foodItems.find(f => f.id === foodId)?.name || '(unknown)'
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[720px]">
          {/* Sticky header */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2 sticky top-[60px] bg-white z-10 pb-2">
            <div />
            {DAYS.map(day => (
              <div key={day.key} className={`text-center text-xs font-semibold uppercase tracking-wide py-2 rounded ${day.isWeekend ? 'bg-blue-50 text-blue-900' : 'text-gray-600'}`}>
                {day.label}
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map(meal => (
            <div key={meal.key} className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <span aria-hidden="true">{meal.icon}</span>
                <span>{meal.label}</span>
              </div>
              {DAYS.map(day => {
                const slot = getSlot(day.key, meal.key)
                const foodName = getFoodName(slot.assigned_food_id)
                return mode === 'clinician' ? (
                  <ClinicianMealSlot
                    key={`${day.key}-${meal.key}`}
                    slot={slot}
                    foodName={foodName}
                    latestLog={slot.id ? latestLogBySlot[slot.id] : null}
                    isWeekend={day.isWeekend}
                  />
                ) : (
                  <ParentMealSlot
                    key={slot.id || `${day.key}-${meal.key}`}
                    slot={slot}
                    foodName={foodName}
                    onSlotClick={onSlotClick}
                    isWeekend={day.isWeekend}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
