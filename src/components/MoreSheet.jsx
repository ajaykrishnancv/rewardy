import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { NavIcon } from './BottomNav'

export default function MoreSheet({ isOpen, onClose, items, onLogout, userInfo }) {
  const sheetRef = useRef(null)

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (sheetRef.current && !sheetRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl animate-slide-up-sheet"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* User info section */}
        {userInfo && (
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">
                  {userInfo.initial}
                </span>
              </div>
              <div>
                <p className="font-semibold text-white text-lg">{userInfo.name}</p>
                <p className="text-sm text-white/60">{userInfo.family}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="px-4 py-2">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-neon-blue'
                    : 'text-white/80 active:bg-white/5'
                }`
              }
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <NavIcon icon={item.icon} size="w-5 h-5" />
              </div>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* Logout button */}
          <button
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-red-400 active:bg-red-500/10 transition-all duration-200 mt-2"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <NavIcon icon="logout" size="w-5 h-5" />
            </div>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

        {/* Safe area padding */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  )
}
