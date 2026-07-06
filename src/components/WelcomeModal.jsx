import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useFirebaseData } from '../contexts/FirebaseDataContext'

// One-time, role-specific first-run intro. Dismissal is stored per-account in
// localStorage so it shows once and never nags. Purely a UX hint — no data written.
const STEPS = {
  parent: [
    { icon: '🍽️', text: 'Log meals on the Today tab — add foods and mark how each meal went.' },
    { icon: '🤝', text: 'Share your family code with your clinician so they can follow along.' },
    { icon: '✨', text: 'Check Insights any time for a gentle look at the week.' },
  ],
  clinician: [
    { icon: '🔑', text: 'Ask a family for their code (shown in their app’s top bar).' },
    { icon: '➕', text: 'Add them under “Add by family code” to view their week.' },
    { icon: '📈', text: 'Review meals, distress, and rhythm before each session.' },
  ],
}

export default function WelcomeModal({ role }) {
  const { user } = useAuth()
  const { familyCode } = useFirebaseData()
  const key = user ? `pt_welcomed_v1_${user.uid}` : null
  const [open, setOpen] = useState(() => {
    if (!key) return false
    try { return !localStorage.getItem(key) } catch { return false }
  })

  if (!open || !role || !STEPS[role]) return null

  function dismiss() {
    try { if (key) localStorage.setItem(key, new Date().toISOString()) } catch { /* ignore */ }
    setOpen(false)
  }

  const steps = STEPS[role]

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(39,23,6,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ background: '#fff', borderRadius: 20, maxWidth: 420, width: '100%', padding: '28px 24px', boxShadow: '0 14px 44px rgba(0,0,0,0.25)' }}
      >
        <div style={{ fontSize: 30, marginBottom: 6 }}>👋</div>
        <h3 className="font-lora" style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600, color: 'var(--text-dark)' }}>
          Welcome to Plate Together
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>
          {role === 'parent'
            ? 'A calm, private way to track meals and share them with your care team.'
            : 'A quick weekly view of how each family’s meals are going.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{s.icon}</span>
              <span style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
        </div>

        {role === 'parent' && familyCode && (
          <div style={{ background: 'var(--surface-warm)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 4 }}>Your family code</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '2px', color: 'var(--coral)' }}>{familyCode}</div>
          </div>
        )}

        <button
          type="button"
          onClick={dismiss}
          style={{
            width: '100%', border: 'none', borderRadius: 13, padding: '13px 0',
            background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(184,85,53,0.3)',
          }}
        >Get started</button>
      </div>
    </div>
  )
}
