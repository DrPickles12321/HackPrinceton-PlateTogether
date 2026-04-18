import { useEffect, useRef } from 'react'

export default function Modal({ isOpen, onClose, title, children }) {
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()
    function handleKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(39,23,6,0.38)', padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'white', borderRadius: 24,
          boxShadow: '0 24px 64px rgba(39,23,6,0.22)',
          padding: '30px', width: '100%', maxWidth: 420, position: 'relative',
          border: '1.5px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 className="font-lora" style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.2 }}>
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: 10, border: '1.5px solid var(--border)',
              background: 'var(--surface-warm)', cursor: 'pointer', fontSize: 18,
              color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-warm)'}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
