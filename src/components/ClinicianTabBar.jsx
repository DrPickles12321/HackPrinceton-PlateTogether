import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/clinician/overview',  label: 'Overview',  icon: '📋' },
  { to: '/clinician/insights',  label: 'Insights',  icon: '📊' },
  { to: '/clinician/care-plan', label: 'Care Plan', icon: '🎯' },
  { to: '/clinician/notes',     label: 'Notes',     icon: '📓' },
]

// Shared clinician sub-navigation. `variant="desktop"` renders an inline pill
// row above the page content (mirrors Navbar's parent tabs); `variant="mobile"`
// renders a fixed bottom bar (mirrors MobileTabBar). Both read the same route
// list so the two never drift apart.
export default function ClinicianTabBar({ variant }) {
  const { pathname } = useLocation()

  if (variant === 'mobile') {
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

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2, marginBottom: 8,
      background: 'var(--surface-warm)', padding: '3px',
      borderRadius: 13, border: '1.5px solid var(--border)',
      width: 'fit-content',
    }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 500,
              textDecoration: 'none', transition: 'all 0.15s',
              color: isActive ? 'white' : 'var(--text-mid)',
              background: isActive
                ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)'
                : 'transparent',
              boxShadow: isActive ? '0 2px 8px rgba(184,85,53,0.28)' : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(184,85,53,0.10)'
                e.currentTarget.style.color = 'var(--text-dark)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-mid)'
              }
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </NavLink>
        )
      })}
    </div>
  )
}
