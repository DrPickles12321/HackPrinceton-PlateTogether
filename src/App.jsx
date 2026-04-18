import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { RealtimeProvider } from './contexts/RealtimeContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import ParentView from './pages/ParentView'
import ClinicianView from './pages/ClinicianView'

function AppLayout() {
  const location = useLocation()
  const hideNav = location.pathname === '/'
  return (
    <>
      {!hideNav && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/parent" element={<ParentView />} />
        <Route path="/clinician" element={<ClinicianView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <RealtimeProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </RealtimeProvider>
  )
}
