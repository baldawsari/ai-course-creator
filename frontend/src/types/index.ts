// Re-export all types for easier imports
export * from './auth'
export * from './course'
export * from './document'
export * from './api'
export * from './generation'

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

// Form types
export interface FormField<T = any> {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'file' | 'checkbox' | 'radio'
  value: T
  placeholder?: string
  required?: boolean
  validation?: ValidationRule[]
  options?: SelectOption[]
}

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
}

// UI Component types
export interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface AsyncState<T> extends LoadingState {
  data: T | null
}

// Theme types
export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    foreground: string
    success: string
    warning: string
    error: string
  }
  fonts: {
    heading: string
    body: string
  }
  spacing: Record<string, string>
  borderRadius: Record<string, string>
}