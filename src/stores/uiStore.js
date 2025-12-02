import { create } from 'zustand'

// Get initial sidebar collapsed state from localStorage
const getInitialCollapsedState = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('sidebarCollapsed')
    return stored === 'true'
  }
  return false
}

export const useUIStore = create((set) => ({
  // Sidebar state (for mobile overlay)
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Sidebar collapsed state (for desktop rail mode)
  sidebarCollapsed: getInitialCollapsedState(),
  toggleSidebarCollapsed: () => set((state) => {
    const newState = !state.sidebarCollapsed
    localStorage.setItem('sidebarCollapsed', String(newState))
    return { sidebarCollapsed: newState }
  }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('sidebarCollapsed', String(collapsed))
    set({ sidebarCollapsed: collapsed })
  },

  // More sheet (mobile bottom nav overflow menu)
  moreSheetOpen: false,
  toggleMoreSheet: () => set((state) => ({ moreSheetOpen: !state.moreSheetOpen })),
  setMoreSheetOpen: (open) => set({ moreSheetOpen: open }),

  // Mobile menu (legacy - keeping for compatibility)
  mobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  // Modal state
  activeModal: null,
  modalData: null,
  openModal: (modalName, data = null) => set({ activeModal: modalName, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Loading overlay
  globalLoading: false,
  loadingMessage: '',
  setGlobalLoading: (loading, message = '') => set({ globalLoading: loading, loadingMessage: message }),

  // Theme (for future dark mode)
  theme: 'light',
  setTheme: (theme) => set({ theme }),

  // Confirmation dialog
  confirmDialog: null,
  showConfirm: (options) => set({ confirmDialog: options }),
  hideConfirm: () => set({ confirmDialog: null }),
}))
