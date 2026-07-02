import { useEffect, useMemo, useRef, useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { computeWeeklyTrend } from '../lib/trends'
import TrendChart from '../components/TrendChart'
import { generateClinicianDigest } from '../lib/aiInsights'
import { getWeekIsoDates } from '../lib/insights'
import { detectWeeklyAnomalies } from '../lib/anomalyDetection'
import WeeklyGrid from '../components/WeeklyGrid'
import WeeklyInsights from '../components/WeeklyInsights'
import NotesPanel from '../components/NotesPanel'
import DailyNutritionSummary from '../components/nutrition/DailyNutritionSummary'
import WeeklyGoals from '../components/WeeklyGoals'
import NutritionalTargets from '../components/NutritionalTargets'
import SosAlert from '../components/SosAlert'
import { useIsMobile } from '../hooks/useIsMobile'

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

function ClinicianDigestSection({ allMealItems, mealStatuses, mealTimesByDate = {}, parentNotes }) {
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
    const anomalies = detectWeeklyAnomalies({ allMealItems, mealStatuses, mealTimesByDate })

    setLoading(true)
    setError(null)
    generateClinicianDigest({
      mealItemsByDate: thisWeekItems,
      mealStatusesByDate: thisWeekStatuses,
      parentNotes: thisWeekNotes,
      anomalies,
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
    activeMealTimesByDate: parentMealTimesByDate,
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
    patientSos,
    patientsWithOpenSos,
    acknowledgeSos,
  } = useFirebaseData()

  const [addCodeInput, setAddCodeInput] = useState('')
  const [addCodeError, setAddCodeError]  = useState('')
  const [addCodeLoading, setAddCodeLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const trend = useMemo(() => computeWeeklyTrend({ mealStatuses: parentMealStatuses }), [parentMealStatuses])
  const isMobile = useIsMobile()

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
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '28px 16px 64px' : '52px 48px 80px' }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: isMobile ? 24 : 40,
        flexWrap: 'wrap',
        paddingBottom: isMobile ? 28 : 44,
        borderBottom: '1px solid var(--border)',
        marginBottom: isMobile ? 32 : 52,
      }}>
        {/* Title column */}
        <div>
          <span className="clv-eyebrow">Plate Together</span>
          <h1 className="font-lora" style={{
            fontSize: isMobile ? 30 : 42, fontWeight: 400, color: 'var(--text-dark)',
            letterSpacing: '-0.6px', lineHeight: 1.1, marginBottom: 10,
          }}>
            Clinician Dashboard
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.5 }}>
            Weekly meal review and session planning
          </p>
        </div>

        {/* Controls column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: isMobile ? 'stretch' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-light)' }}>
              Viewing patient
            </label>
            <select
              value={viewingPatientUid || ''}
              onChange={e => setViewingPatientUid(e.target.value || null)}
              style={{
                padding: '9px 36px 9px 16px', borderRadius: 999,
                border: '1.5px solid var(--border)', fontSize: 13,
                color: 'var(--text-dark)', background: 'var(--surface)',
                fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                minWidth: isMobile ? 0 : 230, width: isMobile ? '100%' : 'auto', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A88C78' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
              }}
            >
              <option value="">— Select a patient —</option>
              {patients.map(p => (
                <option key={p.uid} value={p.uid}>{patientsWithOpenSos[p.uid] ? '🆘 ' : ''}{p.email}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-light)' }}>
              Add by family code
            </label>
            <form onSubmit={handleAddPatient} style={{ display: 'flex', gap: 8, alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
              <input
                value={addCodeInput}
                onChange={e => { setAddCodeInput(e.target.value.toUpperCase()); setAddCodeError('') }}
                placeholder="ABCD2345"
                maxLength={8}
                style={{
                  padding: '9px 16px', borderRadius: 999,
                  border: '1.5px solid var(--border)', fontSize: 13,
                  color: 'var(--text-dark)', fontFamily: 'inherit',
                  outline: 'none', width: isMobile ? 'auto' : 120, flex: isMobile ? 1 : 'none', letterSpacing: '2px', fontWeight: 600,
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
      </div>

      {/* ── No patient selected ─────────────────────────────────────────── */}
      {!viewingPatientUid ? (
        <div style={{ padding: '16px 0 40px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-light)', letterSpacing: '0.2px' }}>
            Select a patient above to view their weekly data.
          </p>
        </div>
      ) : (
        <>
          <SosAlert
            sos={patientSos}
            patientEmail={patients.find(p => p.uid === viewingPatientUid)?.email || 'Patient'}
            onAcknowledge={acknowledgeSos}
          />
          <RevealSection eyebrow="Week at a glance">
            <WeeklyGrid
              onDayClick={(day, date) => setSelectedDay({ key: day, date })}
              parentNotes={parentNotes}
              onMarkNoteRead={markPatientParentNoteReadById}
              parentMealItems={parentMealItems}
              mealStatuses={parentMealStatuses}
            />
          </RevealSection>

          <RevealSection eyebrow="Progress" delay={1}>
            <WeeklyInsights allMealItems={parentMealItems} mealStatuses={parentMealStatuses} />
          </RevealSection>

          <RevealSection eyebrow="Progress over time">
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>Last 6 weeks</div>
                <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Meals logged and okay-rate per week</span>
              </div>
              {trend.some(w => w.logged > 0)
                ? <TrendChart trend={trend} />
                : <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>No logged weeks yet.</p>}
            </SectionCard>
          </RevealSection>

          <RevealSection eyebrow="Clinical digest">
            <SectionCard>
              <ClinicianDigestSection
                key={viewingPatientUid}
                allMealItems={parentMealItems}
                mealStatuses={parentMealStatuses}
                mealTimesByDate={parentMealTimesByDate}
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

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginTop: 32 }}>
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
