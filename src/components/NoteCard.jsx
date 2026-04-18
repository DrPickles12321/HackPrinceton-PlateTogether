function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function NoteCard({ note, slotLabel, showMarkRead, onMarkRead }) {
  return (
    <div className={`rounded-lg border p-4 transition-colors ${note.is_read ? 'bg-white border-gray-200' : 'bg-purple-50 border-purple-300'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          {slotLabel ? (
            <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              {slotLabel}
            </span>
          ) : (
            <span className="text-xs text-gray-400">General note</span>
          )}
        </div>
        <time className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(note.created_at)}</time>
      </div>

      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{note.body}</p>

      {showMarkRead && !note.is_read && (
        <button
          onClick={() => onMarkRead(note.id)}
          className="mt-3 text-xs text-purple-600 hover:text-purple-800 underline"
        >
          Mark as read
        </button>
      )}
      {showMarkRead && note.is_read && (
        <p className="mt-2 text-xs text-gray-400">✓ Read</p>
      )}
    </div>
  )
}
