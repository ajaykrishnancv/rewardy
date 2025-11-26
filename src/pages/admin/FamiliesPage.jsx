import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import bcrypt from 'bcryptjs'
import toast from 'react-hot-toast'

// Generate random password
const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [formData, setFormData] = useState({
    familyCode: '',
    displayName: '',
    childName: '',
    timezone: 'Asia/Kolkata',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadFamilies()
  }, [])

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('families')
        .select(`
          *,
          family_roles (id, role, role_label),
          child_profiles (id, display_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFamilies(data || [])
    } catch (err) {
      console.error('Error loading families:', err)
      toast.error('Failed to load families')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFamily = async (e) => {
    e.preventDefault()

    if (!formData.familyCode || !formData.displayName || !formData.childName) {
      toast.error('Please fill in all required fields')
      return
    }

    setCreating(true)

    try {
      // Generate passwords for all roles
      const passwords = {
        primary_parent: generatePassword(),
        other_parent: generatePassword(),
        observer: generatePassword(),
        child: generatePassword(),
      }

      // Hash all passwords
      const hashes = {}
      for (const [role, password] of Object.entries(passwords)) {
        hashes[role] = await bcrypt.hash(password, 10)
      }

      // 1. Create family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          family_code: formData.familyCode.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.displayName,
          timezone: formData.timezone,
        })
        .select()
        .single()

      if (familyError) {
        if (familyError.code === '23505') {
          toast.error('Family code already exists')
        } else {
          throw familyError
        }
        setCreating(false)
        return
      }

      // 2. Create all roles
      const roles = [
        { role: 'primary_parent', role_label: 'Dad', password_hash: hashes.primary_parent },
        { role: 'other_parent', role_label: 'Mom', password_hash: hashes.other_parent },
        { role: 'observer', role_label: 'Observer', password_hash: hashes.observer },
        { role: 'child', role_label: 'Child', password_hash: hashes.child },
      ]

      const { error: rolesError } = await supabase
        .from('family_roles')
        .insert(roles.map(r => ({ ...r, family_id: family.id })))

      if (rolesError) throw rolesError

      // 3. Create child profile
      const { data: childProfile, error: childError } = await supabase
        .from('child_profiles')
        .insert({
          family_id: family.id,
          display_name: formData.childName,
        })
        .select()
        .single()

      if (childError) throw childError

      // 4. Create currency balance for child
      const { error: balanceError } = await supabase
        .from('currency_balances')
        .insert({
          child_id: childProfile.id,
          wallet_stars: 0,
          savings_stars: 0,
          gems: 0,
        })

      if (balanceError) throw balanceError

      // 5. Create initial streak record
      const { error: streakError } = await supabase
        .from('streaks')
        .insert({
          child_id: childProfile.id,
          streak_type: 'daily',
          current_streak: 0,
          longest_streak: 0,
        })

      if (streakError) console.warn('Streak creation warning:', streakError)

      // Success - show credentials
      setCreatedCredentials({
        familyName: formData.displayName,
        familyCode: formData.familyCode,
        childName: formData.childName,
        roles: [
          { role: 'Dad (Primary)', password: passwords.primary_parent },
          { role: 'Mom', password: passwords.other_parent },
          { role: 'Observer', password: passwords.observer },
          { role: formData.childName, password: passwords.child },
        ]
      })

      setShowAddModal(false)
      setShowCredentialsModal(true)
      setFormData({ familyCode: '', displayName: '', childName: '', timezone: 'Asia/Kolkata' })
      loadFamilies()
      toast.success('Family created successfully!')

    } catch (err) {
      console.error('Error creating family:', err)
      toast.error('Failed to create family: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const toggleFamilyStatus = async (familyId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('families')
        .update({ is_active: !currentStatus })
        .eq('id', familyId)

      if (error) throw error
      toast.success(`Family ${currentStatus ? 'deactivated' : 'activated'}`)
      loadFamilies()
    } catch (err) {
      toast.error('Failed to update family status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Families</h1>
          <p className="text-gray-600">Manage all registered families</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Family
        </button>
      </div>

      {/* Families list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="spinner mx-auto mb-4" style={{ borderTopColor: '#6366f1' }} />
            <p className="text-gray-500">Loading families...</p>
          </div>
        ) : families.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No families registered yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add Your First Family
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Family
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Child
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {families.map((family) => (
                <tr key={family.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{family.display_name}</p>
                      <p className="text-sm text-gray-500">
                        {family.family_roles?.length || 0} roles
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                      {family.family_code}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">
                      {family.child_profiles?.[0]?.display_name || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleFamilyStatus(family.id, family.is_active)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        family.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {family.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/admin/families/${family.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Family Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Family</h2>

            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Code *
                </label>
                <input
                  type="text"
                  value={formData.familyCode}
                  onChange={(e) => setFormData({ ...formData, familyCode: e.target.value })}
                  className="input-light"
                  placeholder="e.g., smith, johnson"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier for login</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="input-light"
                  placeholder="e.g., The Smith Family"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child's Name *
                </label>
                <input
                  type="text"
                  value={formData.childName}
                  onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                  className="input-light"
                  placeholder="e.g., Alex"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="input-light"
                >
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="America/New_York">US Eastern</option>
                  <option value="America/Los_Angeles">US Pacific</option>
                  <option value="Europe/London">UK (GMT)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                <h3 className="font-medium text-blue-900 mb-2">Roles Created Automatically</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Dad (Primary Parent)</li>
                  <li>• Mom (Other Parent)</li>
                  <li>• Observer</li>
                  <li>• Child</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  Passwords will be auto-generated and shown after creation.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={creating}
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Family'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && createdCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Family Created!</h2>
              <p className="text-gray-600">{createdCredentials.familyName}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-yellow-800 text-sm font-medium">
                ⚠️ Save these credentials! They won't be shown again.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Login Credentials</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600">Family:</span>
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm">
                    {createdCredentials.familyName}
                  </code>
                </div>
                {createdCredentials.roles.map((role, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600">{role.role}:</span>
                    <code className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm font-mono">
                      {role.password}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const text = `${createdCredentials.familyName} Login Credentials\n\nFamily: ${createdCredentials.familyName}\n\n${createdCredentials.roles.map(r => `${r.role}: ${r.password}`).join('\n')}`
                  navigator.clipboard.writeText(text)
                  toast.success('Copied to clipboard!')
                }}
                className="btn-secondary flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All
              </button>
              <button
                onClick={() => {
                  setShowCredentialsModal(false)
                  setCreatedCredentials(null)
                }}
                className="btn-primary flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
