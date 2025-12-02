import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, ROLES } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import BottomNav, { NavIcon } from '../components/BottomNav'
import MoreSheet from '../components/MoreSheet'

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
  { path: '/child/skills', label: 'Skills', icon: 'skills' },
]

export default function DashboardLayout({ variant = 'parent' }) {
  const { user, logout } = useAuthStore()
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    moreSheetOpen,
    setMoreSheetOpen
  } = useUIStore()
  const navigate = useNavigate()

  const isChild = variant === 'child' || user?.role === ROLES.CHILD
  const navItems = isChild ? childNavItems : parentNavItems

  // Child currency and streak state
  const [childStats, setChildStats] = useState({
    stars: 0,
    gems: 0,
    streak: 0
  })

  // Fetch child stats
  useEffect(() => {
    if (isChild && user?.childProfile?.id) {
      loadChildStats()
    }
  }, [isChild, user?.childProfile?.id])

  async function loadChildStats() {
    try {
      const childId = user.childProfile.id

      // Fetch currency balance
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('wallet_stars, gems')
        .eq('child_id', childId)
        .single()

      // Fetch streak
      const { data: streak } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('child_id', childId)
        .eq('streak_type', 'daily')
        .single()

      setChildStats({
        stars: balance?.wallet_stars || 0,
        gems: balance?.gems || 0,
        streak: streak?.current_streak || 0
      })
    } catch (error) {
      console.error('Error loading child stats:', error)
    }
  }

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

  // Split items for mobile: first 4 in bottom nav, rest in "More" sheet
  const mobileNavItems = filteredNavItems.slice(0, 4)
  const moreItems = filteredNavItems.slice(4)

  // User info for the more sheet
  const userInfo = {
    initial: isChild
      ? user?.childProfile?.display_name?.[0] || '?'
      : user?.roleLabel?.[0] || 'U',
    name: isChild ? user?.childProfile?.display_name || 'Champion' : user?.roleLabel,
    family: user?.familyName
  }

  return (
    <div className="min-h-screen bg-animated-gradient">
      {/* Floating decorative orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-orb floating-orb-1" />
        <div className="floating-orb floating-orb-2" />
        <div className="floating-orb floating-orb-3" />
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col sidebar-glass transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-white/10 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-2">
            <img src="/Picture1.png" alt="Rewardy" className="w-10 h-10 object-contain" />
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-white">
                <span className="neon-text-blue">Rewardy</span>
              </h1>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* User info */}
        <div className={`border-b border-white/10 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className={`rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg ${sidebarCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <span className={`font-bold text-white ${sidebarCollapsed ? 'text-sm' : 'text-lg'}`}>
                {userInfo.initial}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{userInfo.name}</p>
                <p className="text-sm text-white/60 truncate">{userInfo.family}</p>
              </div>
            )}
          </div>

          {/* Currency display for child */}
          {isChild && !sidebarCollapsed && (
            <div className="mt-4 flex gap-3">
              <div className="star-display">
                <span className="star-icon">★</span>
                <span className="text-white font-bold text-sm">{childStats.stars}</span>
              </div>
              <div className="gem-display">
                <span className="gem-icon">◆</span>
                <span className="text-white font-bold text-sm">{childStats.gems}</span>
              </div>
            </div>
          )}

          {/* Compact currency for collapsed state */}
          {isChild && sidebarCollapsed && (
            <div className="mt-2 flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 text-yellow-400">
                <span className="text-xs">★</span>
                <span className="text-xs font-bold">{childStats.stars}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'p-2' : 'p-4'} space-y-1`}>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar-item relative flex items-center rounded-xl transition-all duration-200 ${
                  sidebarCollapsed
                    ? 'justify-center p-3'
                    : 'gap-3 px-4 py-3'
                } ${
                  isActive
                    ? 'bg-white/15 text-white shadow-lg'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon icon={item.icon} />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {sidebarCollapsed && (
                <span className="sidebar-tooltip">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Expand button (when collapsed) and Logout */}
        <div className={`border-t border-white/10 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              className="w-full p-3 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center mb-2"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <button
            onClick={handleLogout}
            className={`w-full rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center ${
              sidebarCollapsed ? 'justify-center p-3' : 'gap-2 px-4 py-2 text-sm'
            }`}
            title="Sign Out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Header */}
        <header className="h-16 glass-card mx-4 mt-4 rounded-xl flex items-center justify-between px-4 lg:px-6">
          {/* Logo for mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/Picture1.png" alt="Rewardy" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold neon-text-blue">Rewardy</span>
          </div>

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
            <div className="flex items-center gap-3">
              {/* Mobile currency display */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="star-display py-1 px-2">
                  <span className="star-icon text-sm">★</span>
                  <span className="text-white font-bold text-xs">{childStats.stars}</span>
                </div>
                <div className="gem-display py-1 px-2">
                  <span className="gem-icon text-sm">◆</span>
                  <span className="text-white font-bold text-xs">{childStats.gems}</span>
                </div>
              </div>
              <div className="streak-fire">
                <span className="streak-fire-icon">🔥</span>
                <span className="text-white font-bold text-sm">{childStats.streak}</span>
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 has-bottom-nav">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        navItems={mobileNavItems}
        moreItems={moreItems}
        onMoreClick={() => setMoreSheetOpen(true)}
        onLogout={handleLogout}
      />

      {/* More Sheet */}
      <MoreSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        items={moreItems}
        onLogout={handleLogout}
        userInfo={userInfo}
      />
    </div>
  )
}
