import { create } from 'zustand'

export const useUIStore = create((set) => ({
  // Sidebar state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Mobile menu
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
