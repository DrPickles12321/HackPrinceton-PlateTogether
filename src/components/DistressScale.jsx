// Pre/post-meal distress rating (1 calm → 5 very hard). Two tap-rows shown
// once a meal has a status; tapping the same value again clears it.

const LEVELS = [1, 2, 3, 4, 5]

// Gentle ramp: sage → amber → terracotta (matches the app palette).
const LEVEL_COLORS = ['#5EA87A', '#8FA85E', '#C09040', '#C77243', '#B85535']

const LABEL_W = 86 // room for "Before eating" / "After eating"
const DOT_GAP = 6

function ScaleRow({ label, value, onSet, size }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-mid)', fontWeight: 600, width: LABEL_W, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: DOT_GAP }}>
        {LEVELS.map(lv => {
          const selected = value === lv
          const color = LEVEL_COLORS[lv - 1]
          return (
            <button
              key={lv}
              type="button"
              onClick={() => onSet(selected ? null : lv)}
              aria-label={`${label}: distress level ${lv} of 5${selected ? ' (selected)' : ''}`}
              title={lv === 1 ? '1 — calm' : lv === 5 ? '5 — very hard' : `${lv}`}
              style={{
                width: size, height: size, boxSizing: 'border-box', borderRadius: '50%', padding: 0,
                border: `1.5px solid ${selected ? color : 'var(--border-mid)'}`,
                background: selected ? color : 'white',
                color: selected ? 'white' : 'var(--text-light)',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
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
  const size = compact ? 32 : 28
  const dotsW = size * LEVELS.length + DOT_GAP * (LEVELS.length - 1)

  return (
    <div style={{
      background: 'var(--surface-warm)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Title + plain-language explainer */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>How hard was this meal?</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 2, lineHeight: 1.45 }}>
          Rate the distress <strong style={{ color: 'var(--text-mid)', fontWeight: 600 }}>before</strong> and{' '}
          <strong style={{ color: 'var(--text-mid)', fontWeight: 600 }}>after</strong> eating — 1 is calm, 5 is very hard. Optional.
        </div>
      </div>

      {/* End anchors, aligned above the number columns so the scale reads itself */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: LABEL_W, flexShrink: 0 }} />
        <div style={{ width: dotsW, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--mint)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: LEVEL_COLORS[0], display: 'inline-block' }} />
            Calm
          </span>
          <span style={{ fontSize: 10, color: 'var(--coral)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            Very hard
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: LEVEL_COLORS[4], display: 'inline-block' }} />
          </span>
        </div>
      </div>

      <ScaleRow label="Before eating" value={distress?.pre ?? null} onSet={v => onSet({ pre: v })} size={size} />
      <ScaleRow label="After eating" value={distress?.post ?? null} onSet={v => onSet({ post: v })} size={size} />
    </div>
  )
}
