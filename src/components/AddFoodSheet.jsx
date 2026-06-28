import { useState } from 'react'
import BottomSheet from './BottomSheet'
import AddFoodInput from './AddFoodInput'
import { SuggestedFoods } from './FoodSidebar'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { lookupNutrition } from '../lib/nutritionService'

const CAT_DOT = { familiar: 'var(--mint)', working_on: 'var(--peach)', challenge: 'var(--pink)' }

const CAT_ORDER = ['familiar', 'working_on', 'challenge']
const CAT_LABEL = { familiar: 'Familiar', working_on: 'Working on', challenge: 'Challenge' }

const GROUP_ORDER = ['grain', 'produce', 'protein', 'dairy', 'mixed']
const GROUP_LABEL = { grain: 'Grains', produce: 'Fruits & veggies', protein: 'Protein', dairy: 'Dairy', mixed: 'Other' }

const SORT_OPTIONS = [
  { key: 'category', label: 'Category' },
  { key: 'name', label: 'Name' },
  { key: 'group', label: 'Food group' },
]

const byName = (a, b) => a.name.localeCompare(b.name)

// Build the section list (each { label, foods }) for the chosen sort mode.
function buildSections(foods, sortMode) {
  if (sortMode === 'name') {
    return [{ label: null, foods: [...foods].sort(byName) }]
  }
  if (sortMode === 'group') {
    const withZone = foods.map(f => ({ ...f, _zone: lookupNutrition(f.name, f.category).plate_zone || 'mixed' }))
    return GROUP_ORDER
      .map(z => ({ label: GROUP_LABEL[z], foods: withZone.filter(f => f._zone === z).sort(byName) }))
      .filter(s => s.foods.length > 0)
  }
  // category (default)
  return CAT_ORDER
    .map(c => ({ label: CAT_LABEL[c], foods: foods.filter(f => f.category === c).sort(byName) }))
    .filter(s => s.foods.length > 0)
}

function FoodRow({ food, added, onTap }) {
  return (
    <button
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
}

function MyFoodsPicker({ foods, sortMode, inMealIds, onTap }) {
  if (foods.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic', padding: '4px 2px' }}>
        No foods in your list yet — add one above.
      </p>
    )
  }
  const sections = buildSections(foods, sortMode)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sections.map((section, si) => (
        <div key={section.label || `s${si}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {section.label && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase', padding: '2px 2px 0',
            }}>{section.label}</div>
          )}
          {section.foods.map(food => (
            <FoodRow key={food.id} food={food} added={inMealIds.has(food.id)} onTap={onTap} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function AddFoodSheet({ open, onClose, mealLabel, mealItems = [], onAddToMeal, onRemoveFromMeal }) {
  const { foodItems, addFoodItem } = useFirebaseData()
  const [tab, setTab] = useState('mine')
  const [sortMode, setSortMode] = useState('category')

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

          {foodItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
                letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 6,
              }}>Sort by</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {SORT_OPTIONS.map(opt => {
                  const active = sortMode === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSortMode(opt.key)}
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: 9, minHeight: 36,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--coral)' : 'var(--border)'}`,
                        background: active ? 'var(--coral-light)' : 'white',
                        color: active ? 'var(--coral)' : 'var(--text-light)',
                        fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s',
                      }}
                    >{opt.label}</button>
                  )
                })}
              </div>
            </div>
          )}

          <MyFoodsPicker foods={foodItems} sortMode={sortMode} inMealIds={inMealIds} onTap={toggle} />
        </>
      ) : (
        <SuggestedFoods onAdd={handleAddNewOrSuggested} existingNames={existingNames} buttonSize={40} />
      )}
    </BottomSheet>
  )
}
