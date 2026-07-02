// Multi-week progress chart: soft bars = meals logged (0–28 scale),
// coral line + dots = okay %. Pure SVG, no deps. Weeks come oldest → newest
// from computeWeeklyTrend.

const MAX_MEALS = 28 // 7 days × 4 meals

export default function TrendChart({ trend = [], compact = false }) {
  const W = 560
  const H = compact ? 150 : 180
  const padX = 16
  const padTop = 18
  const padBottom = 30
  const chartH = H - padTop - padBottom
  const n = trend.length
  if (n === 0) return null

  const slot = (W - padX * 2) / n
  const barW = Math.min(34, slot * 0.42)

  const x = i => padX + slot * i + slot / 2
  const yPct = pct => padTop + chartH * (1 - pct / 100)
  const yBar = v => chartH * (Math.min(v, MAX_MEALS) / MAX_MEALS)

  const hasAnyData = trend.some(w => w.logged > 0)
  const line = trend.map((w, i) => `${x(i)},${yPct(w.okayPct)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Weekly progress chart">
        {/* gridlines at 0/50/100% */}
        {[0, 50, 100].map(p => (
          <line key={p} x1={padX} x2={W - padX} y1={yPct(p)} y2={yPct(p)} stroke="var(--border)" strokeWidth={1} strokeDasharray={p === 0 ? 'none' : '3 4'} />
        ))}

        {/* logged bars */}
        {trend.map((w, i) => (
          <rect
            key={w.startIso}
            x={x(i) - barW / 2}
            y={padTop + chartH - yBar(w.logged)}
            width={barW}
            height={Math.max(yBar(w.logged), w.logged > 0 ? 3 : 0)}
            rx={4}
            fill="var(--peach-mid)"
            opacity={0.55}
          />
        ))}

        {/* okay% line + dots (only over weeks with data) */}
        {hasAnyData && <polyline points={line} fill="none" stroke="var(--coral)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {hasAnyData && trend.map((w, i) => (
          <g key={w.startIso}>
            <circle cx={x(i)} cy={yPct(w.okayPct)} r={4.5} fill="white" stroke="var(--coral)" strokeWidth={2.5} />
            {w.logged > 0 && (
              <text x={x(i)} y={yPct(w.okayPct) - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--coral)" fontFamily="'Lato', sans-serif">
                {w.okayPct}%
              </text>
            )}
          </g>
        ))}

        {/* week labels */}
        {trend.map((w, i) => (
          <text key={w.startIso} x={x(i)} y={H - 8} textAnchor="middle" fontSize={compact ? 10 : 11} fill="var(--text-light)" fontFamily="'Lato', sans-serif">
            {w.label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-mid)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--peach-mid)', opacity: 0.55, display: 'inline-block' }} />
          Meals logged
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-mid)' }}>
          <span style={{ width: 12, height: 3, borderRadius: 2, background: 'var(--coral)', display: 'inline-block' }} />
          Went okay %
        </span>
      </div>
    </div>
  )
}
