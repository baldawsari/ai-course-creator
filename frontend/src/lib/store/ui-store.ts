import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'
type SidebarState = 'expanded' | 'collapsed' | 'hidden'
type NotificationType = 'info' | 'success' | 'warning' | 'error'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  timestamp: number
}

interface Modal {
  id: string
  component: string
  props?: Record<string, any>
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  persistent?: boolean
}

interface UIPreferences {
  compactMode: boolean
  animationsEnabled: boolean
  soundEnabled: boolean
  autoSave: boolean
  autoSaveInterval: number // seconds
  defaultView: 'grid' | 'list' | 'table'
  itemsPerPage: number
  showTours: boolean
  showTooltips: boolean
}

interface UIState {
  // Theme and appearance
  theme: Theme
  sidebarState: SidebarState
  isFullscreen: boolean
  
  // Layout states
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  focusMode: boolean
  
  // Loading states
  globalLoading: boolean
  loadingMessage: string | null
  
  // Notifications
  notifications: Notification[]
  
  // Modals and overlays
  modals: Modal[]
  commandPaletteOpen: boolean
  
  // User preferences
  preferences: UIPreferences
  
  // Navigation
  breadcrumbs: Array<{ label: string; href?: string }>
  
  // Search
  globalSearchOpen: boolean
  globalSearchQuery: string
  
  // Actions - Theme and layout
  setTheme: (theme: Theme) => void
  setSidebarState: (state: SidebarState) => void
  toggleSidebar: () => void
  setFullscreen: (fullscreen: boolean) => void
  toggleFullscreen: () => void
  
  // Actions - Panel management
  setLeftPanel: (open: boolean) => void
  setRightPanel: (open: boolean) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setFocusMode: (focus: boolean) => void
  toggleFocusMode: () => void
  
  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string) => void
  
  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
  markNotificationRead: (id: string) => void
  
  // Actions - Modals
  openModal: (modal: Omit<Modal, 'id'>) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
  
  // Actions - Command palette
  setCommandPalette: (open: boolean) => void
  toggleCommandPalette: () => void
  
  // Actions - Preferences
  updatePreferences: (preferences: Partial<UIPreferences>) => void
  resetPreferences: () => void
  
  // Actions - Navigation
  setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => void
  addBreadcrumb: (breadcrumb: { label: string; href?: string }) => void
  
  // Actions - Search
  setGlobalSearch: (open: boolean, query?: string) => void
  toggleGlobalSearch: () => void
  setGlobalSearchQuery: (query: string) => void
  
  // Computed values
  getUnreadNotifications: () => Notification[]
  getActiveModal: () => Modal | null
}

const defaultPreferences: UIPreferences = {
  compactMode: false,
  animationsEnabled: true,
  soundEnabled: false,
  autoSave: true,
  autoSaveInterval: 30,
  defaultView: 'grid',
  itemsPerPage: 20,
  showTours: true,
  showTooltips: true,
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      sidebarState: 'expanded',
      isFullscreen: false,
      leftPanelOpen: true,
      rightPanelOpen: true,
      focusMode: false,
      globalLoading: false,
      loadingMessage: null,
      notifications: [],
      modals: [],
      commandPaletteOpen: false,
      preferences: defaultPreferences,
      breadcrumbs: [],
      globalSearchOpen: false,
      globalSearchQuery: '',

      // Theme and layout actions
      setTheme: (theme: Theme) => {
        set({ theme })
        
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            root.classList.add(systemTheme)
          } else {
            root.classList.add(theme)
          }
        }
      },

      setSidebarState: (sidebarState: SidebarState) => {
        set({ sidebarState })
      },

      toggleSidebar: () => {
        const { sidebarState } = get()
        const newState = sidebarState === 'expanded' ? 'collapsed' : 'expanded'
        set({ sidebarState: newState })
      },

      setFullscreen: (isFullscreen: boolean) => {
        set({ isFullscreen })
        
        if (typeof window !== 'undefined') {
          if (isFullscreen) {
            document.documentElement.requestFullscreen?.()
          } else {
            document.exitFullscreen?.()
          }
        }
      },

      toggleFullscreen: () => {
        const { isFullscreen } = get()
        get().setFullscreen(!isFullscreen)
      },

      // Panel management
      setLeftPanel: (leftPanelOpen: boolean) => {
        set({ leftPanelOpen })
      },

      setRightPanel: (rightPanelOpen: boolean) => {
        set({ rightPanelOpen })
      },

      toggleLeftPanel: () => {
        const { leftPanelOpen } = get()
        set({ leftPanelOpen: !leftPanelOpen })
      },

      toggleRightPanel: () => {
        const { rightPanelOpen } = get()
        set({ rightPanelOpen: !rightPanelOpen })
      },

      setFocusMode: (focusMode: boolean) => {
        set({ 
          focusMode,
          // When entering focus mode, hide panels
          leftPanelOpen: focusMode ? false : get().leftPanelOpen,
          rightPanelOpen: focusMode ? false : get().rightPanelOpen,
          sidebarState: focusMode ? 'hidden' : get().sidebarState,
        })
      },

      toggleFocusMode: () => {
        const { focusMode } = get()
        get().setFocusMode(!focusMode)
      },

      // Loading management
      setGlobalLoading: (globalLoading: boolean, loadingMessage?: string) => {
        set({ globalLoading, loadingMessage: loadingMessage || null })
      },

      // Notification management
      addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        const id = `notification_${Date.now()}_${Math.random()}`
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
        }
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }))

        // Auto-remove notification after duration
        if (notification.duration !== 0) {
          const duration = notification.duration || 5000
          setTimeout(() => {
            get().removeNotification(id)
          }, duration)
        }

        return id
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }))
      },

      clearNotifications: () => {
        set({ notifications: [] })
      },

      markNotificationRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        }))
      },

      // Modal management
      openModal: (modal: Omit<Modal, 'id'>) => {
        const id = `modal_${Date.now()}_${Math.random()}`
        const newModal: Modal = { ...modal, id }
        
        set((state) => ({
          modals: [...state.modals, newModal],
        }))

        return id
      },

      closeModal: (id: string) => {
        set((state) => ({
          modals: state.modals.filter(m => m.id !== id),
        }))
      },

      closeAllModals: () => {
        set({ modals: [] })
      },

      // Command palette
      setCommandPalette: (commandPaletteOpen: boolean) => {
        set({ commandPaletteOpen })
      },

      toggleCommandPalette: () => {
        const { commandPaletteOpen } = get()
        set({ commandPaletteOpen: !commandPaletteOpen })
      },

      // Preferences management
      updatePreferences: (preferences: Partial<UIPreferences>) => {
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        }))
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences })
      },

      // Navigation
      setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => {
        set({ breadcrumbs })
      },

      addBreadcrumb: (breadcrumb: { label: string; href?: string }) => {
        set((state) => ({
          breadcrumbs: [...state.breadcrumbs, breadcrumb],
        }))
      },

      // Search
      setGlobalSearch: (globalSearchOpen: boolean, globalSearchQuery?: string) => {
        set({ 
          globalSearchOpen,
          globalSearchQuery: globalSearchQuery || get().globalSearchQuery,
        })
      },

      toggleGlobalSearch: () => {
        const { globalSearchOpen } = get()
        set({ globalSearchOpen: !globalSearchOpen })
      },

      setGlobalSearchQuery: (globalSearchQuery: string) => {
        set({ globalSearchQuery })
      },

      // Computed values
      getUnreadNotifications: () => {
        const { notifications } = get()
        return notifications.filter(n => !n.read)
      },

      getActiveModal: () => {
        const { modals } = get()
        return modals[modals.length - 1] || null
      },
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarState: state.sidebarState,
        preferences: state.preferences,
        leftPanelOpen: state.leftPanelOpen,
        rightPanelOpen: state.rightPanelOpen,
      }),
    }
  )
)

// Utility hooks
export const useTheme = () => useUIStore(state => state.theme)
export const useSidebar = () => useUIStore(state => ({ 
  state: state.sidebarState, 
  toggle: state.toggleSidebar,
  setState: state.setSidebarState 
}))
export const useNotifications = () => useUIStore(state => ({
  notifications: state.notifications,
  add: state.addNotification,
  remove: state.removeNotification,
  clear: state.clearNotifications,
  unread: state.getUnreadNotifications(),
}))
export const useModals = () => useUIStore(state => ({
  modals: state.modals,
  active: state.getActiveModal(),
  open: state.openModal,
  close: state.closeModal,
  closeAll: state.closeAllModals,
}))
export const useFocusMode = () => useUIStore(state => ({
  enabled: state.focusMode,
  toggle: state.toggleFocusMode,
  set: state.setFocusMode,
}))

// System theme detection
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const updateSystemTheme = () => {
    const { theme, setTheme } = useUIStore.getState()
    if (theme === 'system') {
      setTheme('system') // This will trigger the theme application
    }
  }
  
  mediaQuery.addEventListener('change', updateSystemTheme)
  
  // Apply initial theme
  const { theme } = useUIStore.getState()
  useUIStore.getState().setTheme(theme)
}