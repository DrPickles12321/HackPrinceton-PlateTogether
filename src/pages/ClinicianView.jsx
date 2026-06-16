import { useEffect, useRef, useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { generateClinicianDigest } from '../lib/aiInsights'
import { getWeekIsoDates } from '../lib/insights'
import WeeklyGrid from '../components/WeeklyGrid'
import WeeklyInsights from '../components/WeeklyInsights'
import NotesPanel from '../components/NotesPanel'
import DailyNutritionSummary from '../components/nutrition/DailyNutritionSummary'
import WeeklyGoals from '../components/WeeklyGoals'
import NutritionalTargets from '../components/NutritionalTargets'

function useReveal(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('clv-visible'); obs.disconnect() } },
      { threshold: 0.06 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

function RevealSection({ children, eyebrow, delay = 0, style = {} }) {
  const ref = useRef(null)
  useReveal(ref)
  return (
    <section
      ref={ref}
      className={`clv-reveal${delay ? ` d${delay}` : ''}`}
      style={{ marginTop: 32, ...style }}
    >
      {eyebrow && <span className="clv-eyebrow">{eyebrow}</span>}
      {children}
    </section>
  )
}

const DIGEST_ACCENT = {
  pattern:     'var(--border-mid)',
  improvement: 'var(--mint)',
  watch:       'var(--coral)',
}
const DIGEST_TYPE_LABEL = {
  pattern:     'Pattern',
  improvement: 'Progress',
  watch:       'Watch',
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
            AI summary for a quick pre-session scan
          </p>
        </div>
        <button className={`clv-pill-btn${digest ? '' : ' filled'}`} onClick={load} disabled={loading}>
          {loading ? 'Generating…' : digest ? 'Regenerate' : 'Generate digest'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: 'var(--coral)', marginTop: 4 }}>
          Could not generate digest. Try again in a moment.
        </p>
      )}

      {!loading && !error && digest === null && (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          Click "Generate digest" to summarize this patient's week.
        </p>
      )}

      {digest && digest.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          No meals logged this week yet.
        </p>
      )}

      {digest && digest.length > 0 && (
        <div>
          {digest.map((item, i) => {
            const accent = DIGEST_ACCENT[item.type] || DIGEST_ACCENT.pattern
            const typeLabel = DIGEST_TYPE_LABEL[item.type] || item.type
            return (
              <div key={i} className="clv-digest-item">
                <div className="clv-digest-accent" style={{ background: accent }} />
                <div style={{ flex: 1 }}>
                  <span style={{
                    display: 'inline-block', fontSize: 9, fontWeight: 700,
                    letterSpacing: '1.2px', textTransform: 'uppercase',
                    color: accent === 'var(--border-mid)' ? 'var(--text-light)' : accent,
                    marginBottom: 4,
                  }}>
                    {typeLabel}
                  </span>
                  <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.65 }}>{item.text}</p>
                </div>
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
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
        Supplements appear in the patient's daily checklist.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. Calcium + D3"
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 999,
            border: '1.5px solid var(--border)', fontSize: 13,
            color: 'var(--text-dark)', fontFamily: 'inherit', outline: 'none',
            background: 'var(--surface)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--coral)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="clv-pill-btn filled"
        >
          {saved ? 'Added' : 'Add'}
        </button>
      </div>
      {prescribedSupplements.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          No supplements prescribed yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {prescribedSupplements.map(name => (
            <span key={name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--coral-light)', borderRadius: 999,
              padding: '5px 14px', fontSize: 13, color: 'var(--coral)',
              fontWeight: 500, border: '1px solid var(--coral-mid)',
            }}>
              {name}
              <button
                onClick={() => handleRemove(name)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--coral)', fontSize: 15, lineHeight: 1,
                  padding: 0, display: 'flex', alignItems: 'center', opacity: 0.6,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ParentNotesPanel({ notes = [], onMarkRead }) {
  const sorted = [...notes].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const unreadCount = sorted.filter(n => !n.read_at).length

  return (
    <div>
      {unreadCount > 0 && (
        <span style={{
          display: 'inline-block', marginBottom: 12,
          fontSize: 10, fontWeight: 700, letterSpacing: '1px',
          textTransform: 'uppercase', color: 'var(--peach)',
          background: 'var(--peach-light)', borderRadius: 999,
          padding: '3px 10px', border: '1px solid var(--peach-mid)',
        }}>
          {unreadCount} unread
        </span>
      )}

      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          No notes from the parent yet.
        </p>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {sorted.map(note => {
            const isUnread = !note.read_at
            return (
              <div key={note.date} className="clv-timeline-item">
                <div className="clv-timeline-date">
                  {new Date(note.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </div>
                <div>
                  {isUnread && (
                    <span style={{
                      display: 'inline-block', fontSize: 9, fontWeight: 700,
                      letterSpacing: '1px', textTransform: 'uppercase',
                      color: 'var(--peach)', marginBottom: 4,
                    }}>New</span>
                  )}
                  <p style={{
                    fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.6,
                    fontStyle: isUnread ? 'normal' : 'normal',
                    fontWeight: isUnread ? 500 : 400,
                  }}>
                    {note.body}
                  </p>
                </div>
                <div style={{ paddingTop: 2 }}>
                  {isUnread ? (
                    <button
                      onClick={() => onMarkRead?.(note.id)}
                      className="clv-pill-btn"
                      style={{ fontSize: 11, padding: '4px 12px' }}
                    >
                      Mark read
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 600 }}>
                      Read
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      padding: '24px 28px',
      ...style,
    }}>
      {children}
    </div>
  )
}

export default function ClinicianView() {
  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    clinicianNotesRead,
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

  const [addCodeInput, setAddCodeInput] = useState('')
  const [addCodeError, setAddCodeError]  = useState('')
  const [addCodeLoading, setAddCodeLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => { document.title = 'Dashboard · Plate Together' }, [])

  async function handleAddPatient(e) {
    e.preventDefault()
    setAddCodeError('')
    setAddCodeLoading(true)
    const result = await addPatientByCode(addCodeInput)
    setAddCodeLoading(false)
    if (result.error) { setAddCodeError(result.error) }
    else { setAddCodeInput('') }
  }

  function handleSaveNote({ body, existingNoteId }) {
    writeClinicianNote({ body, existingNoteId })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 80px' }}>

      {/* ── Patient control bar ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 24,
        flexWrap: 'wrap', marginBottom: 40,
        paddingBottom: 24, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-light)' }}>
            Viewing patient
          </label>
          <select
            value={viewingPatientUid || ''}
            onChange={e => setViewingPatientUid(e.target.value || null)}
            style={{
              padding: '8px 14px', borderRadius: 999,
              border: '1.5px solid var(--border)', fontSize: 13,
              color: 'var(--text-dark)', background: 'var(--surface)',
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
              minWidth: 200,
            }}
          >
            <option value="">— Select a patient —</option>
            {patients.map(p => (
              <option key={p.uid} value={p.uid}>{p.email}</option>
            ))}
          </select>
        </div>

        <div style={{ width: 1, background: 'var(--border)', height: 40, alignSelf: 'flex-end', marginBottom: 2 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-light)' }}>
            Add by family code
          </label>
          <form onSubmit={handleAddPatient} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={addCodeInput}
              onChange={e => { setAddCodeInput(e.target.value.toUpperCase()); setAddCodeError('') }}
              placeholder="ABC123"
              maxLength={6}
              style={{
                padding: '8px 14px', borderRadius: 999,
                border: '1.5px solid var(--border)', fontSize: 13,
                color: 'var(--text-dark)', fontFamily: 'inherit',
                outline: 'none', width: 100, letterSpacing: '2px', fontWeight: 600,
                background: 'var(--surface)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--coral)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              type="submit"
              disabled={addCodeLoading || addCodeInput.length < 6}
              className="clv-pill-btn filled"
            >
              {addCodeLoading ? '…' : 'Add'}
            </button>
          </form>
          {addCodeError && (
            <span style={{ fontSize: 12, color: 'var(--coral)', marginTop: 2 }}>{addCodeError}</span>
          )}
        </div>
      </div>

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <h1 className="font-lora" style={{ fontSize: 32, fontWeight: 400, color: 'var(--text-dark)', letterSpacing: '-0.3px' }}>
          Clinician Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 6 }}>
          Weekly meal plan and session notes for your patient
        </p>
      </div>

      {/* ── No patient selected ─────────────────────────────────────────── */}
      {!viewingPatientUid ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          color: 'var(--text-light)', fontSize: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--surface-warm)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 20,
          }}>
            ⊕
          </div>
          <p style={{ fontWeight: 500, color: 'var(--text-mid)', fontSize: 15, marginBottom: 6 }}>
            No patient selected
          </p>
          <p style={{ fontSize: 13 }}>
            Select a patient from the dropdown above to view their data.
          </p>
        </div>
      ) : (
        <>
          <RevealSection eyebrow="Week at a glance">
            <SectionCard>
              <WeeklyGrid
                onDayClick={(day, date) => setSelectedDay({ key: day, date })}
                parentNotes={parentNotes}
                onMarkNoteRead={markPatientParentNoteReadById}
                parentMealItems={parentMealItems}
                mealStatuses={parentMealStatuses}
              />
            </SectionCard>
          </RevealSection>

          <RevealSection eyebrow="Progress" delay={1}>
            <SectionCard>
              <WeeklyInsights allMealItems={parentMealItems} mealStatuses={parentMealStatuses} />
            </SectionCard>
          </RevealSection>

          <RevealSection eyebrow="Clinical digest">
            <SectionCard>
              <ClinicianDigestSection
                key={viewingPatientUid}
                allMealItems={parentMealItems}
                mealStatuses={parentMealStatuses}
                parentNotes={parentNotes}
              />
            </SectionCard>
          </RevealSection>

          <RevealSection eyebrow="Parent notes" delay={1}>
            <SectionCard>
              <ParentNotesPanel notes={parentNotes} onMarkRead={markPatientParentNoteReadById} />
            </SectionCard>
          </RevealSection>

          <RevealSection eyebrow="Weekly goals">
            <SectionCard>
              <WeeklyGoals allMealItems={parentMealItems} />
            </SectionCard>
          </RevealSection>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 32 }}>
            <RevealSection eyebrow="Supplements" style={{ marginTop: 0 }}>
              <SectionCard style={{ height: '100%' }}>
                <ClinicianSupplementEditor
                  prescribedSupplements={prescribedSupplements}
                  onSave={savePrescribedSupplements}
                />
              </SectionCard>
            </RevealSection>
            <RevealSection eyebrow="Nutritional targets" delay={1} style={{ marginTop: 0 }}>
              <SectionCard style={{ height: '100%' }}>
                <NutritionalTargets />
              </SectionCard>
            </RevealSection>
          </div>

          <RevealSection eyebrow="Session notes">
            <SectionCard>
              <NotesPanel
                notes={clinicianNotes}
                mode="clinician"
                onSave={handleSaveNote}
                notesReadByParent={clinicianNotesRead}
              />
            </SectionCard>
          </RevealSection>
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
