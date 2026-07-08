import { useMemo } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { RevealSection, SectionCard, ClinicianDigestSection } from './ClinicianView'
import WeeklyInsights from '../components/WeeklyInsights'
import TrendChart from '../components/TrendChart'
import { computeWeeklyTrend } from '../lib/trends'
import { computeDistressSummary } from '../lib/weekSummary'
import { computeMealTiming } from '../lib/mealTiming'
import { generateClinicianDigest } from '../lib/aiInsights'
import { getWeekIsoDates } from '../lib/insights'
import { detectWeeklyAnomalies } from '../lib/anomalyDetection'

export default function ClinicianInsights() {
  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    mealDistress: parentMealDistress,
    activeMealTimesByDate: parentMealTimesByDate,
    viewingPatientUid,
  } = useFirebaseData()

  const trend = useMemo(() => computeWeeklyTrend({ mealStatuses: parentMealStatuses }), [parentMealStatuses])
  const distressSummary = useMemo(
    () => computeDistressSummary(parentMealDistress, getWeekIsoDates(0)),
    [parentMealDistress]
  )
  const mealTiming = useMemo(
    () => computeMealTiming(parentMealTimesByDate, parentMealStatuses, parentMealItems, getWeekIsoDates(0)),
    [parentMealTimesByDate, parentMealStatuses, parentMealItems]
  )

  return (
    <>
      <RevealSection eyebrow="Progress">
        <WeeklyInsights allMealItems={parentMealItems} mealStatuses={parentMealStatuses} />
      </RevealSection>

      <RevealSection eyebrow="Eating rhythm" delay={1}>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>Meal-time regularity</div>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Consistent timing supports recovery</span>
          </div>
          {mealTiming.evaluatedCount === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>
              Not enough logged days yet to gauge timing.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 14px' }}>
                <strong style={{ color: 'var(--text-dark)' }}>{mealTiming.consistentCount} of {mealTiming.evaluatedCount}</strong> meals kept a steady time this week.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {mealTiming.meals.filter(m => m.loggedDays > 0).map(m => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{m.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', width: 78 }}>{m.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>~{m.typicalTime}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-light)' }}>· {m.loggedDays} day{m.loggedDays === 1 ? '' : 's'}</span>
                    {m.loggedDays >= 2 && (
                      <span style={{
                        marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 8,
                        color: m.consistent ? 'var(--mint)' : 'var(--peach)',
                        background: m.consistent ? 'var(--mint-light)' : 'var(--peach-light)',
                        border: `1px solid ${m.consistent ? 'var(--mint-mid)' : 'var(--peach-mid)'}`,
                      }}>
                        {m.consistent ? 'steady' : `varies ±${Math.round(m.spreadMin / 60 * 10) / 10}h`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </RevealSection>

      <RevealSection eyebrow="Progress over time">
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>Last 6 weeks</div>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Meals logged and okay-rate per week</span>
          </div>
          {distressSummary.count > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
              background: 'var(--surface-warm)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '7px 12px', fontSize: 13, color: 'var(--text-mid)',
            }}>
              <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>Distress this week:</span>
              before {distressSummary.avgPre ?? '—'} → after {distressSummary.avgPost ?? '—'}
              <span style={{ fontSize: 11, color: 'var(--text-light)' }}>({distressSummary.count} rated, 1–5)</span>
            </div>
          )}
          {trend.some(w => w.logged > 0)
            ? <TrendChart trend={trend} />
            : <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>No logged weeks yet.</p>}
        </SectionCard>
      </RevealSection>

      <RevealSection eyebrow="Clinical digest" delay={1}>
        <SectionCard>
          <ClinicianDigestSection
            key={viewingPatientUid}
            allMealItems={parentMealItems}
            mealStatuses={parentMealStatuses}
            mealTimesByDate={parentMealTimesByDate}
            parentNotes={parentNotes}
            generateClinicianDigest={generateClinicianDigest}
            getWeekIsoDates={getWeekIsoDates}
            detectWeeklyAnomalies={detectWeeklyAnomalies}
          />
        </SectionCard>
      </RevealSection>
    </>
  )
}
