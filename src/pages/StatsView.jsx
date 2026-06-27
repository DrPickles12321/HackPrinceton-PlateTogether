import { useMemo, useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { generateWeeklyInsights } from '../lib/aiInsights'
import { getWeekIsoDates } from '../lib/insights'
import { detectWeeklyAnomalies } from '../lib/anomalyDetection'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }

function computeWeekStats(weekStatuses, allMealItems, weekDates) {
  const total     = weekStatuses.length
  const okay      = weekStatuses.filter(s => s.status === 'okay').length
  const difficult = weekStatuses.filter(s => s.status === 'difficult').length
  const refused   = weekStatuses.filter(s => s.status === 'refused').length
  const skipped   = weekStatuses.filter(s => s.status === 'skipped').length

  const challengeAttempts = weekStatuses.filter(({ date, mealType }) => {
    const items = (allMealItems[date] || {})[mealType] || []
    return items.some(f => f.category === 'challenge')
  }).length
  const challengeMeals = weekDates.flatMap(date =>
    Object.entries(allMealItems[date] || {}).filter(([, items]) =>
      items.some(f => f.category === 'challenge')
    )
  ).length
  const ringPct = challengeMeals > 0 ? Math.round((challengeAttempts / challengeMeals) * 100) : 0

  const hardByMeal = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }
  const totalByMeal = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }
  for (const { mealType, status } of weekStatuses) {
    totalByMeal[mealType] = (totalByMeal[mealType] || 0) + 1
    if (status === 'difficult' || status === 'refused') {
      hardByMeal[mealType] = (hardByMeal[mealType] || 0) + 1
    }
  }
  let hardestMeal = null, hardestPct = 0
  for (const [mt, count] of Object.entries(hardByMeal)) {
    const t = totalByMeal[mt] || 0
    const pct = t > 0 ? Math.round((count / t) * 100) : 0
    if (pct > hardestPct || (pct === hardestPct && hardestMeal === null)) {
      hardestPct = pct
      hardestMeal = mt
    }
  }
  if (hardestMeal === null) {
    hardestMeal = Object.keys(totalByMeal).find(mt => totalByMeal[mt] > 0) || 'Dinner'
  }

  const successRate = total > 0 ? Math.round((okay / total) * 100) : 0
  return { total, okay, difficult, refused, skipped, ringPct, challengeAttempts, challengeSlots: challengeMeals, hardestMeal, hardestPct, successRate }
}

function ProgressStat({ label, current, previous, unit = '', inverse = false }) {
  const delta = current - previous
  const arrow = delta === 0 ? '→' : delta > 0 ? '↑' : '↓'
  const isPositive = inverse ? delta < 0 : delta > 0
  const color = delta === 0 ? 'var(--text-light)' : isPositive ? 'var(--mint)' : 'var(--coral)'

  return (
    <div style={{
      background: 'var(--surface-warm)', borderRadius: 14, border: '1px solid var(--border)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="font-lora" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text-dark)' }}>
          {current}{unit}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>
          {arrow} {Math.abs(delta)}{unit}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
        vs {previous}{unit} last week
      </div>
    </div>
  )
}


const INSIGHT_STYLES = {
  positive: { bg: 'var(--mint-light)', border: 'var(--mint-mid)' },
  tip:      { bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
  notice:   { bg: 'var(--coral-light)', border: '#fecaca' },
}

function AIInsightsSection({ weekStatuses, allMealItems = {}, mealStatuses = {}, mealTimesByDate = {} }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const loadedRef = useRef(false)

  const thisWeekItems = useMemo(() => {
    const weekDates = new Set(getWeekIsoDates(0))
    return Object.fromEntries(
      Object.entries(allMealItems).filter(([date]) => weekDates.has(date))
    )
  }, [allMealItems])

  const hasFoods = useMemo(
    () => Object.values(thisWeekItems).some(d => Object.values(d).flat().length > 0),
    [thisWeekItems]
  )

  function load() {
    const statusCounts = {
      okay: weekStatuses.filter(s => s.status === 'okay').length,
      difficult: weekStatuses.filter(s => s.status === 'difficult').length,
      refused: weekStatuses.filter(s => s.status === 'refused').length,
      skipped: weekStatuses.filter(s => s.status === 'skipped').length,
    }
    const anomalies = detectWeeklyAnomalies({ allMealItems, mealStatuses, mealTimesByDate })
    setLoading(true)
    setError(null)
    generateWeeklyInsights({ parentMealItemsByDate: thisWeekItems, mealLogs: statusCounts, anomalies })
      .then(result => { setInsights(result); setLoading(false) })
      .catch(err => { console.error('AI insights error:', err); setError(true); setLoading(false) })
  }

  useEffect(() => {
    if (hasFoods && !loadedRef.current) {
      loadedRef.current = true
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFoods])

  if (!loading && !error && !insights) return null

  return (
    <div style={{
      background: 'white', borderRadius: 22, border: '1.5px solid var(--border)',
      padding: '28px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)', marginTop: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 20 }}>✨</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)' }}>AI Encouragement</div>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>A few kind words about this week</div>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)', fontSize: 13 }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          Thinking of something nice to say…
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>Could not load right now.</span>
          <button onClick={load} style={{
            background: 'none', border: '1px solid var(--border-mid)', borderRadius: 8,
            padding: '4px 12px', fontSize: 12, color: 'var(--coral)', cursor: 'pointer',
            fontFamily: "'Lato', sans-serif", fontWeight: 600,
          }}>Retry</button>
        </div>
      )}

      {!loading && !error && insights && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {insights.map((item, i) => {
            const s = INSIGHT_STYLES[item.type] || INSIGHT_STYLES.tip
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: s.bg, borderRadius: 14, border: `1px solid ${s.border}`,
                padding: '14px 16px',
              }}>
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.65 }}>{item.text}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function StatsView() {
  const { mealStatuses = {}, allMealItems = {} } = useOutletContext()
  const { mealTimesByDate = {} } = useFirebaseData()
  const isMobile = useIsMobile()

  const thisWeekDates = useMemo(() => getWeekIsoDates(0), [])
  const lastWeekDates = useMemo(() => getWeekIsoDates(-1), [])

  const thisWeekStatuses = useMemo(() => {
    return thisWeekDates.flatMap(date =>
      Object.entries(mealStatuses[date] || {}).map(([mealType, status]) => ({ date, mealType, status }))
    )
  }, [mealStatuses, thisWeekDates])

  const lastWeekStatuses = useMemo(() => {
    return lastWeekDates.flatMap(date =>
      Object.entries(mealStatuses[date] || {}).map(([mealType, status]) => ({ date, mealType, status }))
    )
  }, [mealStatuses, lastWeekDates])

  const stats = useMemo(
    () => computeWeekStats(thisWeekStatuses, allMealItems, thisWeekDates),
    [thisWeekStatuses, allMealItems, thisWeekDates]
  )

  const lastWeekStats = useMemo(
    () => computeWeekStats(lastWeekStatuses, allMealItems, lastWeekDates),
    [lastWeekStatuses, allMealItems, lastWeekDates]
  )

  const hasLastWeekData = lastWeekStats.total > 0

  const circumference = 2 * Math.PI * 38

  const messages = [
    stats.okay > stats.difficult
      ? `You're doing great — ${stats.okay} meals went well this week! 🌱`
      : `Every meal is progress. Keep going — you've got this! 💪`,
    stats.difficult > 0
      ? `${stats.difficult} hard moments this week. That takes courage.`
      : null,
    stats.ringPct >= 50 ? `Wow — ${stats.ringPct}% of challenge foods attempted!` : null,
  ].filter(Boolean)

  if (isMobile) {
    const pills = [
      { label: 'Okay %',   value: `${stats.successRate}%`, color: '#E8735A',          bg: '#FDF1EE',            border: '#F5C4B4' },
      { label: 'Logged',   value: stats.total,              color: 'var(--text-dark)', bg: 'white',              border: 'var(--border)' },
      { label: 'Okay',     value: stats.okay,               color: 'var(--mint)',      bg: 'var(--mint-light)',  border: 'var(--mint-mid)' },
      { label: 'Difficult',value: stats.difficult,          color: 'var(--peach)',     bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
      { label: 'Refused',  value: stats.refused,            color: 'var(--pink)',      bg: 'var(--pink-light)',  border: 'var(--pink-mid)' },
      { label: 'Skipped',  value: stats.skipped,            color: '#8a7568',          bg: '#f1ece3',            border: '#ddd0bd' },
    ]
    return (
      <div style={{ padding: '6px 14px 24px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <h2 className="font-lora" style={{ fontSize: 23, fontWeight: 600, color: 'var(--text-dark)', margin: '6px 0 2px', lineHeight: 1.1 }}>
          Weekly Insights
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 16px' }}>A gentle look at this week's progress</p>

        {/* Challenge ring */}
        <div style={{ background: 'white', borderRadius: 18, border: '1.5px solid var(--border)', padding: '22px', boxShadow: '0 2px 12px rgba(39,23,6,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.7px', textTransform: 'uppercase' }}>Challenge Attempts</div>
          <div style={{ position: 'relative' }}>
            <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={48} cy={48} r={38} fill="none" stroke="var(--border)" strokeWidth={9} />
              <circle cx={48} cy={48} r={38} fill="none" stroke="var(--coral)" strokeWidth={9} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - stats.ringPct / 100)} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--coral)', lineHeight: 1 }}>{stats.ringPct}%</span>
            </div>
          </div>
          <div style={{ background: 'var(--coral-light)', borderRadius: 10, padding: '6px 16px', fontSize: 12, color: 'var(--coral)', fontWeight: 600, border: '1px solid var(--coral-mid)' }}>
            Attempted: {stats.challengeAttempts}
          </div>
        </div>

        {/* Supportive message */}
        <div style={{ background: 'linear-gradient(148deg, var(--peach-light) 0%, var(--pink-light) 100%)', borderRadius: 18, border: '1.5px solid var(--border)', padding: '20px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 10 }}>Supportive Message</div>
          <p className="font-lora" style={{ fontSize: 17, color: 'var(--text-dark)', lineHeight: 1.55, margin: '0 0 12px', fontStyle: 'italic' }}>"{messages[0]}"</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: 'white', borderRadius: 9, padding: '4px 11px', fontSize: 12, color: 'var(--mint)', fontWeight: 600, border: '1px solid var(--mint-mid)' }}>✓ {stats.okay} okay</span>
            {stats.difficult > 0 && (
              <span style={{ background: 'white', borderRadius: 9, padding: '4px 11px', fontSize: 12, color: 'var(--peach)', fontWeight: 600, border: '1px solid var(--peach-mid)' }}>{stats.difficult} hard</span>
            )}
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {pills.map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: '16px 8px', border: `1.5px solid ${s.border}`, textAlign: 'center' }}>
              <div className="font-lora" style={{ fontSize: 30, fontWeight: 400, color: s.color, lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hardest meal */}
        <div style={{ background: 'white', borderRadius: 18, border: '1.5px solid var(--border)', padding: '20px', boxShadow: '0 2px 12px rgba(39,23,6,0.05)', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 12 }}>Most Logged Difficulty</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--pink-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>😰</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.2 }}>{MEAL_LABELS[stats.hardestMeal] || 'Dinner'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{stats.hardestPct}% difficult</div>
            </div>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--pink) 0%, var(--coral) 100%)', width: `${stats.hardestPct}%`, transition: 'width 0.7s ease' }} />
          </div>
        </div>

        {/* Weekly progress */}
        {hasLastWeekData && (
          <div style={{ background: 'white', borderRadius: 18, border: '1.5px solid var(--border)', padding: '20px', boxShadow: '0 2px 12px rgba(39,23,6,0.05)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 14 }}>Weekly Progress</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <ProgressStat label="Okay Meals" current={stats.successRate} previous={lastWeekStats.successRate} unit="%" />
              <ProgressStat label="Meals Logged" current={stats.total} previous={lastWeekStats.total} />
              <ProgressStat label="Difficult" current={stats.difficult} previous={lastWeekStats.difficult} inverse />
              <ProgressStat label="Challenges Tried" current={stats.ringPct} previous={lastWeekStats.ringPct} unit="%" />
            </div>
          </div>
        )}

        <AIInsightsSection weekStatuses={thisWeekStatuses} allMealItems={allMealItems} mealStatuses={mealStatuses} mealTimesByDate={mealTimesByDate} />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 30 }}>
          <h2 className="font-lora" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text-dark)', marginBottom: 5, lineHeight: 1.15 }}>
            Weekly Insights
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>A gentle look at this week's progress</p>
        </div>

        {/* 3 main cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 22 }}>

          {/* Card 1: Challenge ring */}
          <div style={{
            background: 'white', borderRadius: 22, border: '1.5px solid var(--border)',
            padding: '28px 22px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase',
            }}>Challenge Attempts</div>

            <div style={{ position: 'relative' }}>
              <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={48} cy={48} r={38} fill="none" stroke="var(--border)" strokeWidth={9} />
                <circle
                  cx={48} cy={48} r={38} fill="none"
                  stroke="var(--coral)" strokeWidth={9}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - stats.ringPct / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--coral)', lineHeight: 1 }}>
                  {stats.ringPct}%
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--coral-light)', borderRadius: 10,
              padding: '6px 16px', fontSize: 12, color: 'var(--coral)', fontWeight: 600,
              border: '1px solid var(--coral-mid)',
            }}>
              Attempted: {stats.challengeAttempts}
            </div>
          </div>

          {/* Card 2: Supportive message */}
          <div style={{
            background: 'linear-gradient(148deg, var(--peach-light) 0%, var(--pink-light) 100%)',
            borderRadius: 22, border: '1.5px solid var(--border)',
            padding: '28px 22px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-mid)',
              letterSpacing: '0.7px', textTransform: 'uppercase',
            }}>Supportive Message</div>

            <p className="font-lora" style={{
              fontSize: 17, color: 'var(--text-dark)', fontWeight: 400,
              lineHeight: 1.6, margin: 0, fontStyle: 'italic',
            }}>
              "{messages[0]}"
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                background: 'white', borderRadius: 9, padding: '4px 11px',
                fontSize: 12, color: 'var(--mint)', fontWeight: 600,
                border: '1px solid var(--mint-mid)',
              }}>✓ {stats.okay} okay</span>
              {stats.difficult > 0 && (
                <span style={{
                  background: 'white', borderRadius: 9, padding: '4px 11px',
                  fontSize: 12, color: 'var(--peach)', fontWeight: 600,
                  border: '1px solid var(--peach-mid)',
                }}>{stats.difficult} hard</span>
              )}
            </div>
          </div>

          {/* Card 3: Hardest meal */}
          <div style={{
            background: 'white', borderRadius: 22, border: '1.5px solid var(--border)',
            padding: '28px 22px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase',
            }}>Most Logged Difficulty</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'var(--pink-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
              }}>😰</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.2 }}>
                  {MEAL_LABELS[stats.hardestMeal] || 'Dinner'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>
                  {stats.hardestPct}% difficult
                </div>
              </div>
            </div>

            <div style={{ height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, var(--pink) 0%, var(--coral) 100%)',
                width: `${stats.hardestPct}%`, transition: 'width 0.7s ease',
              }} />
            </div>

            <div style={{
              background: 'var(--pink-light)', borderRadius: 10,
              padding: '6px 16px', fontSize: 12, color: 'var(--pink)', fontWeight: 600,
              border: '1px solid var(--pink-mid)',
            }}>
              {MEAL_LABELS[stats.hardestMeal]}: {stats.hardestPct}% difficult
            </div>
          </div>
        </div>

        {/* Summary stat pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {[
            { label: 'Okay Meals',   value: `${stats.successRate}%`, color: '#E8735A',          bg: '#FDF1EE',            border: '#F5C4B4',          shadow: 'rgba(232,115,90,0.10)' },
            { label: 'Total Logged', value: stats.total,              color: 'var(--text-dark)', bg: 'white',              border: 'var(--border)',    shadow: 'rgba(39,23,6,0.05)' },
            { label: 'Okay',         value: stats.okay,               color: 'var(--mint)',      bg: 'var(--mint-light)',  border: 'var(--mint-mid)',  shadow: 'rgba(72,122,103,0.08)' },
            { label: 'Difficult',    value: stats.difficult,          color: 'var(--peach)',     bg: 'var(--peach-light)', border: 'var(--peach-mid)', shadow: 'rgba(176,120,40,0.08)' },
            { label: 'Refused',      value: stats.refused,            color: 'var(--pink)',      bg: 'var(--pink-light)',  border: 'var(--pink-mid)',  shadow: 'rgba(174,76,106,0.08)' },
            { label: 'Skipped',      value: stats.skipped,            color: '#8a7568',          bg: '#f1ece3',            border: '#ddd0bd',          shadow: 'rgba(138,117,104,0.08)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 18, padding: '20px',
              border: `1.5px solid ${s.border}`, textAlign: 'center',
              boxShadow: `0 2px 8px ${s.shadow}`,
            }}>
              <div className="font-lora" style={{ fontSize: 38, fontWeight: 400, color: s.color, lineHeight: 1, marginBottom: 7 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Weekly Progress */}
        {hasLastWeekData && (
          <div style={{
            background: 'white', borderRadius: 22, border: '1.5px solid var(--border)',
            padding: '24px 22px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 16,
            }}>Weekly Progress</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <ProgressStat label="Okay Meals" current={stats.successRate} previous={lastWeekStats.successRate} unit="%" />
              <ProgressStat label="Meals Logged" current={stats.total} previous={lastWeekStats.total} />
              <ProgressStat label="Difficult" current={stats.difficult} previous={lastWeekStats.difficult} inverse />
              <ProgressStat label="Challenges Tried" current={stats.ringPct} previous={lastWeekStats.ringPct} unit="%" />
            </div>
          </div>
        )}

        <AIInsightsSection weekStatuses={thisWeekStatuses} allMealItems={allMealItems} mealStatuses={mealStatuses} mealTimesByDate={mealTimesByDate} />
      </div>
    </div>
  )
}
