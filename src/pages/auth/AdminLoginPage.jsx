import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { loginSuperAdmin, isLoading, error, clearError } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()

    if (!username || !password) {
      toast.error('Please enter username and password')
      return
    }

    const success = await loginSuperAdmin(username, password)
    if (success) {
      toast.success('Welcome, Admin!')
      navigate('/admin')
    } else if (error) {
      toast.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Access</h2>
        <p className="text-gray-600 mt-1">Super Admin login only</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-light"
            placeholder="Enter admin username"
            autoComplete="username"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-light"
            placeholder="Enter admin password"
            autoComplete="current-password"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || !username || !password}
          className="btn-futuristic w-full bg-gray-900 hover:bg-gray-800"
          style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Authenticating...
            </span>
          ) : (
            'Access Admin Panel'
          )}
        </button>
      </form>

      {/* Back to family login */}
      <div className="text-center">
        <Link
          to="/login"
          className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          Back to Family Login
        </Link>
      </div>
    </div>
  )
}
