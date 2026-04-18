import { createContext, useContext, useState } from 'react'

const RealtimeContext = createContext({ status: 'disconnected', setStatus: () => {} })

export function RealtimeProvider({ children }) {
  const [status, setStatus] = useState('disconnected')
  return (
    <RealtimeContext.Provider value={{ status, setStatus }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext)
}
