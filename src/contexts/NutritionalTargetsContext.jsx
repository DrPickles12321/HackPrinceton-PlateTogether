import { createContext, useContext } from 'react'
import { useFirebaseData } from './FirebaseDataContext'

const NutritionalTargetsContext = createContext(null)

// Thin wrapper — actual storage lives in FirebaseDataContext
export function NutritionalTargetsProvider({ children }) {
  return <>{children}</>
}

export function useNutritionalTargets() {
  const { nutritionalTargets: targets, saveNutritionalTargets: saveTargets } = useFirebaseData()
  return { targets, saveTargets }
}
