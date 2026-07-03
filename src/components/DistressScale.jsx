// Pre/post-meal distress rating (1 calm → 5 very hard). Two tap-rows shown
// once a meal has a status; tapping the same value again clears it.

const LEVELS = [1, 2, 3, 4, 5]

// Gentle ramp: sage → amber → terracotta (matches the app palette).
const LEVEL_COLORS = ['#5EA87A', '#8FA85E', '#C09040', '#C77243', '#B85535']

function ScaleRow({ label, value, onSet, size }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 600, width: 44, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {LEVELS.map(lv => {
          const selected = value === lv
          const color = LEVEL_COLORS[lv - 1]
          return (
            <button
              key={lv}
              type="button"
              onClick={() => onSet(selected ? null : lv)}
              aria-label={`${label} distress ${lv} of 5${selected ? ' (selected)' : ''}`}
              title={`${lv} — ${lv === 1 ? 'calm' : lv === 5 ? 'very hard' : ''}`}
              style={{
                width: size, height: size, borderRadius: '50%', padding: 0,
                border: `1.5px solid ${selected ? color : 'var(--border-mid)'}`,
                background: selected ? color : 'white',
                color: selected ? 'white' : 'var(--text-light)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s', fontFamily: "'Lato', sans-serif",
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {lv}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function DistressScale({ distress, onSet, compact = false }) {
  const size = compact ? 30 : 26
  return (
    <div style={{
      background: 'var(--surface-warm)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '9px 12px',
      display: 'flex', flexDirection: 'column', gap: 7,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          How hard was it?
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-light)' }}>1 calm · 5 very hard</span>
      </div>
      <ScaleRow label="Before" value={distress?.pre ?? null} onSet={v => onSet({ pre: v })} size={size} />
      <ScaleRow label="After" value={distress?.post ?? null} onSet={v => onSet({ post: v })} size={size} />
    </div>
  )
}
