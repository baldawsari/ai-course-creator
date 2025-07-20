import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastState {
  toasts: Toast[]
}

let toastCount = 0
let toastListeners: ((toast: Toast) => void)[] = []

// Standalone toast function for use outside React components
export const toast = ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
  const id = (++toastCount).toString()
  const newToast: Toast = {
    id,
    title,
    description,
    variant,
  }
  
  // Notify all listeners
  toastListeners.forEach(listener => listener(newToast))
  
  return {
    id,
    dismiss: () => {
      // Notify listeners to remove this toast
      toastListeners.forEach(listener => listener({ ...newToast, id: `-${id}` }))
    },
  }
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = (++toastCount).toString()
      const newToast: Toast = {
        id,
        title,
        description,
        variant,
      }

      setState((prevState) => ({
        toasts: [...prevState.toasts, newToast],
      }))

      // Auto remove toast after 5 seconds
      setTimeout(() => {
        setState((prevState) => ({
          toasts: prevState.toasts.filter((t) => t.id !== id),
        }))
      }, 5000)

      return {
        id,
        dismiss: () => {
          setState((prevState) => ({
            toasts: prevState.toasts.filter((t) => t.id !== id),
          }))
        },
      }
    },
    []
  )

  const dismiss = useCallback((toastId: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }))
  }, [])

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  }
}