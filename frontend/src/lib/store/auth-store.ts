import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'
import type { User } from '@/types'

interface AuthState {
  // State
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  lastActivity: number | null
  sessionExpiry: number | null
  
  // Actions
  setUser: (user: User) => void
  setTokens: (token: string, refreshToken?: string) => void
  login: (user: User, token: string, refreshToken?: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateLastActivity: () => void
  clearError: () => void
  refreshSession: () => Promise<boolean>
  isSessionValid: () => boolean
}

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours
const ACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastActivity: null,
      sessionExpiry: null,

      // Set user and mark as authenticated
      setUser: (user: User) => {
        set({ 
          user, 
          isAuthenticated: true, 
          error: null,
          lastActivity: Date.now()
        })
      },
      
      // Set authentication tokens
      setTokens: (token: string, refreshToken?: string) => {
        const expiry = Date.now() + SESSION_TIMEOUT
        set({ 
          token, 
          refreshToken: refreshToken || get().refreshToken,
          sessionExpiry: expiry,
          lastActivity: Date.now()
        })
        
        // Update API client
        apiClient.setAuthToken(token, refreshToken)
      },
      
      // Complete login flow
      login: (user: User, token: string, refreshToken?: string) => {
        const expiry = Date.now() + SESSION_TIMEOUT
        set({ 
          user, 
          token, 
          refreshToken,
          isAuthenticated: true, 
          isLoading: false,
          error: null,
          lastActivity: Date.now(),
          sessionExpiry: expiry
        })
        
        // Update API client
        apiClient.setAuthToken(token, refreshToken)
      },
      
      // Logout and clear all data
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false, 
          isLoading: false,
          error: null,
          lastActivity: null,
          sessionExpiry: null
        })
        
        // Clear API client tokens
        apiClient.clearAuthToken()
      },
      
      // Set loading state
      setLoading: (isLoading: boolean) => {
        set({ isLoading, error: isLoading ? null : get().error })
      },
      
      // Set error state
      setError: (error: string | null) => {
        set({ error, isLoading: false })
      },
      
      // Clear error state
      clearError: () => {
        set({ error: null })
      },
      
      // Update last activity timestamp
      updateLastActivity: () => {
        set({ lastActivity: Date.now() })
      },
      
      // Check if current session is valid
      isSessionValid: (): boolean => {
        const state = get()
        if (!state.isAuthenticated || !state.token || !state.sessionExpiry) {
          return false
        }
        
        const now = Date.now()
        
        // Check if session has expired
        if (now > state.sessionExpiry) {
          return false
        }
        
        // Check if user has been inactive too long
        if (state.lastActivity && (now - state.lastActivity) > ACTIVITY_TIMEOUT) {
          return false
        }
        
        return true
      },
      
      // Refresh session using refresh token
      refreshSession: async (): Promise<boolean> => {
        const state = get()
        if (!state.refreshToken) {
          return false
        }
        
        try {
          set({ isLoading: true, error: null })
          
          // This would typically call your refresh endpoint
          // const response = await authApi.refresh(state.refreshToken)
          // For now, we'll simulate success
          
          // Update last activity
          set({ 
            isLoading: false,
            lastActivity: Date.now(),
            sessionExpiry: Date.now() + SESSION_TIMEOUT
          })
          
          return true
        } catch (error) {
          console.error('Session refresh failed:', error)
          
          // If refresh fails, logout user
          get().logout()
          set({ 
            error: 'Session expired. Please log in again.',
            isLoading: false 
          })
          
          return false
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
        sessionExpiry: state.sessionExpiry
      }),
      
      // Handle rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check if session is still valid on rehydration
          if (!state.isSessionValid()) {
            state.logout()
          } else {
            // Update API client with tokens
            if (state.token) {
              apiClient.setAuthToken(state.token, state.refreshToken || undefined)
            }
          }
        }
      },
    }
  )
)

// Auto-logout on inactivity
if (typeof window !== 'undefined') {
  let activityTimer: NodeJS.Timeout
  
  const resetActivityTimer = () => {
    clearTimeout(activityTimer)
    
    activityTimer = setTimeout(() => {
      const store = useAuthStore.getState()
      if (store.isAuthenticated && !store.isSessionValid()) {
        store.logout()
      }
    }, ACTIVITY_TIMEOUT)
    
    // Update last activity
    const store = useAuthStore.getState()
    if (store.isAuthenticated) {
      store.updateLastActivity()
    }
  }
  
  // Listen for user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
  events.forEach(event => {
    document.addEventListener(event, resetActivityTimer, true)
  })
  
  // Start the timer
  resetActivityTimer()
}

// Session validation hook
export const useSessionValidation = () => {
  const { isSessionValid, refreshSession, logout } = useAuthStore()
  
  const validateSession = async (): Promise<boolean> => {
    if (!isSessionValid()) {
      const refreshed = await refreshSession()
      if (!refreshed) {
        logout()
        return false
      }
    }
    return true
  }
  
  return { validateSession }
}