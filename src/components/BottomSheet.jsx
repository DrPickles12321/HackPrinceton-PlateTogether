import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BottomSheet({ open, onClose, title, children, footer }) {
  // Lift the sheet above the on-screen keyboard using the VisualViewport API,
  // so inputs inside the sheet stay visible while typing on mobile.
  const [kb, setKb] = useState({ inset: 0, vh: 0 })

  useEffect(() => {
    if (!open) return
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!open || !vv) return
    const update = () => setKb({
      inset: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      vh: vv.height,
    })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setKb({ inset: 0, vh: 0 })
    }
  }, [open])

  // Lock the background from scrolling while the sheet is open, so tapping
  // items inside the sheet never "teleports" the page underneath (iOS Safari).
  useEffect(() => {
    if (!open) return
    const body = document.body
    const scrollY = window.scrollY
    const prev = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [open])

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
              position: 'fixed', left: 0, right: 0, bottom: kb.inset, zIndex: 61,
              background: 'white', borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 30px rgba(39,23,6,0.18)',
              maxHeight: kb.vh > 0 ? `${Math.round(kb.vh * 0.9)}px` : '85dvh',
              display: 'flex', flexDirection: 'column',
              paddingBottom: kb.inset > 0 ? 0 : 'env(safe-area-inset-bottom)',
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', WebkitOverflowScrolling: 'touch' }}>
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
