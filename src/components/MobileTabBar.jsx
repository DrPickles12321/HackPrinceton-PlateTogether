import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/parent/daily',  label: 'Today',    icon: '🏠' },
  { to: '/parent/weekly', label: 'Week',     icon: '📅' },
  { to: '/parent/stats',  label: 'Insights', icon: '✨' },
  { to: '/parent/notes',  label: 'Notes',    icon: '📓' },
]

export default function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      background: 'rgba(255,253,250,0.96)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
    }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, padding: '7px 4px 9px',
              minHeight: 56, textDecoration: 'none',
              color: isActive ? 'var(--coral)' : '#b0a294',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <span style={{
              width: 44, height: 26, borderRadius: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'var(--coral-light)' : 'transparent',
              transition: 'background 0.18s',
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, filter: isActive ? 'none' : 'grayscale(0.45) opacity(0.7)' }}>{tab.icon}</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500 }}>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
