// =============================================================================
// UTILITY EXPORTS
// =============================================================================

// Re-export all validation utilities
export * from './validation'
export {
  validateForm,
  validateFile,
  isValidUrl,
  isValidEmail,
  getPasswordStrength,
  validateContent,
  formatBytes,
  sanitizeHtml,
  isValidJson,
} from './validation'

// Re-export all formatting utilities
export * from './formatting'
export {
  formatDate,
  formatRelativeTime,
  formatSmartDate,
  formatDuration,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatCompactNumber,
  capitalize,
  toTitleCase,
  truncate,
  truncateWords,
  slugify,
  getInitials,
  highlightText,
  stringToColor,
  hexToRgb,
  getContrastColor,
  formatGrade,
  formatDifficulty,
  formatStatus,
  getDomain,
  formatUrl,
  getGravatarUrl,
  formatSearchResults,
  formatFilterTag,
} from './formatting'

// Re-export analytics utilities
export * from './analytics'
export {
  trackEvent,
  trackPageView,
  identifyUser,
  setAnalyticsEnabled,
  isAnalyticsEnabled,
  courseAnalytics,
  performanceAnalytics,
  engagementAnalytics,
  usePageTracking,
  useTimeTracking,
  useFeatureTracking,
  analytics,
  AnalyticsEvents,
} from './analytics'

// Re-export performance utilities
export * from './performance'
export {
  getPerformanceInsights,
  useRenderPerformance,
  useAPIPerformance,
  useMemoryMonitor,
  usePerformanceMetrics,
  performanceMonitor,
  bundleSizeAnalyzer,
  memoryMonitor,
  apiPerformanceTracker,
  renderPerformanceTracker,
} from './performance'

// =============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// =============================================================================

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

// Generate unique ID
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Retry async function with exponential backoff
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Promise with timeout
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })
  
  return Promise.race([promise, timeoutPromise])
}

// Check if value is empty (null, undefined, empty string, empty array, empty object)
export function isEmpty(value: any): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// Safe JSON parse with default value
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return defaultValue
  }
}

// Create array of specific length
export function createArray(length: number): number[]
export function createArray<T>(length: number, fill: T): T[]
export function createArray<T>(length: number, fill?: T): (number | T)[] {
  return fill !== undefined 
    ? Array(length).fill(fill)
    : Array.from({ length }, (_, i) => i)
}

// Group array by key
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

// Remove duplicates from array
export function uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

// Sort array by multiple keys
export function sortBy<T>(
  array: T[],
  ...keys: Array<keyof T | ((item: T) => any)>
): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      const aVal = typeof key === 'function' ? key(a) : a[key]
      const bVal = typeof key === 'function' ? key(b) : b[key]
      
      if (aVal < bVal) return -1
      if (aVal > bVal) return 1
    }
    return 0
  })
}

// Calculate percentage change
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100
  return ((newValue - oldValue) / oldValue) * 100
}

// Clamp number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Linear interpolation
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * clamp(factor, 0, 1)
}

// Random number between min and max
export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Check if device is mobile
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768
}

// Check if device is touch-enabled
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Get device info
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      userAgent: '',
    }
  }

  const width = window.innerWidth
  const userAgent = navigator.userAgent

  return {
    isMobile: width <= 768,
    isTablet: width > 768 && width <= 1024,
    isDesktop: width > 1024,
    isTouch: isTouchDevice(),
    userAgent,
  }
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const success = document.execCommand('copy')
      textArea.remove()
      return success
    }
  } catch {
    return false
  }
}

// Download file from blob
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Download text as file
export function downloadText(text: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([text], { type: mimeType })
  downloadBlob(blob, filename)
}

// Download JSON as file
export function downloadJson(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  downloadText(json, filename, 'application/json')
}

// Create download URL for file
export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

// Revoke download URL
export function revokeDownloadUrl(url: string): void {
  URL.revokeObjectURL(url)
}

// =============================================================================
// TYPE UTILITIES
// =============================================================================

// Make all properties of T optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Make all properties of T required recursively
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

// Extract keys of T that have type U
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

// Omit keys by type
export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>

// Pick keys by type
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>

// Create type with all string values
export type StringValues<T> = {
  [K in keyof T]: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const CONSTANTS = {
  // File size limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  UPLOAD_TIMEOUT: 300000, // 5 minutes
  
  // Debounce delays
  SEARCH_DEBOUNCE: 300,
  AUTOSAVE_DEBOUNCE: 2000,
  RESIZE_DEBOUNCE: 100,
  
  // Cache durations
  SHORT_CACHE: 5 * 60 * 1000, // 5 minutes
  MEDIUM_CACHE: 30 * 60 * 1000, // 30 minutes
  LONG_CACHE: 24 * 60 * 60 * 1000, // 24 hours
  
  // Animation durations (in ms)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,
  
  // Breakpoints (matches Tailwind)
  BREAKPOINTS: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const

// =============================================================================
// ERROR UTILITIES
// =============================================================================

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

// Error handling utilities
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError
}

export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError
}

export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError
}

export function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}