import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import bcrypt from 'bcryptjs'
import toast from 'react-hot-toast'

// Generate random password
function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

const ROLE_LABELS = {
  primary_parent: 'Primary Parent',
  other_parent: 'Other Parent',
  observer: 'Observer',
  child: 'Child'
}

const ROLE_ICONS = {
  primary_parent: '👑',
  other_parent: '👤',
  observer: '👁️',
  child: '🧒'
}

export default function FamilyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const printRef = useRef(null)

  const [family, setFamily] = useState(null)
  const [roles, setRoles] = useState([])
  const [childProfile, setChildProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit states
  const [editingFamily, setEditingFamily] = useState(false)
  const [editingChild, setEditingChild] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  // Form states
  const [familyForm, setFamilyForm] = useState({ displayName: '', timezone: '' })
  const [childForm, setChildForm] = useState({ displayName: '', dateOfBirth: '', gradeLevel: '' })
  const [roleForm, setRoleForm] = useState({ roleLabel: '' })

  // Password reset modal
  const [resetPasswordModal, setResetPasswordModal] = useState({ open: false, role: null })
  const [newPassword, setNewPassword] = useState('')

  // Credentials modal for printing
  const [showCredentials, setShowCredentials] = useState(false)

  useEffect(() => {
    fetchFamilyData()
  }, [id])

  async function fetchFamilyData() {
    try {
      setLoading(true)

      // Fetch family
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', id)
        .single()

      if (familyError) throw familyError
      setFamily(familyData)
      setFamilyForm({
        displayName: familyData.display_name,
        timezone: familyData.timezone || 'UTC'
      })

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('family_roles')
        .select('*')
        .eq('family_id', id)
        .order('role_type')

      if (rolesError) throw rolesError
      setRoles(rolesData)

      // Fetch child profile
      const { data: childData, error: childError } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('family_id', id)
        .single()

      if (!childError && childData) {
        setChildProfile(childData)
        setChildForm({
          displayName: childData.display_name,
          dateOfBirth: childData.date_of_birth || '',
          gradeLevel: childData.grade_level || ''
        })
      }

    } catch (error) {
      console.error('Error fetching family:', error)
      toast.error('Failed to load family data')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateFamily(e) {
    e.preventDefault()
    try {
      setSaving(true)

      const { error } = await supabase
        .from('families')
        .update({
          display_name: familyForm.displayName,
          timezone: familyForm.timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setFamily(prev => ({ ...prev, display_name: familyForm.displayName, timezone: familyForm.timezone }))
      setEditingFamily(false)
      toast.success('Family updated successfully')
    } catch (error) {
      console.error('Error updating family:', error)
      toast.error('Failed to update family')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateChild(e) {
    e.preventDefault()
    try {
      setSaving(true)

      const { error } = await supabase
        .from('child_profiles')
        .update({
          display_name: childForm.displayName,
          date_of_birth: childForm.dateOfBirth || null,
          grade_level: childForm.gradeLevel || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', childProfile.id)

      if (error) throw error

      setChildProfile(prev => ({
        ...prev,
        display_name: childForm.displayName,
        date_of_birth: childForm.dateOfBirth,
        grade_level: childForm.gradeLevel
      }))
      setEditingChild(false)
      toast.success('Child profile updated successfully')
    } catch (error) {
      console.error('Error updating child:', error)
      toast.error('Failed to update child profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateRoleLabel(roleId) {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('family_roles')
        .update({
          role_label: roleForm.roleLabel,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)

      if (error) throw error

      setRoles(prev => prev.map(r =>
        r.id === roleId ? { ...r, role_label: roleForm.roleLabel } : r
      ))
      setEditingRole(null)
      toast.success('Role label updated successfully')
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role label')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!resetPasswordModal.role) return

    try {
      setSaving(true)
      const password = newPassword || generatePassword()
      const passwordHash = await bcrypt.hash(password, 10)

      const { error } = await supabase
        .from('family_roles')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', resetPasswordModal.role.id)

      if (error) throw error

      toast.success(
        <div>
          <p className="font-semibold">Password reset successfully!</p>
          <p className="text-sm mt-1">New password: <code className="bg-gray-200 px-1 rounded">{password}</code></p>
        </div>,
        { duration: 10000 }
      )

      setResetPasswordModal({ open: false, role: null })
      setNewPassword('')
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error('Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    try {
      const newStatus = !family.is_active

      const { error } = await supabase
        .from('families')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setFamily(prev => ({ ...prev, is_active: newStatus }))
      toast.success(newStatus ? 'Family activated' : 'Family deactivated')
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Failed to update family status')
    }
  }

  async function handleDeleteFamily() {
    if (!confirm('Are you sure you want to delete this family? This action cannot be undone.')) {
      return
    }

    try {
      setSaving(true)

      // Delete in order: currency_balances, child_profiles, sessions, family_roles, streaks, then family
      const { error: balanceError } = await supabase
        .from('currency_balances')
        .delete()
        .eq('family_id', id)

      const { error: childError } = await supabase
        .from('child_profiles')
        .delete()
        .eq('family_id', id)

      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('family_id', id)

      const { error: streakError } = await supabase
        .from('streaks')
        .delete()
        .eq('family_id', id)

      const { error: rolesError } = await supabase
        .from('family_roles')
        .delete()
        .eq('family_id', id)

      const { error: familyError } = await supabase
        .from('families')
        .delete()
        .eq('id', id)

      if (familyError) throw familyError

      toast.success('Family deleted successfully')
      navigate('/admin/families')
    } catch (error) {
      console.error('Error deleting family:', error)
      toast.error('Failed to delete family')
    } finally {
      setSaving(false)
    }
  }

  function handlePrintCredentials() {
    setShowCredentials(true)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
      </div>
    )
  }

  if (!family) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Family not found</p>
        <Link to="/admin/families" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Families
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin/families" className="text-gray-500 hover:text-gray-700">
          Families
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900">{family.display_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{family.display_name}</h1>
          <p className="text-gray-600">Code: <code className="bg-gray-100 px-2 py-0.5 rounded">{family.family_code}</code></p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintCredentials}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Credentials
          </button>
          <button
            onClick={handleToggleActive}
            className={`px-4 py-2 rounded-xl transition-colors ${
              family.is_active
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {family.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={handleDeleteFamily}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
          >
            Delete Family
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Family Information</h2>
            {!editingFamily && (
              <button
                onClick={() => setEditingFamily(true)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {editingFamily ? (
            <form onSubmit={handleUpdateFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={familyForm.displayName}
                  onChange={(e) => setFamilyForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={familyForm.timezone}
                  onChange={(e) => setFamilyForm(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Dubai">Dubai</option>
                  <option value="Asia/Kolkata">India</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingFamily(false)
                    setFamilyForm({ displayName: family.display_name, timezone: family.timezone || 'UTC' })
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  family.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {family.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Family Code</span>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{family.family_code}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Timezone</span>
                <span className="text-gray-900">{family.timezone || 'UTC'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">{new Date(family.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Child Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Child Profile</h2>
            {childProfile && !editingChild && (
              <button
                onClick={() => setEditingChild(true)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {childProfile ? (
            editingChild ? (
              <form onSubmit={handleUpdateChild} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Child's Name
                  </label>
                  <input
                    type="text"
                    value={childForm.displayName}
                    onChange={(e) => setChildForm(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={childForm.dateOfBirth}
                    onChange={(e) => setChildForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level
                  </label>
                  <input
                    type="text"
                    value={childForm.gradeLevel}
                    onChange={(e) => setChildForm(prev => ({ ...prev, gradeLevel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 5th Grade"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChild(false)
                      setChildForm({
                        displayName: childProfile.display_name,
                        dateOfBirth: childProfile.date_of_birth || '',
                        gradeLevel: childProfile.grade_level || ''
                      })
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="text-gray-900 font-medium">{childProfile.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date of Birth</span>
                  <span className="text-gray-900">
                    {childProfile.date_of_birth
                      ? new Date(childProfile.date_of_birth).toLocaleDateString()
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Grade Level</span>
                  <span className="text-gray-900">{childProfile.grade_level || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avatar</span>
                  <span className="text-2xl">{childProfile.avatar_emoji || '🧒'}</span>
                </div>
              </div>
            )
          ) : (
            <p className="text-gray-500">No child profile found</p>
          )}
        </div>
      </div>

      {/* Roles Management */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Management</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Label</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ROLE_ICONS[role.role_type]}</span>
                      <span className="font-medium text-gray-900">{ROLE_LABELS[role.role_type]}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {editingRole === role.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={roleForm.roleLabel}
                          onChange={(e) => setRoleForm({ roleLabel: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                          placeholder="Custom label"
                        />
                        <button
                          onClick={() => handleUpdateRoleLabel(role.id)}
                          disabled={saving}
                          className="text-green-600 hover:text-green-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-600">
                        {role.role_label || ROLE_LABELS[role.role_type]}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      role.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {role.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingRole(role.id)
                          setRoleForm({ roleLabel: role.role_label || '' })
                        }}
                        className="text-gray-500 hover:text-indigo-600"
                        title="Edit label"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setResetPasswordModal({ open: true, role })
                          setNewPassword('')
                        }}
                        className="text-gray-500 hover:text-orange-600"
                        title="Reset password"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetPasswordModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reset Password for {ROLE_LABELS[resetPasswordModal.role?.role_type]}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  placeholder="Auto-generate"
                  maxLength={12}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Password will be auto-generated if left blank
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setResetPasswordModal({ open: false, role: null })}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Credentials Card */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:bg-white print:relative">
          <div
            ref={printRef}
            className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 print:shadow-none print:rounded-none print:max-w-none print:m-0"
          >
            <div className="flex justify-between items-start mb-6 print:mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Rewardy Login Credentials</h2>
                <p className="text-gray-600">{family.display_name} Family</p>
              </div>
              <button
                onClick={() => setShowCredentials(false)}
                className="text-gray-400 hover:text-gray-600 print:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 p-4 bg-indigo-50 rounded-xl print:bg-gray-100">
              <p className="text-sm text-gray-600 mb-1">Family Code (use this to login)</p>
              <p className="text-2xl font-mono font-bold text-indigo-600">{family.family_code}</p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 font-medium">Role Passwords:</p>
              <div className="grid grid-cols-2 gap-4">
                {roles.map(role => (
                  <div key={role.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{ROLE_ICONS[role.role_type]}</span>
                      <span className="font-medium text-gray-900">
                        {role.role_label || ROLE_LABELS[role.role_type]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Password needs to be reset to view</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 print:mt-12">
              <p className="text-xs text-gray-500 text-center">
                Keep these credentials safe. Visit the app and use your Family Code + Role + Password to login.
              </p>
            </div>

            <div className="mt-6 flex justify-center print:hidden">
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            background: white;
          }
        }
      `}</style>
    </div>
  )
}
