import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore()

  // If logged in, redirect to appropriate dashboard
  if (!isLoading && user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/Picture1.png" alt="Rewardy" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <h1 className="text-4xl font-bold text-white mb-2">Rewardy</h1>
          <p className="text-white/80">Homeschool Motivation System</p>
        </div>

        {/* Auth content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          Making learning rewarding
        </p>
      </div>
    </div>
  )
}
