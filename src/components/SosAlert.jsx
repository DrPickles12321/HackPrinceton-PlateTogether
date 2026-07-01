import { useState } from 'react'

function fmt(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SosAlert({ sos, patientEmail, onAcknowledge }) {
  const open = sos.filter(s => s.status === 'open')
  const [replyFor, setReplyFor] = useState(null)
  const [reply, setReply] = useState('')
  if (open.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      {open.map(s => (
        <div key={s.id} style={{ background: '#fdeaea', border: '1.5px solid #f5a8a8', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c0392b', marginBottom: 3 }}>🆘 Support requested</div>
          <div style={{ fontSize: 12, color: '#8a5a5a', marginBottom: 10 }}>
            {patientEmail} · {fmt(s.createdAt)}{s.note ? ` — “${s.note}”` : ''}
          </div>
          {replyFor === s.id ? (
            <div>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Note back to the parent (e.g. “Got your message — let's talk at our next check-in”)"
                style={{ width: '100%', border: '1.5px solid #f5a8a8', borderRadius: 10, padding: 8, fontSize: 13, fontFamily: "'Outfit', sans-serif", resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setReplyFor(null); setReply('') }} style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                <button onClick={() => { onAcknowledge(s.id, reply); setReplyFor(null); setReply('') }}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: '#c0392b', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Acknowledge + send</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setReplyFor(s.id)} style={{ background: 'white', border: '1.5px solid #f5a8a8', color: '#c0392b', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>✓ Acknowledge</button>
          )}
        </div>
      ))}
    </div>
  )
}
