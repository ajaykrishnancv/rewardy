import { create } from 'zustand'
import { supabase, setSessionToken, setSessionData, clearSession, getSessionToken, getSessionData } from '../lib/supabase'
import bcrypt from 'bcryptjs'

// Role types
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PRIMARY_PARENT: 'primary_parent',
  OTHER_PARENT: 'other_parent',
  OBSERVER: 'observer',
  CHILD: 'child',
}

// Role permissions
export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    manageFamilies: true,
    manageRoles: true,
    viewDashboard: true,
    editSchedule: false,
    approveTasks: false,
    awardCurrency: false,
    manageRewards: false,
    approveRedemptions: false,
    viewAnalytics: false,
    salaryConfig: false,
    completeTasks: false,
    redeemRewards: false,
    manageBanking: false,
  },
  [ROLES.PRIMARY_PARENT]: {
    manageFamilies: false,
    manageRoles: false,
    viewDashboard: true,
    editSchedule: true,
    approveTasks: true,
    awardCurrency: true,
    manageRewards: true,
    approveRedemptions: true,
    viewAnalytics: true,
    salaryConfig: true,
    completeTasks: false,
    redeemRewards: false,
    manageBanking: false,
  },
  [ROLES.OTHER_PARENT]: {
    manageFamilies: false,
    manageRoles: false,
    viewDashboard: true,
    editSchedule: true,
    approveTasks: true,
    awardCurrency: true,
    manageRewards: true,
    approveRedemptions: true,
    viewAnalytics: true,
    salaryConfig: false,
    completeTasks: false,
    redeemRewards: false,
    manageBanking: false,
  },
  [ROLES.OBSERVER]: {
    manageFamilies: false,
    manageRoles: false,
    viewDashboard: true,
    editSchedule: false,
    approveTasks: false,
    awardCurrency: false,
    manageRewards: false,
    approveRedemptions: false,
    viewAnalytics: true,
    salaryConfig: false,
    completeTasks: false,
    redeemRewards: false,
    manageBanking: false,
  },
  [ROLES.CHILD]: {
    manageFamilies: false,
    manageRoles: false,
    viewDashboard: true,
    editSchedule: false,
    approveTasks: false,
    awardCurrency: false,
    manageRewards: false,
    approveRedemptions: false,
    viewAnalytics: false,
    salaryConfig: false,
    completeTasks: true,
    redeemRewards: true,
    manageBanking: true,
  },
}

// Generate session token
const generateToken = () => {
  return 'sess_' + crypto.randomUUID()
}

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  session: null,
  isLoading: true,
  error: null,

  // Initialize auth from localStorage
  initialize: async () => {
    const token = getSessionToken()
    const sessionData = getSessionData()

    if (!token || !sessionData) {
      set({ isLoading: false })
      return
    }

    try {
      // Validate session in database
      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .eq('is_valid', true)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !session) {
        clearSession()
        set({ user: null, session: null, isLoading: false })
        return
      }

      // Update last activity
      await supabase
        .from('sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('token', token)

      set({
        user: sessionData,
        session: { token, ...session },
        isLoading: false,
      })
    } catch (err) {
      console.error('Session validation error:', err)
      clearSession()
      set({ user: null, session: null, isLoading: false })
    }
  },

  // Super Admin Login
  loginSuperAdmin: async (username, password) => {
    set({ isLoading: true, error: null })

    try {
      const { data: admin, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        set({ isLoading: false, error: 'Invalid credentials' })
        return false
      }

      const isValid = await bcrypt.compare(password, admin.password_hash)
      if (!isValid) {
        set({ isLoading: false, error: 'Invalid credentials' })
        return false
      }

      // Create session
      const token = generateToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour session

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          token,
          user_type: 'super_admin',
          user_id: admin.id,
          expires_at: expiresAt.toISOString(),
        })

      if (sessionError) {
        set({ isLoading: false, error: 'Failed to create session' })
        return false
      }

      // Update last login
      await supabase
        .from('super_admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', admin.id)

      const userData = {
        id: admin.id,
        username: admin.username,
        role: ROLES.SUPER_ADMIN,
        roleLabel: 'Super Admin',
      }

      setSessionToken(token)
      setSessionData(userData)
      set({ user: userData, session: { token }, isLoading: false })
      return true
    } catch (err) {
      console.error('Login error:', err)
      set({ isLoading: false, error: 'Login failed' })
      return false
    }
  },

  // Family Role Login
  loginFamilyRole: async (familyId, role, password) => {
    set({ isLoading: true, error: null })

    try {
      // Get family role
      const { data: familyRole, error } = await supabase
        .from('family_roles')
        .select(`
          *,
          families (
            id,
            family_code,
            display_name,
            timezone,
            is_active
          )
        `)
        .eq('family_id', familyId)
        .eq('role_type', role)
        .eq('is_enabled', true)
        .single()

      if (error || !familyRole) {
        set({ isLoading: false, error: 'Invalid credentials' })
        return false
      }

      if (!familyRole.families?.is_active) {
        set({ isLoading: false, error: 'Family account is inactive' })
        return false
      }

      const isValid = await bcrypt.compare(password, familyRole.password_hash)
      if (!isValid) {
        set({ isLoading: false, error: 'Invalid credentials' })
        return false
      }

      // Create session
      const token = generateToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          token,
          user_type: 'family_role',
          user_id: familyRole.id,
          family_id: familyId,
          expires_at: expiresAt.toISOString(),
        })

      if (sessionError) {
        set({ isLoading: false, error: 'Failed to create session' })
        return false
      }

      // Update last login
      await supabase
        .from('family_roles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', familyRole.id)

      // If child role, get child profile
      let childProfile = null
      if (familyRole.role_type === ROLES.CHILD) {
        const { data: profile } = await supabase
          .from('child_profiles')
          .select('*')
          .eq('family_id', familyId)
          .single()
        childProfile = profile
      }

      const userData = {
        id: familyRole.id,
        familyId: familyRole.families.id,
        familyCode: familyRole.families.family_code,
        familyName: familyRole.families.display_name,
        timezone: familyRole.families.timezone,
        role: familyRole.role_type,
        roleLabel: familyRole.role_label,
        childProfile,
      }

      setSessionToken(token)
      setSessionData(userData)
      set({ user: userData, session: { token }, isLoading: false })
      return true
    } catch (err) {
      console.error('Login error:', err)
      set({ isLoading: false, error: 'Login failed' })
      return false
    }
  },

  // Logout
  logout: async () => {
    const token = getSessionToken()
    if (token) {
      await supabase
        .from('sessions')
        .update({ is_valid: false })
        .eq('token', token)
    }
    clearSession()
    set({ user: null, session: null })
  },

  // Check permission
  hasPermission: (permission) => {
    const { user } = get()
    if (!user) return false
    return PERMISSIONS[user.role]?.[permission] || false
  },

  // Clear error
  clearError: () => set({ error: null }),
}))
