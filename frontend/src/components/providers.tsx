'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { useToast, Toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Toast Provider and Component
const ToastContext = createContext<{
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => { id: string; dismiss: () => void }
  dismiss: (toastId: string) => void
}>({
  toasts: [],
  toast: () => ({ id: '', dismiss: () => {} }),
  dismiss: () => {},
})

export const useToastContext = () => useContext(ToastContext)

function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, toast, dismiss } = useToast()

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// Toast Container Component
function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center space-x-4 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0',
            'animate-in slide-in-from-right-full duration-300',
            toast.variant === 'destructive'
              ? 'bg-red-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
          )}
        >
          <div className="flex-1">
            {toast.title && <p className="font-semibold">{toast.title}</p>}
            {toast.description && <p className="text-sm opacity-90">{toast.description}</p>}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-white/80 hover:text-white focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

// Auth Context Provider (Simple version using localStorage)
interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  login: (token: string, refreshToken?: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  login: () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken) {
      setToken(storedToken)
      setIsAuthenticated(true)
    }
  }, [])

  const login = (newToken: string, refreshToken?: string) => {
    localStorage.setItem('auth_token', newToken)
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
    setToken(newToken)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    setIsAuthenticated(false)
    // Redirect to login
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Main Providers Component
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {children}
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}