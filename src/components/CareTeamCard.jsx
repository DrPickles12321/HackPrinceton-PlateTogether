import { useState } from 'react'

// Lists clinicians linked to this family with revoke / restore controls.
// Revoking keeps the record (marked inactive) so the clinician can't silently
// re-link themselves — this is the parent's real kill switch on data access,
// and only the parent can turn it back on.
export default function CareTeamCard({ careTeam = [], onRevoke, onReEnable }) {
  const [confirmUid, setConfirmUid] = useState(null)
  const active = careTeam.filter(c => c.active !== false)
  const revoked = careTeam.filter(c => c.active === false)

  return (
    <div style={{
      marginTop: 24, padding: '18px 20px', borderRadius: 16,
      border: '1px solid var(--border)', background: 'white',
      boxShadow: '0 2px 10px rgba(39,23,6,0.05)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8 }}>
        Care Team
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, margin: '0 0 14px' }}>
        Clinicians with access to your logs. Remove access any time — it takes effect immediately.
      </p>

      {active.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>
          No one has access yet. Share your family code with your clinician to add them.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.map(c => (
            <div key={c.uid} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              flexWrap: 'wrap', background: 'var(--surface-warm)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '9px 12px',
            }}>
              <span style={{ fontSize: 13.5, color: 'var(--text-dark)', fontWeight: 500 }}>{c.clinicianEmail}</span>
              {confirmUid === c.uid ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Remove access?</span>
                  <button
                    type="button"
                    onClick={() => { onRevoke(c.uid); setConfirmUid(null) }}
                    style={{ border: 'none', borderRadius: 8, padding: '5px 11px', background: 'var(--coral)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Yes, remove</button>
                  <button
                    type="button"
                    onClick={() => setConfirmUid(null)}
                    style={{ border: '1px solid var(--border-mid)', borderRadius: 8, padding: '5px 11px', background: 'none', color: 'var(--text-mid)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Cancel</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmUid(c.uid)}
                  style={{ border: '1px solid var(--pink-mid)', borderRadius: 8, padding: '5px 11px', background: 'white', color: 'var(--pink)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Remove access</button>
              )}
            </div>
          ))}
        </div>
      )}

      {revoked.length > 0 && (
        <div style={{ marginTop: active.length > 0 ? 16 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
            Removed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {revoked.map(c => (
              <div key={c.uid} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                flexWrap: 'wrap', background: 'var(--surface-warm)', border: '1px dashed var(--border-mid)',
                borderRadius: 10, padding: '9px 12px',
              }}>
                <span style={{ fontSize: 13.5, color: 'var(--text-light)', fontWeight: 500 }}>{c.clinicianEmail}</span>
                <button
                  type="button"
                  onClick={() => onReEnable(c.uid)}
                  style={{ border: '1px solid var(--mint-mid)', borderRadius: 8, padding: '5px 11px', background: 'white', color: 'var(--mint)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Restore access</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
