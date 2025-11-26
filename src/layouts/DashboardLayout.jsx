import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, ROLES } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

const parentNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'home', exact: true },
  { path: '/dashboard/schedule', label: 'Schedule', icon: 'calendar' },
  { path: '/dashboard/tasks', label: 'Tasks', icon: 'tasks' },
  { path: '/dashboard/rewards', label: 'Rewards', icon: 'gift' },
  { path: '/dashboard/analytics', label: 'Analytics', icon: 'chart' },
  { path: '/dashboard/settings', label: 'Settings', icon: 'cog' },
]

const childNavItems = [
  { path: '/child', label: 'Home', icon: 'home', exact: true },
  { path: '/child/quests', label: 'Quests', icon: 'tasks' },
  { path: '/child/shop', label: 'Shop', icon: 'gift' },
  { path: '/child/bank', label: 'Bank', icon: 'bank' },
  { path: '/child/achievements', label: 'Badges', icon: 'trophy' },
]

function NavIcon({ icon }) {
  const icons = {
    home: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    calendar: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    tasks: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    gift: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    chart: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    cog: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bank: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l9-4 9 4v2H3V6zm0 4h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10zm4 4v4m4-4v4m4-4v4" />
      </svg>
    ),
    trophy: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14a1 1 0 011 1v3a7 7 0 01-7 7 7 7 0 01-7-7V4a1 1 0 011-1zm7 14v4m-4 0h8" />
      </svg>
    ),
  }
  return icons[icon] || null
}

export default function DashboardLayout({ variant = 'parent' }) {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore()
  const navigate = useNavigate()

  const isChild = variant === 'child' || user?.role === ROLES.CHILD
  const navItems = isChild ? childNavItems : parentNavItems

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Filter nav items based on role permissions
  const filteredNavItems = navItems.filter((item) => {
    if (user?.role === ROLES.OBSERVER) {
      return !['schedule', 'tasks', 'rewards', 'settings'].includes(
        item.path.split('/').pop()
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-animated-gradient">
      {/* Floating decorative orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-orb floating-orb-1" />
        <div className="floating-orb floating-orb-2" />
        <div className="floating-orb floating-orb-3" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sidebar-glass transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-white/10">
          <h1 className="text-xl font-bold text-white">
            <span className="neon-text-blue">Rewardy</span>
          </h1>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold text-white">
                {isChild
                  ? user?.childProfile?.display_name?.[0] || '🚀'
                  : user?.roleLabel?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-white">
                {isChild ? user?.childProfile?.display_name || 'Champion' : user?.roleLabel}
              </p>
              <p className="text-sm text-white/60">
                {user?.familyName}
              </p>
            </div>
          </div>

          {/* Currency display for child */}
          {isChild && (
            <div className="mt-4 flex gap-3">
              <div className="star-display">
                <span className="star-icon">★</span>
                <span className="text-white font-bold text-sm">0</span>
              </div>
              <div className="gem-display">
                <span className="gem-icon">◆</span>
                <span className="text-white font-bold text-sm">0</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white shadow-lg'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon icon={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 transition-all duration-300">
        {/* Header */}
        <header className="h-16 glass-card mx-4 mt-4 rounded-xl flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10 lg:hidden text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* Quick stats in header for parent */}
          {!isChild && (
            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-white/50">Pending Tasks</p>
                <p className="font-semibold text-white">0</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">Pending Rewards</p>
                <p className="font-semibold text-white">0</p>
              </div>
            </div>
          )}

          {/* Child header stats */}
          {isChild && (
            <div className="flex items-center gap-4">
              <div className="streak-fire">
                <span className="streak-fire-icon">🔥</span>
                <span className="text-white font-bold text-sm">0</span>
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
