import { useState } from 'react'

// Clinician-facing: assign challenge foods to the viewed patient. They appear
// pinned in the parent's add-food flow and count toward the challenge ring.
export default function ChallengeAssigner({ challenges = [], onAdd, onRemove }) {
  const [input, setInput] = useState('')

  function handleAdd() {
    const clean = input.trim()
    if (!clean) return
    if (challenges.some(c => c.name.toLowerCase() === clean.toLowerCase())) { setInput(''); return }
    onAdd(clean)
    setInput('')
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Foods to gently work toward this week. The family sees these pinned at the
        top of their food picker.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="e.g. Grilled cheese"
          style={{
            flex: 1, border: '1.5px solid var(--border)', borderRadius: 10,
            padding: '9px 12px', fontSize: 13, outline: 'none',
            fontFamily: "'Outfit', sans-serif", background: 'var(--surface-warm)',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{
            background: input.trim() ? 'var(--coral)' : 'var(--border)',
            color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default',
            fontFamily: "'Outfit', sans-serif",
          }}
        >Assign</button>
      </div>

      {challenges.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>
          No challenge foods assigned yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {challenges.map(c => (
            <span key={c.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'var(--pink-light)', border: '1px solid var(--pink-mid)',
              borderRadius: 10, padding: '6px 8px 6px 12px',
              fontSize: 13, color: 'var(--text-dark)', fontWeight: 500,
            }}>
              🎯 {c.name}
              <button
                onClick={() => onRemove(c.id)}
                aria-label={`Remove ${c.name}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--pink)', fontSize: 15, lineHeight: 1, padding: '2px 4px',
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
