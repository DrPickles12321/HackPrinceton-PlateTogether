import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { ref, set } from 'firebase/database'
import { auth, db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'

const INPUT_STYLE = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1.5px solid var(--border)',
  background: 'white', fontSize: 14, color: 'var(--text-dark)',
  fontFamily: "'Outfit', sans-serif",
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export default function LoginScreen() {
  const { loginError, clearLoginError, setPendingRole } = useAuth()
  const isMobile = useIsMobile()
  const [mode, setMode]         = useState('signin')
  const [role, setRole]         = useState(null)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const displayError = loginError || error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!role) { setError('Please select a role first.'); return }
    clearLoginError()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        setPendingRole(role)
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        const { uid } = cred.user
        const writes = {
          [`users/${uid}/role`]:  role,
          [`users/${uid}/email`]: email,
          [`users/${uid}/nutritionalTargets`]: { protein: 75, carbs: 150, fruitsVeggies: 200 },
        }
        if (role === 'parent') {
          const code = generateFamilyCode()
          writes[`users/${uid}/familyCode`]  = code
          writes[`familyCodes/${code}`]      = uid
        }
        await Promise.all(Object.entries(writes).map(([path, val]) => set(ref(db, path), val)))
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  function focusRing(e) { e.target.style.borderColor = 'var(--coral)'; e.target.style.boxShadow = '0 0 0 3px rgba(184,85,53,0.12)' }
  function blurRing(e)  { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }

  const heading = (
    <div style={{ marginBottom: 28 }}>
      <h2 className="font-lora" style={{
        fontSize: isMobile ? 28 : 32, fontWeight: 500, color: 'var(--text-dark)',
        letterSpacing: '-0.3px', marginBottom: 8, lineHeight: 1.15,
      }}>
        {mode === 'signin' ? 'Welcome back' : 'Create account'}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
        {mode === 'signin'
          ? 'Sign in to continue to Plate Together.'
          : 'Set up your account to get started.'}
      </p>
    </div>
  )

  const formBlock = (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Role toggle */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            I am a
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['parent', 'clinician'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); clearLoginError(); setError('') }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, border: '1.5px solid',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600, minHeight: 46,
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'all 0.15s',
                  borderColor: role === r ? (r === 'parent' ? 'var(--coral)' : 'var(--mint)') : 'var(--border)',
                  background: role === r
                    ? (r === 'parent'
                      ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)'
                      : 'linear-gradient(135deg, var(--mint) 0%, #306050 100%)')
                    : 'white',
                  color: role === r ? 'white' : 'var(--text-mid)',
                  boxShadow: role === r
                    ? (r === 'parent' ? '0 2px 8px rgba(184,85,53,0.28)' : '0 2px 8px rgba(72,122,103,0.28)')
                    : 'none',
                }}
              >
                {r === 'parent' ? '👨‍👩‍👧 Parent' : '👩‍⚕️ Clinician'}
              </button>
            ))}
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={INPUT_STYLE}
            onFocus={focusRing}
            onBlur={blurRing}
          />
        </div>

        {/* Password */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={INPUT_STYLE}
            onFocus={focusRing}
            onBlur={blurRing}
          />
        </div>

        {/* Error */}
        {displayError && (
          <div style={{
            background: '#FEF0EE', border: '1.5px solid #F5C4B4',
            borderRadius: 10, padding: '12px 14px',
            fontSize: 13, color: 'var(--coral)', lineHeight: 1.5,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(184,85,53,0.12)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ flexShrink: 0, fontSize: 15 }}>⚠️</span>
            {displayError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 13, border: 'none',
            background: loading
              ? 'rgba(232,115,90,0.5)'
              : 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
            color: 'white', fontSize: 15, fontWeight: 600, minHeight: 50,
            fontFamily: "'Outfit', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(184,85,53,0.32)',
            transition: 'all 0.15s',
            marginTop: 4,
          }}
        >
          {loading
            ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
            : (mode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      {/* Mode toggle */}
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-mid)', marginTop: 20 }}>
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(''); clearLoginError() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--coral)', fontWeight: 600, fontSize: 13,
            fontFamily: "'Outfit', sans-serif", padding: 0,
          }}
        >
          {mode === 'signin' ? 'Create account' : 'Sign in'}
        </button>
      </p>
    </>
  )

  // ── Mobile: single column, compact brand header over a form card ──
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100svh',
        background: 'radial-gradient(circle at 80% 0%, rgba(184,85,53,0.10) 0%, transparent 45%), radial-gradient(circle at 0% 100%, rgba(72,122,103,0.10) 0%, transparent 45%), #F3ECE2',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '32px 20px calc(28px + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}>
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 60, height: 60, borderRadius: 18, fontSize: 28,
              background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
              boxShadow: '0 6px 18px rgba(184,85,53,0.32)', marginBottom: 16,
            }}>🍽️</div>
            <h1 className="font-lora" style={{ fontSize: 32, fontWeight: 500, color: 'var(--text-dark)', letterSpacing: '-0.3px', lineHeight: 1.05, marginBottom: 8 }}>
              Plate Together
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.55, maxWidth: 280, margin: '0 auto' }}>
              Shared meal support for families navigating eating disorder recovery.
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: 'white', borderRadius: 22, padding: '26px 22px',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 30px rgba(39,23,6,0.08)',
          }}>
            {heading}
            {formBlock}
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop: split brand / form panels ──
  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* Left brand panel */}
      <div style={{
        flex: '0 0 42%',
        background: 'linear-gradient(155deg, #271706 0%, #3E200C 55%, #2A1808 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '72px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 480, height: 480, borderRadius: '50%',
          top: -160, right: -160,
          background: 'radial-gradient(circle, rgba(184,85,53,0.22) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 360, height: 360, borderRadius: '50%',
          bottom: -100, left: -100,
          background: 'radial-gradient(circle, rgba(72,122,103,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 54, height: 54, borderRadius: 17,
            background: 'rgba(184,85,53,0.28)',
            border: '1px solid rgba(184,85,53,0.38)',
            fontSize: 26, marginBottom: 32,
          }}>🍽️</div>

          <h1 className="font-lora" style={{
            fontSize: 50, fontWeight: 400, lineHeight: 1.08,
            color: '#F5EAD8', letterSpacing: '-0.5px', marginBottom: 22,
          }}>
            Plate<br />Together
          </h1>

          <p style={{
            fontSize: 16, color: 'rgba(245,234,216,0.60)',
            lineHeight: 1.75, maxWidth: 270, marginBottom: 52,
          }}>
            Shared meal support for families navigating eating disorder recovery.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '📅', text: 'Plan meals together, week by week' },
              { icon: '✏️', text: 'Log how each meal honestly went' },
              { icon: '👩‍⚕️', text: 'Stay in sync with your care team' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 10, fontSize: 15,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'rgba(245,234,216,0.65)', lineHeight: 1.45 }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1,
        background: '#F3ECE2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 75% 15%, rgba(184,85,53,0.07) 0%, transparent 48%), radial-gradient(circle at 25% 85%, rgba(72,122,103,0.07) 0%, transparent 48%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 380, position: 'relative' }}>
          {heading}
          {formBlock}
        </div>
      </div>
    </div>
  )
}

function generateFamilyCode() {
  // Cryptographically secure, fixed 8-char code from an unambiguous alphabet
  // (no 0/O/1/I/L). 32^8 ≈ 1.1 trillion combinations to resist guessing.
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':           return 'That email address is not valid.'
    case 'auth/user-not-found':          return 'No account found with that email.'
    case 'auth/wrong-password':          return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential':      return 'Email or password is incorrect.'
    case 'auth/email-already-in-use':    return 'An account with that email already exists.'
    case 'auth/weak-password':           return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':       return 'Too many attempts. Please wait a moment.'
    case 'auth/network-request-failed':  return 'Network error. Check your connection.'
    default:                             return 'Something went wrong. Please try again.'
  }
}
