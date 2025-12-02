import { NavLink } from 'react-router-dom'

function NavIcon({ icon, size = 'w-6 h-6' }) {
  const icons = {
    home: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    calendar: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    tasks: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    gift: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    chart: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    cog: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bank: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l9-4 9 4v2H3V6zm0 4h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10zm4 4v4m4-4v4m4-4v4" />
      </svg>
    ),
    trophy: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14a1 1 0 011 1v3a7 7 0 01-7 7 7 7 0 01-7-7V4a1 1 0 011-1zm7 14v4m-4 0h8" />
      </svg>
    ),
    skills: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    more: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
    logout: (
      <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
  }
  return icons[icon] || null
}

export default function BottomNav({ navItems, moreItems, onMoreClick, onLogout }) {
  // Show first 4 items in bottom nav, rest go to "More"
  const primaryItems = navItems.slice(0, 4)
  const hasMore = moreItems.length > 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Gradient fade effect at top */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none" />

      {/* Navigation bar */}
      <div className="bg-gray-900/95 backdrop-blur-xl border-t border-white/10 px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {primaryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-neon-blue'
                    : 'text-white/50 active:text-white/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative ${isActive ? 'transform scale-110' : ''} transition-transform`}>
                    <NavIcon icon={item.icon} />
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-blue shadow-[0_0_8px_var(--color-neon-blue)]" />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-neon-blue' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          {hasMore && (
            <button
              onClick={onMoreClick}
              className="flex flex-col items-center justify-center w-16 h-14 rounded-xl text-white/50 active:text-white/70 transition-all duration-200"
            >
              <NavIcon icon="more" />
              <span className="text-[10px] mt-1 font-medium">More</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export { NavIcon }
