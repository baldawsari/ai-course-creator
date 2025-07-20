import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
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
  formatSearchResults,
} from '../formatting'

describe('formatting utilities', () => {
  describe('date formatting', () => {
    const testDate = new Date('2024-01-15T10:30:00Z')

    it('should format dates with default format', () => {
      expect(formatDate(testDate)).toBe('2024-01-15')
    })

    it('should format dates with custom formats', () => {
      expect(formatDate(testDate, 'short')).toBe('Jan 15, 2024')
      expect(formatDate(testDate, 'long')).toBe('January 15, 2024')
      expect(formatDate(testDate, 'full')).toBe('Monday, January 15, 2024')
    })

    it('should handle invalid dates gracefully', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid Date')
    })

    it('should format relative time correctly', () => {
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const future = new Date(now.getTime() + 60 * 60 * 1000)

      expect(formatRelativeTime(hourAgo)).toBe('1 hour ago')
      expect(formatRelativeTime(dayAgo)).toBe('1 day ago')
      expect(formatRelativeTime(future)).toBe('in 1 hour')
    })

    it('should format smart dates', () => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      expect(formatSmartDate(today)).toBe('Today')
      expect(formatSmartDate(yesterday)).toBe('Yesterday')
      expect(formatSmartDate(lastWeek)).toMatch(/\w{3} \d{1,2}/) // e.g., "Jan 8"
    })

    it('should format durations correctly', () => {
      expect(formatDuration(30)).toBe('30m')
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(1440)).toBe('1d')
      expect(formatDuration(1530)).toBe('1d 1h 30m')
      expect(formatDuration(0)).toBe('0m')
    })

    it('should format durations with different formats', () => {
      expect(formatDuration(90, 'short')).toBe('1h 30m')
      expect(formatDuration(90, 'long')).toBe('1 hour 30 minutes')
      expect(formatDuration(90, 'detailed')).toBe('1 hour, 30 minutes')
    })
  })

  describe('number formatting', () => {
    it('should format numbers with default locale', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56')
      expect(formatNumber(1000000)).toBe('1,000,000')
    })

    it('should format numbers with custom options', () => {
      expect(formatNumber(1234.567, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        .toBe('1,234.57')
    })

    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56')
      expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56')
    })

    it('should format percentages', () => {
      expect(formatPercentage(0.1234)).toBe('12.34%')
      expect(formatPercentage(0.1234, 1)).toBe('12.3%')
      expect(formatPercentage(1)).toBe('100%')
    })

    it('should format file sizes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format compact numbers', () => {
      expect(formatCompactNumber(1000)).toBe('1K')
      expect(formatCompactNumber(1500)).toBe('1.5K')
      expect(formatCompactNumber(1000000)).toBe('1M')
      expect(formatCompactNumber(2500000)).toBe('2.5M')
      expect(formatCompactNumber(1000000000)).toBe('1B')
      expect(formatCompactNumber(999)).toBe('999')
    })
  })

  describe('text formatting', () => {
    it('should capitalize text correctly', () => {
      expect(capitalize('hello world')).toBe('Hello world')
      expect(capitalize('HELLO WORLD')).toBe('Hello world')
      expect(capitalize('')).toBe('')
    })

    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World')
      expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox')
      expect(toTitleCase('a tale of two cities')).toBe('A Tale Of Two Cities')
    })

    it('should truncate text correctly', () => {
      const longText = 'This is a very long piece of text that should be truncated'
      
      expect(truncate(longText, 20)).toBe('This is a very long...')
      expect(truncate(longText, 20, '---')).toBe('This is a very long---')
      expect(truncate('short', 20)).toBe('short')
    })

    it('should truncate by words', () => {
      const text = 'This is a sample text for testing word truncation'
      
      expect(truncateWords(text, 5)).toBe('This is a sample text...')
      expect(truncateWords(text, 3, '---')).toBe('This is a---')
      expect(truncateWords('short text', 5)).toBe('short text')
    })

    it('should create slugs correctly', () => {
      expect(slugify('Hello World!')).toBe('hello-world')
      expect(slugify('JavaScript & React Course')).toBe('javascript-react-course')
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
      expect(slugify('Special@#$%Characters')).toBe('special-characters')
    })

    it('should extract initials', () => {
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('Mary Jane Watson')).toBe('MJW')
      expect(getInitials('Cher')).toBe('C')
      expect(getInitials('')).toBe('')
      expect(getInitials('john doe')).toBe('JD') // should capitalize
    })

    it('should limit initials length', () => {
      expect(getInitials('John Michael Peter Smith', 2)).toBe('JS')
      expect(getInitials('A B C D E F', 3)).toBe('ABC')
    })

    it('should highlight search terms', () => {
      const text = 'This is a test text with some words'
      const highlighted = highlightText(text, 'test')
      
      expect(highlighted).toContain('<mark>test</mark>')
      expect(highlighted).toBe('This is a <mark>test</mark> text with some words')
    })

    it('should highlight multiple occurrences', () => {
      const text = 'test this test text'
      const highlighted = highlightText(text, 'test')
      
      expect(highlighted).toBe('<mark>test</mark> this <mark>test</mark> text')
    })

    it('should handle case-insensitive highlighting', () => {
      const text = 'Test this TEST text'
      const highlighted = highlightText(text, 'test')
      
      expect(highlighted).toBe('<mark>Test</mark> this <mark>TEST</mark> text')
    })
  })

  describe('color utilities', () => {
    it('should generate consistent colors from strings', () => {
      const color1 = stringToColor('test string')
      const color2 = stringToColor('test string')
      const color3 = stringToColor('different string')
      
      expect(color1).toBe(color2) // same input = same output
      expect(color1).not.toBe(color3) // different input = different output
      expect(color1).toMatch(/^#[0-9a-f]{6}$/i) // valid hex color
    })

    it('should convert hex to RGB', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should handle 3-digit hex codes', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 })
    })

    it('should return null for invalid hex codes', () => {
      expect(hexToRgb('invalid')).toBeNull()
      expect(hexToRgb('#gg0000')).toBeNull()
      expect(hexToRgb('')).toBeNull()
    })

    it('should determine contrast colors', () => {
      expect(getContrastColor('#ffffff')).toBe('#000000') // white bg = black text
      expect(getContrastColor('#000000')).toBe('#ffffff') // black bg = white text
      expect(getContrastColor('#ff0000')).toBe('#ffffff') // red bg = white text
      expect(getContrastColor('#ffff00')).toBe('#000000') // yellow bg = black text
    })
  })

  describe('specialized formatting', () => {
    it('should format grades correctly', () => {
      expect(formatGrade(85, 100)).toBe('85%')
      expect(formatGrade(85, 100, 'fraction')).toBe('85/100')
      expect(formatGrade(95, 100, 'letter')).toBe('A')
      expect(formatGrade(85, 100, 'letter')).toBe('B')
      expect(formatGrade(75, 100, 'letter')).toBe('C')
      expect(formatGrade(65, 100, 'letter')).toBe('D')
      expect(formatGrade(55, 100, 'letter')).toBe('F')
    })

    it('should format difficulty levels', () => {
      const beginner = formatDifficulty('beginner')
      const intermediate = formatDifficulty('intermediate')
      const advanced = formatDifficulty('advanced')
      
      expect(beginner).toContain('Beginner')
      expect(intermediate).toContain('Intermediate')
      expect(advanced).toContain('Advanced')
      
      // Should include visual indicators
      expect(beginner).toContain('●')
      expect(intermediate).toContain('●●')
      expect(advanced).toContain('●●●')
    })

    it('should format status with colors', () => {
      const draft = formatStatus('draft')
      const published = formatStatus('published')
      const archived = formatStatus('archived')
      
      expect(draft).toContain('Draft')
      expect(published).toContain('Published')
      expect(archived).toContain('Archived')
      
      // Should include appropriate styling classes
      expect(draft).toContain('text-yellow')
      expect(published).toContain('text-green')
      expect(archived).toContain('text-gray')
    })

    it('should format search results summary', () => {
      const summary = formatSearchResults(42, 'javascript', 0.125)
      
      expect(summary).toContain('42 results')
      expect(summary).toContain('javascript')
      expect(summary).toContain('0.13 seconds')
    })

    it('should handle zero search results', () => {
      const summary = formatSearchResults(0, 'xyz')
      
      expect(summary).toContain('No results found')
      expect(summary).toContain('xyz')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle null and undefined values gracefully', () => {
      expect(() => formatDate(null as any)).not.toThrow()
      expect(() => formatNumber(null as any)).not.toThrow()
      expect(() => capitalize(null as any)).not.toThrow()
      expect(() => slugify(undefined as any)).not.toThrow()
    })

    it('should handle very large numbers', () => {
      expect(formatCompactNumber(1e12)).toBe('1T')
      expect(formatFileSize(1e15)).toContain('PB')
    })

    it('should handle extreme dates', () => {
      const farFuture = new Date('2100-01-01')
      const farPast = new Date('1900-01-01')
      
      expect(() => formatDate(farFuture)).not.toThrow()
      expect(() => formatDate(farPast)).not.toThrow()
    })

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('')
      expect(toTitleCase('')).toBe('')
      expect(slugify('')).toBe('')
      expect(getInitials('')).toBe('')
    })

    it('should handle unicode characters', () => {
      expect(capitalize('éllo wörld')).toBe('Éllo wörld')
      expect(slugify('Café & Résumé')).toBe('cafe-resume')
      expect(getInitials('José María')).toBe('JM')
    })
  })
})