import { useState } from 'react'

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

export default function NoteComposer({ mealSlots, foodItems, onSend }) {
  const [body, setBody] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [isSending, setIsSending] = useState(false)

  const filledSlots = [...mealSlots]
    .filter(s => s.assigned_food_id)
    .sort((a, b) => {
      const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
      if (dayDiff !== 0) return dayDiff
      return MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
    })

  function getSlotLabel(slot) {
    const food = foodItems.find(f => f.id === slot.assigned_food_id)
    return `${DAY_LABELS[slot.day]} · ${capitalize(slot.meal_type)} · ${food?.name || '(unknown)'}`
  }

  async function handleSend() {
    if (body.trim().length < 2 || isSending) return
    setIsSending(true)
    try {
      await onSend({ body: body.trim(), slotId: selectedSlotId || null })
      setBody('')
      setSelectedSlotId('')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="border-l-4 border-purple-400 pl-4 space-y-3">
      <select
        value={selectedSlotId}
        onChange={e => setSelectedSlotId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        <option value="">— General note (no specific meal) —</option>
        {filledSlots.map(slot => (
          <option key={slot.id} value={slot.id}>{getSlotLabel(slot)}</option>
        ))}
      </select>

      <div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write a note for this family..."
          rows={4}
          maxLength={1000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
        />
        <p className="text-xs text-gray-400 text-right">{body.length} / 1000</p>
      </div>

      <button
        onClick={handleSend}
        disabled={body.trim().length < 2 || isSending}
        className="w-full bg-purple-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSending ? 'Sending...' : 'Send note'}
      </button>
    </div>
  )
}
