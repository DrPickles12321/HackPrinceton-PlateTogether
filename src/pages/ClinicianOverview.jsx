import { useOutletContext } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { RevealSection } from './ClinicianView'
import WeeklyGrid from '../components/WeeklyGrid'
import SosAlert from '../components/SosAlert'

export default function ClinicianOverview() {
  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    markPatientParentNoteReadById,
    patients,
    viewingPatientUid,
    patientSos,
    acknowledgeSos,
  } = useFirebaseData()
  const { setSelectedDay } = useOutletContext()

  return (
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
    </>
  )
}
