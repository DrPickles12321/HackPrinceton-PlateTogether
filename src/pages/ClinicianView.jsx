import { useEffect, useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { generateClinicianDigest } from '../lib/aiInsights'
import { getWeekIsoDates } from '../lib/insights'

const DIGEST_STYLES = {
  pattern:     { bg: '#f3f4f6', border: '#e5e7eb', icon: '📋' },
  improvement: { bg: '#ecfdf5', border: '#a7f3d0', icon: '🌱' },
  watch:       { bg: '#fffbeb', border: '#fde68a', icon: '👀' },
}

function ClinicianDigestSection({ allMealItems, mealStatuses, parentNotes }) {
  const [digest, setDigest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    const weekDates = new Set(getWeekIsoDates(0))
    const thisWeekItems = Object.fromEntries(
      Object.entries(allMealItems).filter(([date]) => weekDates.has(date))
    )
    const thisWeekStatuses = Object.fromEntries(
      Object.entries(mealStatuses).filter(([date]) => weekDates.has(date))
    )
    const thisWeekNotes = parentNotes.filter(n => weekDates.has(n.date))

    setLoading(true)
    setError(null)
    generateClinicianDigest({
      mealItemsByDate: thisWeekItems,
      mealStatusesByDate: thisWeekStatuses,
      parentNotes: thisWeekNotes,
    })
      .then(result => { setDigest(result || []); setLoading(false) })
      .catch(err => { console.error('Clinician digest error:', err); setError(true); setLoading(false) })
  }

  return (
    <div style={{
      background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb',
      padding: '20px 24px', marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Weekly Digest</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
            AI summary of this week's meal log for a quick pre-session scan
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '7px 16px', borderRadius: 10, border: 'none',
            background: loading ? 'rgba(232,115,90,0.4)' : 'linear-gradient(135deg, #E8735A 0%, #C85A8A 100%)',
            color: 'white', fontSize: 13, fontWeight: 600,
            fontFamily: "'Lato', sans-serif", flexShrink: 0,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Generating…' : digest ? 'Regenerate' : 'Generate digest'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#E8735A', marginTop: 12 }}>
          Could not generate the digest right now. Try again in a moment.
        </p>
      )}

      {!loading && !error && digest === null && (
        <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 12 }}>
          No digest yet — click "Generate digest" to summarize this patient's week.
        </p>
      )}

      {digest && digest.length === 0 && (
        <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 12 }}>
          No meals logged this week yet.
        </p>
      )}

      {digest && digest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {digest.map((item, i) => {
            const s = DIGEST_STYLES[item.type] || DIGEST_STYLES.pattern
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: s.bg, borderRadius: 12, border: `1px solid ${s.border}`,
                padding: '12px 14px',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{s.icon}</span>
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{item.text}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ClinicianSupplementEditor({ prescribedSupplements, onSave }) {
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed || prescribedSupplements.includes(trimmed)) return
    onSave([...prescribedSupplements, trimmed])
    setInput('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function handleRemove(name) {
    onSave(prescribedSupplements.filter(s => s !== name))
  }

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: '1.5px solid #e5e7eb', padding: '20px 24px', marginTop: 16,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        Prescribed Supplements
      </h2>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
        These will appear in the patient's daily supplement checklist.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. Calcium + D3"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            border: '1.5px solid #e5e7eb', fontSize: 13,
            color: '#111827', fontFamily: "'Outfit', sans-serif", outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = '#E8735A'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{
            padding: '8px 18px', borderRadius: 10, border: 'none',
            background: input.trim() ? '#E8735A' : 'rgba(232,115,90,0.3)',
            color: 'white', fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
        >{saved ? 'Added ✓' : 'Add'}</button>
      </div>
      {prescribedSupplements.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No supplements prescribed yet.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {prescribedSupplements.map(name => (
            <span key={name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fef3f0', border: '1px solid #f5c4b8',
              borderRadius: 20, padding: '5px 12px',
              fontSize: 13, color: '#E8735A', fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
            }}>
              {name}
              <button
                onClick={() => handleRemove(name)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#E8735A', fontSize: 16, lineHeight: 1,
                  padding: 0, display: 'flex', alignItems: 'center',
                  fontFamily: 'inherit', opacity: 0.6,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
import WeeklyGrid from '../components/WeeklyGrid'
import WeeklyInsights from '../components/WeeklyInsights'
import NotesPanel from '../components/NotesPanel'
import DailyNutritionSummary from '../components/nutrition/DailyNutritionSummary'
import WeeklyGoals from '../components/WeeklyGoals'
import NutritionalTargets from '../components/NutritionalTargets'

export default function ClinicianView() {
  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    clinicianNotesRead,
    markParentNoteReadById,
    markPatientParentNoteReadById,
    patients,
    viewingPatientUid,
    setViewingPatientUid,
    addPatientByCode,
    prescribedSupplements,
    savePrescribedSupplements,
    clinicianNotes,
    writeClinicianNote,
  } = useFirebaseData()

  const [addCodeInput, setAddCodeInput]   = useState('')
  const [addCodeError, setAddCodeError]   = useState('')
  const [addCodeLoading, setAddCodeLoading] = useState(false)

  async function handleAddPatient(e) {
    e.preventDefault()
    setAddCodeError('')
    setAddCodeLoading(true)
    const result = await addPatientByCode(addCodeInput)
    setAddCodeLoading(false)
    if (result.error) {
      setAddCodeError(result.error)
    } else {
      setAddCodeInput('')
    }
  }

  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    document.title = 'Dashboard · Plate Together'
  }, [])

  function handleMarkNoteRead(noteId) {
    markPatientParentNoteReadById(noteId)
  }

  function handleSaveNote({ body, existingNoteId }) {
    writeClinicianNote({ body, existingNoteId })
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      {/* ── Patient selector ─────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb',
        padding: '16px 20px', display: 'flex', alignItems: 'flex-start',
        gap: 20, flexWrap: 'wrap',
      }}>
        {/* Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Viewing patient
          </label>
          <select
            value={viewingPatientUid || ''}
            onChange={e => setViewingPatientUid(e.target.value || null)}
            style={{
              padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
              fontSize: 13, color: '#111827', background: 'white',
              fontFamily: "'Lato', sans-serif", cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">— Select a patient —</option>
            {patients.map(p => (
              <option key={p.uid} value={p.uid}>{p.email}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#e5e7eb', alignSelf: 'stretch', margin: '0 4px' }} />

        {/* Add Patient */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Add patient by family code
          </label>
          <form onSubmit={handleAddPatient} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={addCodeInput}
              onChange={e => { setAddCodeInput(e.target.value.toUpperCase()); setAddCodeError('') }}
              placeholder="ABC123"
              maxLength={6}
              style={{
                padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                fontSize: 13, color: '#111827', fontFamily: "'Lato', sans-serif",
                outline: 'none', width: 110, letterSpacing: '1px', fontWeight: 600,
              }}
              onFocus={e => e.target.style.borderColor = '#E8735A'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button
              type="submit"
              disabled={addCodeLoading || addCodeInput.length < 6}
              style={{
                padding: '7px 16px', borderRadius: 10, border: 'none',
                background: addCodeLoading || addCodeInput.length < 6
                  ? 'rgba(232,115,90,0.4)'
                  : 'linear-gradient(135deg, #E8735A 0%, #C85A8A 100%)',
                color: 'white', fontSize: 13, fontWeight: 600,
                fontFamily: "'Lato', sans-serif",
                cursor: addCodeLoading || addCodeInput.length < 6 ? 'not-allowed' : 'pointer',
              }}
            >
              {addCodeLoading ? '…' : 'Add'}
            </button>
          </form>
          {addCodeError && (
            <span style={{ fontSize: 12, color: '#E8735A', marginTop: 2 }}>{addCodeError}</span>
          )}
        </div>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-gray-900">Clinician Dashboard</h1>
        <p className="text-sm text-gray-600">Weekly meal plan and logs for this family</p>
      </header>

      {!viewingPatientUid ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          color: '#9ca3af', fontSize: 14,
          fontFamily: "'Outfit', sans-serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🩺</div>
          <p style={{ fontWeight: 600, color: '#6b7280', fontSize: 16, marginBottom: 8 }}>
            No patient selected
          </p>
          <p style={{ fontSize: 13 }}>
            Select a patient from the dropdown above to view their data.
          </p>
        </div>
      ) : (
        <>
          <WeeklyGrid
            onDayClick={(day, date) => setSelectedDay({ key: day, date })}
            parentNotes={parentNotes}
            onMarkNoteRead={handleMarkNoteRead}
            parentMealItems={parentMealItems}
            mealStatuses={parentMealStatuses}
          />
          <WeeklyInsights allMealItems={parentMealItems} mealStatuses={parentMealStatuses} />
          <ClinicianDigestSection
            key={viewingPatientUid}
            allMealItems={parentMealItems}
            mealStatuses={parentMealStatuses}
            parentNotes={parentNotes}
          />
          <ParentNotesPanel notes={parentNotes} onMarkRead={handleMarkNoteRead} />
          <WeeklyGoals allMealItems={parentMealItems} />
          <ClinicianSupplementEditor
            prescribedSupplements={prescribedSupplements}
            onSave={savePrescribedSupplements}
          />
          <NutritionalTargets />
          <NotesPanel
            notes={clinicianNotes}
            mode="clinician"
            onSave={handleSaveNote}
            notesReadByParent={clinicianNotesRead}
          />
        </>
      )}

      {selectedDay && (
        <DailyNutritionSummary
          day={selectedDay.key}
          loggedMealItems={parentMealItems[selectedDay.date] || {}}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

function ParentNotesPanel({ notes = [], onMarkRead }) {
  const sorted = [...notes].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const unreadCount = sorted.filter(n => !n.read_at).length

  return (
    <div style={{
      background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb',
      padding: '20px 24px', marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Parent Notes</h2>
        {unreadCount > 0 && (
          <span style={{
            background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700,
            borderRadius: 20, padding: '2px 8px', border: '1px solid #fde68a',
          }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No notes from the parent yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(note => {
            const isUnread = !note.read_at
            return (
              <div key={note.date} style={{
                background: isUnread ? '#fffbeb' : '#f9fafb',
                border: `1.5px solid ${isUnread ? '#fde68a' : '#e5e7eb'}`,
                borderRadius: 12, padding: '12px 14px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>
                      {new Date(note.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {isUnread && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>● New</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{note.body}</p>
                </div>
                {isUnread ? (
                  <button
                    onClick={() => onMarkRead?.(note.id)}
                    style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#d97706',
                      background: 'none', border: '1px solid #fde68a', borderRadius: 8,
                      padding: '4px 10px', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                    }}
                  >Mark read</button>
                ) : (
                  <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600, flexShrink: 0 }}>✓ Read</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
