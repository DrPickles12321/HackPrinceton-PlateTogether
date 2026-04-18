import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(undefined)
  const [role, setRole]           = useState(null)
  const [loginError, setLoginError] = useState('')
  const pendingRoleRef            = useRef(null)  // set by LoginScreen before sign-in

  useEffect(() => {
    return onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        const snap = await get(ref(db, `users/${firebaseUser.uid}/role`))
        // Guard: user might have been signed out while we awaited
        if (auth.currentUser?.uid !== firebaseUser.uid) return
        const storedRole = snap.val()
        if (pendingRoleRef.current && storedRole && storedRole !== pendingRoleRef.current) {
          pendingRoleRef.current = null
          await signOut(auth)
          setLoginError(`This email is registered as a ${storedRole}. Please select the correct role.`)
          return
        }
        pendingRoleRef.current = null
        setRole(storedRole)
        setUser(firebaseUser)
      } else {
        setUser(null)
        setRole(null)
      }
    })
  }, [])

  function setPendingRole(r) { pendingRoleRef.current = r }
  function clearLoginError() { setLoginError('') }

  return (
    <AuthContext.Provider value={{ user, role, loginError, setPendingRole, clearLoginError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
