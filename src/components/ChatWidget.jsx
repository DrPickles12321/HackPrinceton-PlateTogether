import { useState, useRef, useEffect, useMemo } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { buildWeekFacts } from '../lib/weekFacts'
import { sendChat } from '../lib/chatService'

const GREETING = { role: 'assistant', content: 'Hi! I can recap how this week went or answer questions about your logs. Want a recap?' }

export default function ChatWidget() {
  // ChatWidget renders as a sibling of <Outlet> (not inside it), so it reads
  // data straight from the context provider, not useOutletContext.
  const { mealStatuses = {}, allMealItems = {}, mealDistress = {}, sendSos, mySos = [] } = useFirebaseData()
  const isMobile = useIsMobile()
  // On mobile, clear the ~62px bottom tab bar; on desktop there's no tab bar.
  const bubbleBottom = `calc(${isMobile ? 78 : 18}px + env(safe-area-inset-bottom))`
  const panelBottom = `calc(${isMobile ? 142 : 84}px + env(safe-area-inset-bottom))`
  const panelHeight = `min(520px, calc(100dvh - ${isMobile ? 200 : 130}px))`
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSos, setShowSos] = useState(false)
  const [sosNote, setSosNote] = useState('')
  const [sosSent, setSosSent] = useState(false)
  const scrollRef = useRef(null)

  const weekFacts = useMemo(() => buildWeekFacts({ mealStatuses, allMealItems, mealDistress }), [mealStatuses, allMealItems, mealDistress])

  // Unread dot when a care-team response arrived and the panel is closed.
  const latestResponseAt = useMemo(() => {
    const withResp = mySos.filter(s => s.response?.at).map(s => s.response.at).sort()
    return withResp[withResp.length - 1] || null
  }, [mySos])
  const [seenResponseAt, setSeenResponseAt] = useState(null)
  const hasUnread = latestResponseAt && latestResponseAt !== seenResponseAt && !open

  useEffect(() => { if (open && latestResponseAt) setSeenResponseAt(latestResponseAt) }, [open, latestResponseAt])
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const reply = await sendChat(next.filter(m => m !== GREETING).slice(-12), weekFacts)
      setMessages(m => [...m, { role: 'assistant', content: reply || "Sorry, I didn't catch that." }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "I couldn't reach the assistant just now — try again in a moment." }])
    } finally {
      setBusy(false)
    }
  }

  function confirmSos() {
    sendSos({ note: sosNote })
    setSosSent(true)
    setSosNote('')
    setMessages(m => [...m, { role: 'assistant', content: "I've let your care team know. They'll follow up with you here. 💛" }])
    setTimeout(() => { setShowSos(false); setSosSent(false) }, 1500)
  }

  const careResponses = mySos.filter(s => s.response?.body)

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open assistant"
        style={{
          position: 'fixed', right: 18, bottom: bubbleBottom, zIndex: 45,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
          color: 'white', fontSize: 24, boxShadow: '0 6px 18px rgba(184,85,53,0.4)',
        }}
      >
        {open ? '×' : '💬'}
        {hasUnread && <span style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: '50%', background: '#d63f3f', border: '2px solid white' }} />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', right: 18, bottom: panelBottom, zIndex: 45,
          width: 'min(360px, calc(100vw - 36px))', height: panelHeight,
          background: 'white', borderRadius: 18, border: '1.5px solid var(--border)',
          boxShadow: '0 12px 40px rgba(39,23,6,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: "'Outfit', sans-serif",
        }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)', color: 'white', fontWeight: 600, fontSize: 14 }}>
            Your assistant
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {careResponses.map(s => (
              <div key={s.id} style={{ background: 'var(--mint-light)', border: '1px solid var(--mint-mid)', borderRadius: 12, padding: '9px 12px', fontSize: 13, color: 'var(--text-dark)' }}>
                💛 Your care team: {s.response.body}
              </div>
            ))}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%', padding: '9px 12px', borderRadius: 13, fontSize: 13, lineHeight: 1.5,
                background: m.role === 'user' ? 'var(--coral-light)' : 'var(--surface-warm)',
                color: 'var(--text-dark)',
              }}>{m.content}</div>
            ))}
            {busy && <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-light)' }}>typing…</div>}
          </div>

          {showSos ? (
            <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
              {sosSent ? (
                <p style={{ fontSize: 13, color: 'var(--mint)', textAlign: 'center' }}>Sent to your care team 💛</p>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>Let your care team know?</p>
                  <div style={{ background: '#fdf1ee', border: '1px solid #f0c4b4', color: 'var(--coral)', fontSize: 11, borderRadius: 8, padding: '7px 9px', marginBottom: 8 }}>
                    Not for emergencies. If you're in crisis, call 988 or 911.
                  </div>
                  <textarea value={sosNote} onChange={e => setSosNote(e.target.value)} placeholder="Add a note (optional)…" rows={2}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: 8, fontSize: 13, fontFamily: "'Outfit', sans-serif", resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowSos(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--text-mid)', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                    <button onClick={confirmSos} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Send</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowSos(true)} aria-label="Send SOS to care team" title="I need support"
                style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: '1.5px solid #f0997b', background: 'white', color: 'var(--coral)', fontSize: 16, cursor: 'pointer' }}>🆘</button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about your week…"
                style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 12, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: "'Outfit', sans-serif", background: 'var(--surface-warm)' }} />
              <button onClick={send} disabled={busy} aria-label="Send"
                style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)', color: 'white', fontSize: 16, cursor: 'pointer' }}>↑</button>
            </div>
          )}
          <p style={{ fontSize: 10, color: 'var(--text-light)', textAlign: 'center', padding: '0 10px 8px' }}>
            Not medical advice. In a crisis, call 988 or 911.
          </p>
        </div>
      )}
    </>
  )
}
