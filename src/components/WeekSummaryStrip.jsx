// Four at-a-glance chips summarizing the visible week. Sits above the grid on the
// Week tab so a sparsely-filled grid still has context. Used mobile + desktop.
export default function WeekSummaryStrip({ items = [], compact = false }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: compact ? 8 : 12, marginBottom: compact ? 14 : 18,
    }}>
      {items.map(it => (
        <div key={it.label} style={{
          background: it.bg || 'white',
          borderRadius: compact ? 14 : 16,
          border: `1.5px solid ${it.border || 'var(--border)'}`,
          boxShadow: '0 2px 8px rgba(39,23,6,0.05)',
          padding: compact ? '12px 6px' : '16px 12px',
          textAlign: 'center',
          minWidth: 0,
        }}>
          <div style={{ fontSize: compact ? 15 : 17, marginBottom: 4 }}>{it.icon}</div>
          <div className="font-lora" style={{
            fontSize: compact ? 21 : 26, fontWeight: 400, lineHeight: 1,
            color: it.color || 'var(--text-dark)', marginBottom: 4,
          }}>
            {it.value}
          </div>
          <div style={{ fontSize: compact ? 10 : 11, color: 'var(--text-mid)', fontWeight: 500, lineHeight: 1.15 }}>{it.label}</div>
        </div>
      ))}
    </div>
  )
}
