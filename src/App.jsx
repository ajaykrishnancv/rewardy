import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, ROLES } from './stores/authStore'

// Components
import ErrorBoundary from './components/ErrorBoundary'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import OfflineBanner from './components/OfflineBanner'

// Layouts
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'
import AdminLayout from './layouts/AdminLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import AdminLoginPage from './pages/auth/AdminLoginPage'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import FamiliesPage from './pages/admin/FamiliesPage'
import FamilyDetailPage from './pages/admin/FamilyDetailPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

// Parent Pages
import ParentDashboard from './pages/parent/ParentDashboard'
import SchedulePage from './pages/parent/SchedulePage'
import TasksPage from './pages/parent/TasksPage'
import RewardsPage from './pages/parent/RewardsPage'
import AnalyticsPage from './pages/parent/AnalyticsPage'
import SettingsPage from './pages/parent/SettingsPage'

// Child Pages
import ChildDashboard from './pages/child/ChildDashboard'
import QuestsPage from './pages/child/QuestsPage'
import ShopPage from './pages/child/ShopPage'
import BankPage from './pages/child/BankPage'
import AchievementsPage from './pages/child/AchievementsPage'
import SkillsPage from './pages/child/SkillsPage'

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === ROLES.SUPER_ADMIN) {
      return <Navigate to="/admin" replace />
    } else if (user.role === ROLES.CHILD) {
      return <Navigate to="/child" replace />
    } else {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

// Redirect based on role after login
function RoleBasedRedirect() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  switch (user.role) {
    case ROLES.SUPER_ADMIN:
      return <Navigate to="/admin" replace />
    case ROLES.CHILD:
      return <Navigate to="/child" replace />
    default:
      return <Navigate to="/dashboard" replace />
  }
}

function App() {
  const { initialize, isLoading } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <PWAInstallPrompt />
      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
        </Route>

      {/* Role-based redirect */}
      <Route path="/" element={<RoleBasedRedirect />} />

      {/* Super Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="families" element={<FamiliesPage />} />
        <Route path="families/:id" element={<FamilyDetailPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Parent/Observer routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PRIMARY_PARENT, ROLES.OTHER_PARENT, ROLES.OBSERVER]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboard />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Child routes */}
      <Route
        path="/child"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CHILD]}>
            <DashboardLayout variant="child" />
          </ProtectedRoute>
        }
      >
        <Route index element={<ChildDashboard />} />
        <Route path="quests" element={<QuestsPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="bank" element={<BankPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="skills" element={<SkillsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
