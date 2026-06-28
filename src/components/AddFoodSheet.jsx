import { useState } from 'react'
import BottomSheet from './BottomSheet'
import AddFoodInput from './AddFoodInput'
import { SuggestedFoods } from './FoodSidebar'
import { useFirebaseData } from '../contexts/FirebaseDataContext'

const CAT_DOT = { familiar: 'var(--mint)', working_on: 'var(--peach)', challenge: 'var(--pink)' }
const CAT_ORDER = { familiar: 0, working_on: 1, challenge: 2 }

function MyFoodsPicker({ foods, inMealIds, onTap }) {
  if (foods.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic', padding: '4px 2px' }}>
        No foods in your list yet — add one above.
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {foods.map(food => {
        const added = inMealIds.has(food.id)
        return (
          <button
            key={food.id}
            onClick={() => onTap(food)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              background: added ? 'var(--mint-light)' : 'white',
              border: `1.5px solid ${added ? 'var(--mint-mid)' : 'var(--border)'}`,
              borderRadius: 12, padding: '11px 12px', minHeight: 46,
              textAlign: 'left', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              width: '100%', transition: 'background 0.12s, border-color 0.12s',
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: CAT_DOT[food.category] }} />
            <span style={{ fontSize: 14, color: 'var(--text-dark)', flex: 1 }}>{food.name}</span>
            {added && <span style={{ fontSize: 15, color: 'var(--mint)', fontWeight: 700, flexShrink: 0 }}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function AddFoodSheet({ open, onClose, mealLabel, mealItems = [], onAddToMeal, onRemoveFromMeal }) {
  const { foodItems, addFoodItem } = useFirebaseData()
  const [tab, setTab] = useState('mine')

  const inMealIds = new Set(mealItems.map(f => f.id))

  function toggle(food) {
    if (inMealIds.has(food.id)) onRemoveFromMeal(food)
    else onAddToMeal(food)
  }

  function handleAddNewOrSuggested({ name, category }) {
    const food = addFoodItem({ name, category })
    if (food) onAddToMeal(food)
  }

  const existingNames = foodItems.map(f => f.name)
  const sortedFoods = [...foodItems].sort(
    (a, b) => (CAT_ORDER[a.category] ?? 9) - (CAT_ORDER[b.category] ?? 9) || a.name.localeCompare(b.name)
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Add to ${mealLabel}`}
      footer={
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px', borderRadius: 13, border: 'none',
            background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
            color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", minHeight: 44,
          }}
        >
          Done
        </button>
      }
    >
      <div style={{
        display: 'flex', gap: 4, background: 'var(--surface-warm)',
        borderRadius: 12, padding: 3, marginBottom: 14,
      }}>
        {[{ key: 'mine', label: 'My List' }, { key: 'suggested', label: 'Suggested' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 9, border: 'none',
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? 'var(--coral)' : 'var(--text-light)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 40,
              boxShadow: tab === t.key ? '0 1px 5px rgba(39,23,6,0.08)' : 'none',
              fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'mine' ? (
        <>
          {/* Add-a-food input on top so it's visible above the keyboard and new
              foods appear in the list below it. */}
          <AddFoodInput onAddFood={handleAddNewOrSuggested} existingFoodNames={existingNames} />
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
          <MyFoodsPicker foods={sortedFoods} inMealIds={inMealIds} onTap={toggle} />
        </>
      ) : (
        <SuggestedFoods onAdd={handleAddNewOrSuggested} existingNames={existingNames} buttonSize={40} />
      )}
    </BottomSheet>
  )
}
