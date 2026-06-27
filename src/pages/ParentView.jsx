import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import MobileTabBar from '../components/MobileTabBar'

export default function ParentView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const isMobile = useIsMobile()

  const {
    allMealItems,
    mealStatuses,
    parentNotesArray: parentNotes,
    saveParentNote,
    clinicianNotesRead,
    markClinicianNoteRead,
    savedClinicianNotes,
    saveClinicianNote,
    unsaveClinicianNote,
    clearAllSavedNotes,
    setMealStatus,
    clinicianNotes,
  } = useFirebaseData()

  useEffect(() => {
    document.title = 'My Week · Plate Together'
  }, [])

  return (
    <>
      <div style={{ width: '100%', padding: isMobile ? '4px 0 76px' : '16px 24px' }}>
        <Outlet context={{ clinicianNotes, parentNotes, clinicianNotesRead, mealStatuses, savedClinicianNotes, allMealItems, weekOffset, setWeekOffset, saveParentNote, markClinicianNoteRead, saveClinicianNote, unsaveClinicianNote, clearAllSavedNotes, setMealStatus }} />
      </div>
      {isMobile && <MobileTabBar />}
    </>
  )
}
