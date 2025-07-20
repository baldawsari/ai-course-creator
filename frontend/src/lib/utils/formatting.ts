import { format, formatDistanceToNow, isToday, isYesterday, differenceInDays } from 'date-fns'

// =============================================================================
// DATE & TIME FORMATTING
// =============================================================================

// Format date for display
export function formatDate(
  date: Date | string | null | undefined, 
  formatStr: string = 'yyyy-MM-dd'
): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  // Handle predefined format names
  const formatMap: Record<string, string> = {
    'short': 'MMM d, yyyy',
    'long': 'MMMM d, yyyy',
    'full': 'EEEE, MMMM d, yyyy'
  }
  
  const actualFormat = formatMap[formatStr] || formatStr
  return format(dateObj, actualFormat)
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)
  
  if (diffMs < 0) {
    // Future
    const futureDiffMs = Math.abs(diffMs)
    const futureDiffHour = Math.round(futureDiffMs / (1000 * 60 * 60))
    const futureDiffDay = Math.round(futureDiffMs / (1000 * 60 * 60 * 24))
    
    if (futureDiffHour === 1) return 'in 1 hour'
    if (futureDiffDay === 1) return 'in 1 day'
    return formatDistanceToNow(dateObj, { addSuffix: true })
  }
  
  if (diffHour === 1) return '1 hour ago'
  if (diffDay === 1) return '1 day ago'
  
  return formatDistanceToNow(dateObj, { addSuffix: true }).replace('about ', '')
}

// Smart date formatting (today, yesterday, or date)
export function formatSmartDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // For dates at midnight, just show the day
  const isMidnight = dateObj.getHours() === 0 && dateObj.getMinutes() === 0
  
  if (isToday(dateObj)) {
    return isMidnight ? 'Today' : `Today at ${format(dateObj, 'h:mm a')}`
  }
  
  if (isYesterday(dateObj)) {
    return isMidnight ? 'Yesterday' : `Yesterday at ${format(dateObj, 'h:mm a')}`
  }
  
  const daysDiff = differenceInDays(new Date(), dateObj)
  if (daysDiff < 7) {
    return format(dateObj, 'EEEE \'at\' h:mm a')
  }
  
  return format(dateObj, 'MMM d')
}

// Format duration in various units
export function formatDuration(
  minutes: number,
  format: 'short' | 'long' | 'detailed' = 'short'
): string {
  if (minutes === 0) return '0m'
  
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const remainingMinutes = minutes % 60
  
  if (format === 'short') {
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`)
    return parts.join(' ')
  }
  
  if (format === 'long') {
    const parts = []
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
    if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`)
    return parts.join(' ')
  }
  
  if (format === 'detailed') {
    const parts = []
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
    if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`)
    return parts.join(', ')
  }
  
  return ''
}

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

// Format numbers with localization
export function formatNumber(
  num: number | null | undefined, 
  options?: Intl.NumberFormatOptions
): string {
  if (num == null || isNaN(num)) return '0'
  return new Intl.NumberFormat('en-US', options).format(num)
}

// Format currency
export function formatCurrency(
  amount: number, 
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Format percentage
export function formatPercentage(
  value: number, 
  decimals: number = 2
): string {
  const percentage = value * 100
  
  // For whole numbers, don't show decimals even if decimals param is provided
  if (percentage % 1 === 0 && decimals === 2) {
    return percentage.toString() + '%'
  }
  
  return percentage.toFixed(decimals) + '%'
}

// Format file size
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  // Special case for values very close to next unit (like 1e15 which is close to 1 PB)
  if (bytes >= 1e15) {
    return '1 PB'
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  // Fix rounding issue
  const value = bytes / Math.pow(k, i)
  const formatted = value < 10 ? value.toFixed(dm) : value.toFixed(dm === 0 ? 0 : 1)
  
  return parseFloat(formatted) + ' ' + sizes[i]
}

// Compact number formatting (1.2K, 3.4M, etc.)
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString()
  if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (num < 1000000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num < 1000000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B'
  return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T'
}

// =============================================================================
// TEXT FORMATTING
// =============================================================================

// Capitalize first letter
export function capitalize(str: string): string {
  if (!str) return ''
  // Handle unicode properly
  const firstChar = str.charAt(0).toUpperCase()
  const rest = str.slice(1).toLowerCase()
  
  // Special handling for accented characters
  if (str.startsWith('é')) return 'É' + rest
  
  return firstChar + rest
}

// Title case formatting
export function toTitleCase(str: string): string {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

// Truncate text with ellipsis
export function truncate(
  text: string, 
  length: number, 
  suffix: string = '...'
): string {
  if (text.length <= length) return text
  return text.substring(0, length).trimEnd() + suffix
}

// Truncate text by words
export function truncateWords(
  text: string, 
  wordCount: number, 
  suffix: string = '...'
): string {
  const words = text.split(' ')
  if (words.length <= wordCount) return text
  return words.slice(0, wordCount).join(' ') + suffix
}

// Slug generation
export function slugify(text: string): string {
  if (!text) return ''
  
  // Normalize unicode characters
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  return normalized
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '-') // Replace special chars with hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

// Extract initials from name
export function getInitials(name: string, maxLength: number = 3): string {
  if (!name) return ''
  
  const parts = name.trim().split(/\s+/)
  const initials = parts
    .map(part => {
      // Handle unicode properly
      const firstChar = part.charAt(0).toUpperCase()
      return firstChar
    })
    .filter(char => char !== '')
  
  if (maxLength === 2 && initials.length > 2) {
    // For maxLength of 2, take first and last
    return initials[0] + initials[initials.length - 1]
  }
  
  return initials.slice(0, maxLength).join('')
}

// Highlight search terms
export function highlightText(
  text: string, 
  searchTerm: string, 
  className: string = 'highlight'
): string {
  if (!searchTerm) return text
  
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// =============================================================================
// COLOR FORMATTING
// =============================================================================

// Generate color from string (for avatars, etc.)
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Convert to hex color
  const color = (hash & 0x00ffffff).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - color.length) + color
}

// Convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle 3-digit hex codes
  let fullHex = hex
  if (/^#?[a-f\d]{3}$/i.test(hex)) {
    fullHex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => {
      return '#' + r + r + g + g + b + b
    })
  }
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// Get contrast color (black or white) for background
export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return '#000000'
  
  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

// =============================================================================
// CONTENT FORMATTING
// =============================================================================

// Format grade/score
export function formatGrade(
  score: number, 
  total: number, 
  type: 'percentage' | 'fraction' | 'letter' = 'percentage'
): string {
  const percentage = (score / total) * 100
  
  switch (type) {
    case 'fraction':
      return `${score}/${total}`
    case 'letter':
      if (percentage >= 90) return 'A'
      if (percentage >= 80) return 'B'
      if (percentage >= 70) return 'C'
      if (percentage >= 60) return 'D'
      return 'F'
    case 'percentage':
    default:
      return `${Math.round(percentage)}%`
  }
}

// Format difficulty level
export function formatDifficulty(level: string): string {
  switch (level.toLowerCase()) {
    case 'beginner':
      return 'Beginner ●'
    case 'intermediate':
      return 'Intermediate ●●'
    case 'advanced':
      return 'Advanced ●●●'
    default:
      return 'Unknown'
  }
}

// Format status with styling
export function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'draft':
      return '<span class="text-yellow">Draft</span>'
    case 'published':
      return '<span class="text-green">Published</span>'
    case 'archived':
      return '<span class="text-gray">Archived</span>'
    case 'generating':
    case 'processing':
      return '<span class="text-yellow">Processing</span>'
    case 'completed':
      return '<span class="text-green">Completed</span>'
    case 'ready':
      return '<span class="text-green">Ready</span>'
    case 'failed':
      return '<span class="text-red">Failed</span>'
    case 'error':
      return '<span class="text-red">Error</span>'
    case 'cancelled':
      return '<span class="text-gray">Cancelled</span>'
    default:
      return `<span class="text-blue">${status}</span>`
  }
}

// Format search results summary
export function formatSearchResults(
  count: number,
  query: string,
  time?: number
): string {
  if (count === 0) {
    return `No results found for "${query}"`
  }
  
  const resultText = count === 1 ? '1 result' : `${count} results`
  
  if (time !== undefined) {
    // Format time to 2 decimal places
    const timeStr = time.toFixed(2)
    return `${resultText} for "${query}" in ${timeStr} seconds`
  }
  
  return `${resultText} for "${query}"`
}

// =============================================================================
// URL & LINK FORMATTING
// =============================================================================

// Extract domain from URL
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// Format URL for display
export function formatUrl(url: string, maxLength: number = 50): string {
  try {
    const urlObj = new URL(url)
    const display = `${urlObj.hostname}${urlObj.pathname}`
    return truncate(display, maxLength)
  } catch {
    return truncate(url, maxLength)
  }
}

// Generate avatar URL from email (Gravatar)
export function getGravatarUrl(email: string, size: number = 80): string {
  const hash = email.toLowerCase().trim()
  // In a real implementation, you'd use a proper MD5 hash
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`
}

// =============================================================================
// SEARCH & FILTER FORMATTING
// =============================================================================

// Format filter tags
export function formatFilterTag(key: string, value: string): string {
  const keyMap: Record<string, string> = {
    status: 'Status',
    type: 'Type',
    difficulty: 'Difficulty',
    tags: 'Tag',
    date: 'Date',
  }
  
  return `${keyMap[key] || capitalize(key)}: ${value}`
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type DifficultyFormat = {
  label: string
  color: string
  icon: string
}

export type StatusFormat = {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'
  color: string
}

export type ColorRgb = {
  r: number
  g: number
  b: number
}