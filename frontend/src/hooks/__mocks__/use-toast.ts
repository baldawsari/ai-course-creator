// Mock implementation of use-toast hook and toast function for testing
export const toast = jest.fn()

export function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: jest.fn(),
  }
}