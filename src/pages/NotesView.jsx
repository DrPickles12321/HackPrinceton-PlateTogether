import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { ParentNoteSection, ClinicianNotesSidebar } from './DailyView'

const TODAY_ISO = new Date().toISOString().slice(0, 10)

export default function NotesView() {
  const {
    clinicianNotes = [], parentNotes = [], clinicianNotesRead = {}, savedClinicianNotes = [],
    saveParentNote, markClinicianNoteRead, saveClinicianNote, unsaveClinicianNote, clearAllSavedNotes,
  } = useOutletContext()
  const isMobile = useIsMobile()

  useEffect(() => { document.title = 'Notes · Plate Together' }, [])

  const todayNote = parentNotes.find(n => n.date === TODAY_ISO) || null

  return (
    <div style={{ padding: isMobile ? '6px 14px 24px' : '24px 32px', maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <h2 className="font-lora" style={{ fontSize: isMobile ? 23 : 26, fontWeight: isMobile ? 600 : 400, color: 'var(--text-dark)', margin: '6px 0 2px', lineHeight: 1.1 }}>
        Notes
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 18px' }}>
        From your care team · and your own
      </p>

      <ClinicianNotesSidebar
        clinicianNotes={clinicianNotes}
        clinicianNotesRead={clinicianNotesRead}
        markClinicianNoteRead={markClinicianNoteRead}
        savedClinicianNotes={savedClinicianNotes}
        saveClinicianNote={saveClinicianNote}
        unsaveClinicianNote={unsaveClinicianNote}
        clearAllSavedNotes={clearAllSavedNotes}
      />

      <ParentNoteSection
        note={todayNote}
        selectedDate={TODAY_ISO}
        onSave={body => saveParentNote({ date: TODAY_ISO, body, existingNoteId: todayNote?.id || null })}
      />
    </div>
  )
}
