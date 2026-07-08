import { useState } from 'react'
import NoteComposer from './NoteComposer'
import { localIsoDate } from '../lib/constants'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function toDateKey(isoString) {
  if (!isoString) return 'unknown'
  const d = new Date(isoString)
  return isNaN(d.getTime()) ? 'unknown' : localIsoDate(d)
}

export default function NotesPanel({ notes, mode, onSave, onDelete, notesReadByParent = {} }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today = localIsoDate()

  const byDay = {}
  for (const note of notes) {
    const key = toDateKey(note.created_at)
    if (!byDay[key] || new Date(note.created_at) > new Date(byDay[key].created_at)) {
      byDay[key] = note
    }
  }

  const todayNote = byDay[today] || null

  return (
    <section style={{
      background: '#FFFDF8',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(39,23,6,0.07)',
      fontFamily: "'Outfit', sans-serif",
    }}>
      {/* Notebook tab header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>📓</span>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'white', letterSpacing: '0.2px' }}>
            Clinician Notes
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
          {formatDate(new Date().toISOString())}
        </span>
      </div>

      {/* Red margin line + ruled content */}
      <div style={{
        display: 'flex',
        minHeight: 180,
      }}>
        {/* Red margin line */}
        <div style={{
          width: 2,
          background: 'rgba(184,85,53,0.25)',
          flexShrink: 0,
          marginLeft: 32,
        }} />

        {/* Content area with ruled lines */}
        <div style={{
          flex: 1,
          padding: '16px 18px 16px 14px',
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(184,85,53,0.08) 27px, rgba(184,85,53,0.08) 28px)',
          backgroundSize: '100% 28px',
          backgroundPositionY: '4px',
        }}>
          {mode === 'clinician' ? (
            <>
              <NoteComposer
                existingNote={todayNote}
                onSave={(body) => onSave({ body, existingNoteId: todayNote?.id || null })}
              />
              {todayNote && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  {notesReadByParent[todayNote.id]
                    ? <span style={{ fontSize: 11, color: '#487A67', fontWeight: 500 }}>✓ Parent has read this note</span>
                    : <span style={{ fontSize: 11, color: '#B07828', fontWeight: 500 }}>○ Parent hasn't read this yet</span>
                  }
                  {onDelete && (
                    confirmDelete ? (
                      <span style={{ fontSize: 11, color: 'var(--text-mid)', fontFamily: "'Outfit', sans-serif" }}>
                        Delete this note?{' '}
                        <button
                          onClick={() => { onDelete(todayNote.id); setConfirmDelete(false) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coral)', fontSize: 11, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}
                        >Yes</button>
                        {' / '}
                        <button
                          onClick={() => setConfirmDelete(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 11, padding: 0, fontFamily: 'inherit' }}
                        >Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 11, padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      >Delete note</button>
                    )
                  )}
                </div>
              )}
            </>
          ) : todayNote ? (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--coral)', fontSize: 16, lineHeight: 1.6, flexShrink: 0 }}>○</span>
                <p style={{
                  fontSize: 14, color: 'var(--text-dark)',
                  lineHeight: '28px', whiteSpace: 'pre-wrap', margin: 0,
                  fontFamily: "'Outfit', sans-serif",
                }}>{todayNote.body}</p>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 10 }}>
                Last updated {formatDate(todayNote.created_at)}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 4 }}>
              <span style={{ color: 'rgba(184,85,53,0.3)', fontSize: 16, lineHeight: 1.6 }}>○</span>
              <p style={{ fontSize: 14, color: 'var(--text-light)', fontStyle: 'italic', margin: 0, lineHeight: '28px' }}>
                No note for today yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
