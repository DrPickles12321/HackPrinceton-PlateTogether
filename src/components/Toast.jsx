import { useToast, ToastContext, useToastState } from '../hooks/useToast'

const TYPE_STYLE = {
  success: { bg: 'var(--mint-light)',  border: 'var(--mint-mid)',  text: 'var(--mint)',  icon: '✓' },
  error:   { bg: 'var(--pink-light)',  border: 'var(--pink-mid)',  text: 'var(--pink)',  icon: '!' },
  info:    { bg: 'var(--peach-light)', border: 'var(--peach-mid)', text: 'var(--peach)', icon: 'ℹ' },
}

export function ToastProvider({ children }) {
  const { toasts, showToast } = useToastState()
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: 9,
        }}>
          {toasts.map(t => {
            const s = TYPE_STYLE[t.type] || TYPE_STYLE.info
            return (
              <div key={t.id} style={{
                background: 'white',
                border: `1.5px solid ${s.border}`,
                borderLeft: `4px solid ${s.text}`,
                borderRadius: 14, padding: '12px 18px',
                fontSize: 13, fontWeight: 500, color: s.text,
                minWidth: 230, display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 6px 24px rgba(39,23,6,0.12)',
                fontFamily: "'Outfit', sans-serif",
                animation: 'toastIn 0.2s ease',
              }}>
                <span style={{
                  fontWeight: 700, fontSize: 13,
                  width: 22, height: 22, borderRadius: 7,
                  background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{s.icon}</span>
                {t.message}
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}
