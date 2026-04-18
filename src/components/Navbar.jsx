import { NavLink, useNavigate } from 'react-router-dom'
import { useRealtimeStatus } from '../contexts/RealtimeContext'
import LiveIndicator from './LiveIndicator'

export default function Navbar() {
  const { status } = useRealtimeStatus()
  const navigate = useNavigate()

  function handleSwitchRole() {
    localStorage.removeItem('demoRole')
    localStorage.removeItem('demoFamilyId')
    navigate('/', { replace: true })
  }

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🍽️</span>
          <div>
            <div className="font-semibold text-gray-900 leading-tight">Plate Together</div>
            <div className="hidden sm:block text-[10px] uppercase tracking-wider text-gray-500 leading-tight">
              Meal planning · supportive care
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
          <NavLink
            to="/parent"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`
            }
          >
            Parent
          </NavLink>
          <NavLink
            to="/clinician"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive ? 'bg-white shadow-sm text-purple-700' : 'text-gray-600 hover:text-gray-900'
              }`
            }
          >
            Clinician
          </NavLink>
        </div>

        <div className="flex items-center gap-4">
          <LiveIndicator status={status} />
          <button onClick={handleSwitchRole} className="text-xs text-gray-500 hover:text-gray-800 underline">
            Switch role
          </button>
        </div>
      </div>
    </nav>
  )
}
