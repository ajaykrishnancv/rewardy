import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're using custom auth, not Supabase Auth
    autoRefreshToken: false,
  },
})

// Helper to get current session token from localStorage
export const getSessionToken = () => {
  return localStorage.getItem('rewardy_session_token')
}

// Helper to set session token
export const setSessionToken = (token) => {
  if (token) {
    localStorage.setItem('rewardy_session_token', token)
  } else {
    localStorage.removeItem('rewardy_session_token')
  }
}

// Helper to clear session
export const clearSession = () => {
  localStorage.removeItem('rewardy_session_token')
  localStorage.removeItem('rewardy_session_data')
}

// Helper to get session data
export const getSessionData = () => {
  const data = localStorage.getItem('rewardy_session_data')
  return data ? JSON.parse(data) : null
}

// Helper to set session data
export const setSessionData = (data) => {
  if (data) {
    localStorage.setItem('rewardy_session_data', JSON.stringify(data))
  } else {
    localStorage.removeItem('rewardy_session_data')
  }
}
