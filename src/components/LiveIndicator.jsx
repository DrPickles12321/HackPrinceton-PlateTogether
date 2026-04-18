export default function LiveIndicator({ status }) {
  const config = {
    connected:    { label: 'Live',         dot: 'bg-green-500 animate-pulse', text: 'text-green-700' },
    disconnected: { label: 'Offline',      dot: 'bg-gray-400',                text: 'text-gray-500' },
    connecting:   { label: 'Connecting…',  dot: 'bg-yellow-400 animate-pulse',text: 'text-yellow-700' },
  }
  const c = config[status] || config.disconnected
  return (
    <div className="flex items-center gap-1.5 text-xs" aria-live="polite" aria-label={`Realtime status: ${c.label}`}>
      <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
    </div>
  )
}
