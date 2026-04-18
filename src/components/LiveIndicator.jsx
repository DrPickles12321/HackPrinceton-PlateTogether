export default function LiveIndicator({ status }) {
  const config = {
    connected:    { label: 'Live',        dot: 'var(--mint)',      pulse: true,  text: 'var(--mint)' },
    disconnected: { label: 'Offline',     dot: 'var(--border-mid)', pulse: false, text: 'var(--text-light)' },
    connecting:   { label: 'Connecting…', dot: 'var(--peach)',     pulse: true,  text: 'var(--peach)' },
  }
  const c = config[status] || config.disconnected

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
      aria-live="polite"
      aria-label={`Realtime status: ${c.label}`}
    >
      <span style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: c.dot,
        animation: c.pulse ? 'livePulse 2s ease-in-out infinite' : 'none',
        boxShadow: c.pulse ? `0 0 0 2px ${c.dot}30` : 'none',
      }} />
      <span style={{ color: c.text, fontWeight: 500 }}>{c.label}</span>
    </div>
  )
}
