import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Deliberately simple + robust. No JS viewport math (it proved fragile on iOS
// Safari and could push the panel off-screen). Standard fixed bottom sheet:
// anchored to the bottom, capped at 85dvh, with its own internal scroll. The
// add-food input is placed at the TOP of the sheet content so it stays visible
// above the keyboard without any positioning tricks.
export default function BottomSheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(39,23,6,0.35)' }}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 61,
              background: 'white', borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 30px rgba(39,23,6,0.18)',
              maxHeight: '85dvh', display: 'flex', flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border-mid)' }} />
            </div>

            {title && (
              <div style={{
                padding: '0 18px 10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
              }}>
                <span className="font-lora" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-dark)' }}>
                  {title}
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: 'var(--surface-warm)', color: 'var(--text-light)',
                    fontSize: 18, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >×</button>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 18px', WebkitOverflowScrolling: 'touch' }}>
              {children}
            </div>

            {footer && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
