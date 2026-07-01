import { useState, useRef, useEffect } from 'react'
import Fuse from 'fuse.js'
import { COMMON_FOODS } from '../data/commonFoods'
import { searchFoods } from '../lib/foodData'

const fuse = new Fuse(COMMON_FOODS, { keys: ['name'], threshold: 0.4 })

const CATEGORIES = [
  { key: 'familiar',   label: 'Familiar',   color: 'var(--mint)',  bg: 'var(--mint-light)',  border: 'var(--mint-mid)' },
  { key: 'working_on', label: 'Working On', color: 'var(--peach)', bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
  { key: 'challenge',  label: 'Challenge',  color: 'var(--pink)',  bg: 'var(--pink-light)',  border: 'var(--pink-mid)' },
]

export default function AddFoodInput({ onAddFood, existingFoodNames = [] }) {
  const [name, setName]               = useState('')
  const [category, setCategory]       = useState('familiar')
  const [suggestions, setSuggestions] = useState([])   // local curated matches
  const [usdaSug, setUsdaSug]         = useState([])    // live USDA matches
  const [pickedExtra, setPickedExtra] = useState(null)  // group/nutrition of a picked USDA item
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen]               = useState(false)
  const [toast, setToast]             = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Live USDA suggestions (debounced) so any food is findable here too.
  useEffect(() => {
    const v = name.trim()
    if (v.length < 2) { setUsdaSug([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const results = await searchFoods(v, 8)
      if (!cancelled) setUsdaSug(results)
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
  }, [name])

  const localNames = new Set(suggestions.map(s => s.name.toLowerCase()))
  const existingLower = new Set(existingFoodNames.map(n => n.toLowerCase()))
  const merged = [
    ...suggestions,
    ...usdaSug.filter(u => !localNames.has(u.name.toLowerCase())),
  ].filter(item => !existingLower.has(item.name.toLowerCase())).slice(0, 8)

  function handleChange(e) {
    const val = e.target.value
    setName(val)
    setActiveIndex(-1)
    setPickedExtra(null)
    if (val.trim().length < 1) { setSuggestions([]); setUsdaSug([]); setOpen(false); return }
    setSuggestions(fuse.search(val).slice(0, 5).map(r => r.item))
    setOpen(true)
  }

  function selectSuggestion(food) {
    setName(food.name)
    if (food.suggestedCategory) setCategory(food.suggestedCategory)
    setPickedExtra(food.group || food.nutrition ? { group: food.group, nutrition: food.nutrition } : null)
    setSuggestions([])
    setUsdaSug([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (!open || merged.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, merged.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectSuggestion(merged[activeIndex]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) return
    if (existingFoodNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setToast('You already have that food — check the sidebar.')
      return
    }
    onAddFood({ name: trimmed, category, ...(pickedExtra || {}) })
    setName('')
    setCategory('familiar')
    setPickedExtra(null)
    setSuggestions([])
    setUsdaSug([])
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div style={{
          marginBottom: 8, borderRadius: 10, padding: '8px 12px',
          background: 'var(--peach-light)', border: '1px solid var(--peach-mid)',
          fontSize: 12, color: 'var(--peach)',
        }}>{toast}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 7, marginBottom: 9 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => merged.length > 0 && setOpen(true)}
            placeholder="Add a food…"
            style={{
              width: '100%', border: '1.5px solid var(--border)',
              borderRadius: 11, padding: '8px 12px', fontSize: 13,
              color: 'var(--text-dark)', outline: 'none', boxSizing: 'border-box',
              fontFamily: "'Outfit', sans-serif", background: 'var(--surface-warm)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocusCapture={e => {
              e.target.style.borderColor = 'var(--coral)'
              e.target.style.boxShadow = '0 0 0 3px rgba(184,85,53,0.1)'
            }}
            onBlurCapture={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          />
          {open && merged.length > 0 && (
            <ul style={{
              position: 'absolute', zIndex: 50, left: 0, right: 0, top: '100%', marginTop: 5,
              background: 'white', border: '1.5px solid var(--border)', borderRadius: 13,
              boxShadow: '0 8px 28px rgba(39,23,6,0.12)', overflow: 'hidden', listStyle: 'none',
              padding: 4, margin: 0,
            }}>
              {merged.map((food, i) => (
                <li
                  key={food.name}
                  onMouseDown={() => selectSuggestion(food)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 11px', fontSize: 13, cursor: 'pointer', borderRadius: 9,
                    background: i === activeIndex ? 'var(--coral-light)' : 'transparent',
                    color: 'var(--text-dark)',
                  }}
                >
                  {/* Neutral dot — the food isn't categorized until you add it. */}
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: 'var(--border-mid)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
            color: 'white', border: 'none', borderRadius: 11,
            padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            flexShrink: 0, fontFamily: "'Outfit', sans-serif",
            boxShadow: '0 2px 8px rgba(184,85,53,0.28)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >Add</button>
      </form>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 5 }}>
        {CATEGORIES.map(cat => {
          const active = category === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              style={{
                flex: 1, padding: '5px 4px', borderRadius: 9, fontSize: 11, fontWeight: 600,
                border: `1.5px solid ${active ? cat.border : 'var(--border)'}`,
                background: active ? cat.bg : 'white',
                color: active ? cat.color : 'var(--text-light)',
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
