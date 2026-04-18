const CATEGORY_STYLE = {
  familiar:   { accent: 'var(--mint)',  bg: 'var(--mint-light)' },
  working_on: { accent: 'var(--peach)', bg: 'var(--peach-light)' },
  challenge:  { accent: 'var(--pink)',  bg: 'var(--pink-light)' },
}

export default function FoodCardPreview({ name, category, floating = false }) {
  const s = CATEGORY_STYLE[category] || CATEGORY_STYLE.familiar
  return (
    <div style={{
      background: s.bg,
      borderRadius: 11, borderLeft: `4px solid ${s.accent}`,
      padding: '9px 15px', fontSize: 13, fontWeight: 500,
      color: 'var(--text-dark)',
      boxShadow: floating
        ? '0 14px 36px rgba(39,23,6,0.20)'
        : '0 2px 8px rgba(39,23,6,0.08)',
      transform: floating ? 'rotate(2deg) scale(1.04)' : 'none',
      cursor: floating ? 'grabbing' : 'default',
      display: 'inline-block', whiteSpace: 'nowrap',
      border: `1.5px solid ${s.accent}30`,
      fontFamily: "'Outfit', sans-serif",
    }}>
      {name}
    </div>
  )
}
