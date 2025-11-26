import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const ROLE_DISPLAY_NAMES = {
  primary_parent: 'Primary Parent',
  other_parent: 'Other Parent',
  observer: 'Observer',
  child: 'Child'
}

function formatRoleType(roleType) {
  return ROLE_DISPLAY_NAMES[roleType] || roleType
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginFamilyRole, isLoading, error, clearError } = useAuthStore()

  const [families, setFamilies] = useState([])
  const [roles, setRoles] = useState([])
  const [selectedFamily, setSelectedFamily] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [password, setPassword] = useState('')
  const [loadingFamilies, setLoadingFamilies] = useState(true)

  // Load families on mount
  useEffect(() => {
    loadFamilies()
  }, [])

  // Load roles when family changes
  useEffect(() => {
    if (selectedFamily) {
      loadRoles(selectedFamily)
    } else {
      setRoles([])
      setSelectedRole('')
    }
  }, [selectedFamily])

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('id, family_code, display_name')
        .eq('is_active', true)
        .order('display_name')

      if (error) throw error
      setFamilies(data || [])
    } catch (err) {
      console.error('Error loading families:', err)
      toast.error('Failed to load families')
    } finally {
      setLoadingFamilies(false)
    }
  }

  const loadRoles = async (familyId) => {
    try {
      const { data, error } = await supabase
        .from('family_roles')
        .select('id, role_type, role_label')
        .eq('family_id', familyId)
        .eq('is_enabled', true)
        .order('role_type')

      if (error) throw error
      setRoles(data || [])
    } catch (err) {
      console.error('Error loading roles:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()

    if (!selectedFamily || !selectedRole || !password) {
      toast.error('Please fill in all fields')
      return
    }

    const success = await loginFamilyRole(selectedFamily, selectedRole, password)
    if (success) {
      toast.success('Welcome back!')
      navigate('/')
    } else if (error) {
      toast.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600 mt-1">Sign in to your family account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Family Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Family
          </label>
          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="input-light"
            disabled={loadingFamilies}
          >
            <option value="">
              {loadingFamilies ? 'Loading...' : 'Select your family'}
            </option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Who are you?
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input-light"
            disabled={!selectedFamily || roles.length === 0}
          >
            <option value="">
              {!selectedFamily ? 'Select family first' : 'Select your role'}
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.role_type}>
                {role.role_label || formatRoleType(role.role_type)}
              </option>
            ))}
          </select>
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
            placeholder="Enter your password"
            disabled={!selectedRole}
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
          disabled={isLoading || !selectedFamily || !selectedRole || !password}
          className="btn-futuristic w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Admin link */}
      <div className="text-center">
        <Link
          to="/admin/login"
          className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          Admin Login
        </Link>
      </div>
    </div>
  )
}
