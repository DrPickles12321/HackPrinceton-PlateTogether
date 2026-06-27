import { useState } from 'react'
import BottomSheet from './BottomSheet'
import AddFoodInput from './AddFoodInput'
import { SuggestedFoods } from './FoodSidebar'
import { useFirebaseData } from '../contexts/FirebaseDataContext'

const CAT_DOT = { familiar: 'var(--mint)', working_on: 'var(--peach)', challenge: 'var(--pink)' }

function MyFoodsPicker({ foods, addedIds, onTap }) {
  if (foods.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic', padding: '4px 2px 14px' }}>
        No foods in your list yet — add one below.
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
      {foods.map(food => {
        const added = addedIds.has(food.id)
        return (
          <button
            key={food.id}
            onClick={() => onTap(food)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              background: added ? 'var(--mint-light)' : 'white',
              border: `1.5px solid ${added ? 'var(--mint-mid)' : 'var(--border)'}`,
              borderRadius: 12, padding: '11px 12px', minHeight: 44,
              textAlign: 'left', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              width: '100%', transition: 'background 0.12s, border-color 0.12s',
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: CAT_DOT[food.category] }} />
            <span style={{ fontSize: 14, color: 'var(--text-dark)', flex: 1 }}>{food.name}</span>
            {added && <span style={{ fontSize: 14, color: 'var(--mint)', fontWeight: 700, flexShrink: 0 }}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function AddFoodSheet({ open, onClose, mealLabel, onAddToMeal }) {
  const { foodItems, addFoodItem } = useFirebaseData()
  const [tab, setTab] = useState('mine')
  const [addedIds, setAddedIds] = useState(() => new Set())
  const [addedCount, setAddedCount] = useState(0)

  function trackAdded(food) {
    onAddToMeal(food)
    setAddedIds(prev => new Set(prev).add(food.id))
    setAddedCount(c => c + 1)
  }

  function handleAddNewOrSuggested({ name, category }) {
    const food = addFoodItem({ name, category })
    if (food) trackAdded(food)
  }

  function handleClose() {
    setAddedIds(new Set())
    setAddedCount(0)
    onClose()
  }

  const existingNames = foodItems.map(f => f.name)

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={`Add to ${mealLabel}`}
      footer={
        <button
          onClick={handleClose}
          style={{
            width: '100%', padding: '13px', borderRadius: 13, border: 'none',
            background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
            color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", minHeight: 44,
          }}
        >
          Done{addedCount > 0 ? ` · ${addedCount} added` : ''}
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
          <MyFoodsPicker foods={foodItems} addedIds={addedIds} onTap={trackAdded} />
          <AddFoodInput onAddFood={handleAddNewOrSuggested} existingFoodNames={existingNames} />
        </>
      ) : (
        <SuggestedFoods onAdd={handleAddNewOrSuggested} existingNames={existingNames} buttonSize={40} />
      )}
    </BottomSheet>
  )
}
