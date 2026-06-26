import { useState, useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import AddFoodInput from './AddFoodInput'
import { COMMON_FOODS } from '../data/commonFoods'

const CATEGORIES = [
  { key: 'familiar',   label: 'Familiar',   color: 'var(--mint)',  bg: 'var(--mint-light)',  border: 'var(--mint-mid)' },
  { key: 'working_on', label: 'Working On', color: 'var(--peach)', bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
  { key: 'challenge',  label: 'Challenge',  color: 'var(--pink)',  bg: 'var(--pink-light)',  border: 'var(--pink-mid)' },
]

const MOVE_LABELS = { familiar: 'Move to Familiar', working_on: 'Move to Working On', challenge: 'Move to Challenge' }

function FoodCard({ food, onDelete, onChangeCategory }) {
  const [menuOpen, setMenuOpen]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef(null)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: food.id, data: { food } })
  const cat = CATEGORIES.find(c => c.key === food.category) || CATEGORIES[0]

  useEffect(() => {
    function onClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.45 : 1 }
    : undefined

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'white', border: '1.5px solid var(--border)',
          borderLeft: `3px solid ${cat.color}`,
          borderRadius: 11, padding: '8px 10px', marginBottom: 5,
          boxShadow: '0 1px 5px rgba(39,23,6,0.05)',
          transition: isDragging ? 'none' : 'box-shadow 0.15s',
        }}
        onMouseEnter={e => { if (!isDragging) e.currentTarget.style.boxShadow = '0 3px 10px rgba(39,23,6,0.09)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 5px rgba(39,23,6,0.05)' }}
      >
        <span
          {...listeners}
          {...attributes}
          style={{
            fontSize: 13, color: 'var(--text-dark)', flex: 1,
            cursor: 'grab', userSelect: 'none', lineHeight: 1.35,
            fontWeight: 400,
          }}
        >{food.name}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-light)', padding: '2px 5px', fontSize: 16, lineHeight: 1,
              borderRadius: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-warm)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >⋮</button>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--border-mid)', padding: '2px 4px', fontSize: 15, lineHeight: 1,
              borderRadius: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--pink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--border-mid)'}
          >×</button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 5, zIndex: 50,
              background: 'white', border: '1.5px solid var(--border)', borderRadius: 14,
              boxShadow: '0 8px 28px rgba(39,23,6,0.12)', overflow: 'hidden', minWidth: 168,
            }}>
              {Object.entries(MOVE_LABELS).filter(([k]) => k !== food.category).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { onChangeCategory(food, key); setMenuOpen(false) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13,
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dark)',
                    display: 'block', fontFamily: "'Outfit', sans-serif",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-warm)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >{label}</button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 12px' }} />
              <button
                onClick={() => { setConfirmDelete(true); setMenuOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13,
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pink)',
                  display: 'block', fontFamily: "'Outfit', sans-serif",
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--pink-light)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >Delete</button>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(39,23,6,0.3)',
        }}>
          <div style={{
            background: 'white', borderRadius: 22, padding: '28px',
            maxWidth: 360, margin: '0 16px',
            boxShadow: '0 20px 60px rgba(39,23,6,0.18)',
            border: '1.5px solid var(--border)',
          }}>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 22, lineHeight: 1.6 }}>
              This food may be on your weekly plan. Remove it and clear those slots?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '9px 18px', fontSize: 13, borderRadius: 11,
                  border: '1.5px solid var(--border)', background: 'white',
                  cursor: 'pointer', color: 'var(--text-mid)', fontFamily: "'Outfit', sans-serif",
                }}
              >Cancel</button>
              <button
                onClick={() => { onDelete(food); setConfirmDelete(false) }}
                style={{
                  padding: '9px 18px', fontSize: 13, borderRadius: 11,
                  border: 'none', background: 'var(--pink)', color: 'white',
                  cursor: 'pointer', fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                }}
              >Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ config, foods, onDelete, onChangeCategory }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 12,
          background: config.bg, border: `1.5px solid ${config.border}`,
          cursor: 'pointer', marginBottom: collapsed ? 0 : 8,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: config.color }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
          {config.label}
          <span style={{
            fontSize: 11, fontWeight: 600, color: config.color, opacity: 0.75,
            background: 'white', borderRadius: 6, padding: '1px 7px',
          }}>{foods.length}</span>
        </span>
        <span style={{ color: config.color, fontSize: 13, opacity: 0.6 }}>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div>
          {foods.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-light)', padding: '3px 4px 8px', fontStyle: 'italic' }}>
              No foods yet
            </p>
          )}
          {foods.map(food => (
            <FoodCard key={food.id} food={food} onDelete={onDelete} onChangeCategory={onChangeCategory} />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestedFoods({ onAdd, existingNames }) {
  const existingLower = new Set(existingNames.map(n => n.toLowerCase()))
  const items = COMMON_FOODS
    .filter(f => !existingLower.has(f.name.toLowerCase()))
    .map(f => f.name)
    .sort((a, b) => a.localeCompare(b))

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <p style={{ fontSize: 11, color: 'var(--text-light)', lineHeight: 1.5, marginBottom: 10 }}>
        Pick how it feels right now — familiar, working on, or a challenge.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(name => (
          <div
            key={name}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'white', border: '1.5px solid var(--border)',
              borderRadius: 11, padding: '8px 10px', gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-dark)', flex: 1 }}>{name}</span>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  title={`Add as ${cat.label}`}
                  aria-label={`Add ${name} as ${cat.label}`}
                  onClick={() => onAdd({ name, category: cat.key })}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', padding: 0,
                    border: `1.5px solid ${cat.border}`, background: cat.bg,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'block' }} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FoodSidebar() {
  const { foodItems, addFoodItem, deleteFoodItem, updateFoodItemCategory } = useFirebaseData()
  const [tab, setTab] = useState('mine')

  function handleAddFood({ name, category }) {
    addFoodItem({ name, category })
  }

  function handleDelete(food) {
    deleteFoodItem(food.id)
  }

  function handleChangeCategory(food, newCategory) {
    updateFoodItemCategory(food.id, newCategory)
  }

  const existingNames = foodItems.map(f => f.name)

  return (
    <div style={{ padding: '20px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="font-lora" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-dark)', marginBottom: 14 }}>
        Our Foods
      </h2>

      <div style={{
        display: 'flex', gap: 4, background: 'var(--surface-warm)',
        borderRadius: 12, padding: 3, marginBottom: 14,
      }}>
        {[{ key: 'mine', label: 'My List' }, { key: 'suggested', label: 'Suggested' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: 9, border: 'none',
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? 'var(--coral)' : 'var(--text-light)',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              boxShadow: tab === t.key ? '0 1px 5px rgba(39,23,6,0.08)' : 'none',
              fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'mine' ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <AddFoodInput onAddFood={handleAddFood} existingFoodNames={existingNames} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {CATEGORIES.map(cfg => (
              <Section
                key={cfg.key}
                config={cfg}
                foods={foodItems.filter(f => f.category === cfg.key)}
                onDelete={handleDelete}
                onChangeCategory={handleChangeCategory}
              />
            ))}
          </div>
        </>
      ) : (
        <SuggestedFoods onAdd={handleAddFood} existingNames={existingNames} />
      )}
    </div>
  )
}
