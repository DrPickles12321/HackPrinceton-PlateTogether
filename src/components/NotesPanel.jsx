import NoteComposer from './NoteComposer'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
}

function toDateKey(isoString) {
  if (!isoString) return 'unknown'
  const d = new Date(isoString)
  return isNaN(d.getTime()) ? 'unknown' : d.toISOString().slice(0, 10)
}

export default function NotesPanel({ notes, mode, onSave, notesReadByParent = {} }) {
  const today = new Date().toISOString().slice(0, 10)

  const byDay = {}
  for (const note of notes) {
    const key = toDateKey(note.created_at)
    if (!byDay[key] || new Date(note.created_at) > new Date(byDay[key].created_at)) {
      byDay[key] = note
    }
  }

  const todayNote = byDay[today] || null

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">Clinician Notes</h3>
      </header>

      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
          Today · {formatDate(new Date().toISOString())}
        </p>
        {mode === 'clinician' ? (
          <>
            <NoteComposer
              existingNote={todayNote}
              onSave={(body) => onSave({ body, existingNoteId: todayNote?.id || null })}
            />
            {todayNote && (
              <div className="mt-2">
                {notesReadByParent[todayNote.id]
                  ? <span className="text-xs text-green-600 font-medium">✓ Parent has read this note</span>
                  : <span className="text-xs text-amber-500 font-medium">● Parent hasn't read this yet</span>
                }
              </div>
            )}
          </>
        ) : todayNote ? (
          <div>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{todayNote.body}</p>
            <p className="text-xs text-gray-400 mt-2">Last updated {formatDate(todayNote.created_at)}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No note for today yet.</p>
        )}
      </div>
    </section>
  )
}
