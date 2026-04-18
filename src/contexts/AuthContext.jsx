import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = still loading, null = not logged in, object = logged in
  const [user, setUser] = useState(undefined)
  const [role, setRole] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        const snap = await get(ref(db, `users/${firebaseUser.uid}/role`))
        setRole(snap.val())
        setUser(firebaseUser)
      } else {
        setUser(null)
        setRole(null)
      }
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
