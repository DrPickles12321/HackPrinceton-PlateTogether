import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    const existing = localStorage.getItem('demoRole')
    if (existing === 'parent' || existing === 'clinician') {
      navigate(existing === 'parent' ? '/parent' : '/clinician', { replace: true })
    }
  }, [navigate])

  function pickRole(role) {
    localStorage.setItem('demoRole', role)
    localStorage.setItem('demoFamilyId', '11111111-1111-1111-1111-111111111111')
    navigate(role === 'parent' ? '/parent' : '/clinician', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full mx-4">
        <header className="mb-8 text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">Plate Together</h1>
          <p className="text-sm text-gray-600 mt-1">
            Shared meal planning for families in eating disorder recovery
          </p>
        </header>

        <div className="space-y-3">
          <button
            onClick={() => pickRole('parent')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-between group"
          >
            <div className="text-left">
              <div className="text-base">👨‍👩‍👧 Continue as Parent</div>
              <div className="text-xs text-blue-100 mt-0.5">Plan meals, log how they went</div>
            </div>
            <span className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
          </button>

          <button
            onClick={() => pickRole('clinician')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-between group"
          >
            <div className="text-left">
              <div className="text-base">👩‍⚕️ Continue as Clinician</div>
              <div className="text-xs text-purple-100 mt-0.5">View the board and weekly patterns</div>
            </div>
            <span className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">Demo mode · No account required</p>
      </div>
    </div>
  )
}
