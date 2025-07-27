import { jest } from '@jest/globals'

export const toast = jest.fn()

export const useToast = jest.fn(() => ({
  toast,
  toasts: [],
  dismiss: jest.fn(),
}))