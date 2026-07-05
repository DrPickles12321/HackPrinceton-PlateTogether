import { useState } from 'react'

// Confirm screen for permanent account deletion. Requires typing DELETE so it
// can't be triggered accidentally. On success the auth user is removed, which
// flips the app back to the login screen automatically.
export default function DeleteAccountModal({ open, onClose, onConfirm }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  const armed = typed.trim().toUpperCase() === 'DELETE'

  async function handleDelete() {
    if (!armed || busy) return
    setBusy(true)
    setError(null)
    const res = await onConfirm()
    if (res?.success) return // auth state flips → app returns to the login screen
    setBusy(false)
    setError(
      res?.error === 'reauth'
        ? 'For your security, please sign out, sign back in, then try again.'
        : 'Something went wrong. Please try again.'
    )
  }

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(39,23,6,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: '#fff', borderRadius: 20, maxWidth: 420, width: '100%',
          padding: '26px 24px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 8 }}>⚠️</div>
        <h3 className="font-lora" style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 600, color: 'var(--text-dark)' }}>
          Delete your account?
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 12px' }}>
          This permanently deletes your account and <strong>all of your data</strong> — meals,
          statuses, distress ratings, and notes. This <strong>cannot be undone</strong>.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 14px' }}>
          Type <strong style={{ color: 'var(--coral)', letterSpacing: '0.5px' }}>DELETE</strong> to confirm.
        </p>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="DELETE"
          autoFocus
          disabled={busy}
          aria-label="Type DELETE to confirm"
          style={{
            width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border-mid)',
            borderRadius: 10, padding: '10px 12px', fontSize: 15, letterSpacing: '1px',
            outline: 'none', marginBottom: 16, fontFamily: 'inherit',
          }}
        />
        {error && <p style={{ fontSize: 13, color: 'var(--coral)', margin: '0 0 12px', lineHeight: 1.5 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1, border: '1.5px solid var(--border-mid)', borderRadius: 12, padding: '11px 0',
              background: '#fff', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600,
              cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!armed || busy}
            style={{
              flex: 1, border: 'none', borderRadius: 12, padding: '11px 0',
              background: armed ? '#B85535' : 'var(--border-mid)', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: armed && !busy ? 'pointer' : 'default',
              opacity: busy ? 0.7 : 1, fontFamily: 'inherit',
            }}
          >{busy ? 'Deleting…' : 'Delete forever'}</button>
        </div>
      </div>
    </div>
  )
}
