// A small stacked-bar chart showing the "shape" of the week: how many meals were
// logged each day and how they went. Reused in the Insights tab (mobile + desktop).

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Bottom-to-top stacking order + colors (match the Week grid dots).
const SEGMENTS = [
  { key: 'okay',      color: '#5EA87A', label: 'Okay' },
  { key: 'difficult', color: '#C09040', label: 'Difficult' },
  { key: 'refused',   color: '#B86080', label: 'Refused' },
  { key: 'skipped',   color: '#9C8A72', label: 'Skipped' },
]

const MAX_MEALS = 4 // breakfast / lunch / snack / dinner

export default function DailyRhythm({ summaries = [], todayIso, compact = false }) {
  const trackH = compact ? 68 : 88
  const unit = trackH / MAX_MEALS

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: compact ? 5 : 10 }}>
        {summaries.map((d, i) => {
          const isToday = d.iso === todayIso
          const dayNum = new Date(d.iso + 'T12:00:00').getDate()
          return (
            <div key={d.iso} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
              {/* Track */}
              <div style={{
                width: '100%', maxWidth: compact ? 26 : 34, height: trackH,
                display: 'flex', flexDirection: 'column-reverse',
                borderRadius: 8, overflow: 'hidden',
                background: isToday ? 'var(--coral-light)' : 'var(--surface-warm)',
                border: `1px solid ${isToday ? 'var(--coral-mid)' : 'var(--border)'}`,
                position: 'relative',
              }}>
                {d.logged === 0 ? (
                  <div style={{
                    position: 'absolute', left: 4, right: 4, bottom: 4, height: 5,
                    borderRadius: 3, border: '1.5px dashed var(--border-mid)', opacity: 0.6,
                  }} />
                ) : (
                  SEGMENTS.map(seg => {
                    const n = d.counts[seg.key] || 0
                    if (!n) return null
                    return (
                      <div key={seg.key} title={`${n} ${seg.label.toLowerCase()}`} style={{
                        height: n * unit, background: seg.color,
                        borderTop: '1.5px solid rgba(255,255,255,0.55)',
                      }} />
                    )
                  })
                )}
              </div>
              {/* Day label */}
              <div style={{ textAlign: 'center', lineHeight: 1.15 }}>
                <div style={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: isToday ? 'var(--coral)' : 'var(--text-mid)' }}>{DAY_LABELS[i]}</div>
                <div style={{ fontSize: compact ? 8 : 9, color: isToday ? 'var(--coral)' : 'var(--text-light)' }}>{dayNum}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 14, justifyContent: 'center' }}>
        {SEGMENTS.map(seg => (
          <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
