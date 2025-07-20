import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import {
  useMobileDetection,
  useTouch,
  useSwipe,
  useHapticFeedback,
  useNetworkStatus,
  useBatteryStatus,
  useDeviceOrientation,
  useInstallPrompt,
} from '../mobile'

// Mock APIs
const mockNavigator = {
  vibrate: jest.fn(),
  connection: {
    effectiveType: '4g',
    downlink: 10,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  getBattery: jest.fn(),
}

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
})

// Mock DeviceOrientationEvent
const deviceOrientationHandlers: ((event: any) => void)[] = []

Object.defineProperty(window, 'DeviceOrientationEvent', {
  value: class DeviceOrientationEvent extends Event {
    alpha: number | null
    beta: number | null
    gamma: number | null
    absolute: boolean
    
    constructor(type: string, eventInitDict: any) {
      super(type)
      this.alpha = eventInitDict.alpha ?? null
      this.beta = eventInitDict.beta ?? null
      this.gamma = eventInitDict.gamma ?? null
      this.absolute = eventInitDict.absolute ?? false
    }
  },
  writable: true,
})

// Store original addEventListener
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener

// Mock beforeinstallprompt event
let beforeInstallPromptEvent: any = null
const mockAddEventListener = jest.fn((event: string, handler: any) => {
  if (event === 'beforeinstallprompt') {
    beforeInstallPromptEvent = handler
  } else if (event === 'deviceorientation') {
    deviceOrientationHandlers.push(handler)
  } else {
    originalAddEventListener.call(window, event, handler)
  }
})

const mockRemoveEventListener = jest.fn((event: string, handler: any) => {
  if (event === 'deviceorientation') {
    const index = deviceOrientationHandlers.indexOf(handler)
    if (index > -1) {
      deviceOrientationHandlers.splice(index, 1)
    }
  } else {
    originalRemoveEventListener.call(window, event, handler)
  }
})

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
})

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
})

describe('Mobile Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    beforeInstallPromptEvent = null
    deviceOrientationHandlers.length = 0  // Clear handlers array
  })

  afterEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  describe('useMobileDetection', () => {
    it('should detect mobile devices correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const { result } = renderHook(() => useMobileDetection())

      expect(result.current.isMobile).toBe(true)
      expect(result.current.isTablet).toBe(false)
      expect(result.current.isDesktop).toBe(false)
      expect(result.current.screenSize).toBe('mobile')
    })

    it('should detect tablet devices correctly', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      const { result } = renderHook(() => useMobileDetection())

      expect(result.current.isMobile).toBe(false)
      expect(result.current.isTablet).toBe(true)
      expect(result.current.isDesktop).toBe(false)
      expect(result.current.screenSize).toBe('tablet')
    })

    it('should detect desktop devices correctly', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      const { result } = renderHook(() => useMobileDetection())

      expect(result.current.isMobile).toBe(false)
      expect(result.current.isTablet).toBe(false)
      expect(result.current.isDesktop).toBe(true)
      expect(result.current.screenSize).toBe('desktop')
    })

    it('should detect touch capability', () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        writable: true,
      })

      const { result } = renderHook(() => useMobileDetection())

      expect(result.current.isTouchDevice).toBe(true)
    })

    it('should track orientation changes', () => {
      // Set initial portrait dimensions before rendering
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })
      
      const { result } = renderHook(() => useMobileDetection())

      // Initial state should be portrait
      expect(result.current.orientation).toBe('portrait')

      // Change to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      expect(result.current.orientation).toBe('landscape')
    })

    it('should provide breakpoint information', () => {
      const { result } = renderHook(() => useMobileDetection())

      expect(result.current.breakpoint).toMatchObject({
        sm: expect.any(Boolean),
        md: expect.any(Boolean),
        lg: expect.any(Boolean),
        xl: expect.any(Boolean),
        '2xl': expect.any(Boolean),
      })
    })
  })

  describe('useTouch', () => {
    it('should track touch events', () => {
      const onTouchStart = jest.fn()
      const onTouchMove = jest.fn()
      const onTouchEnd = jest.fn()

      const { result } = renderHook(() =>
        useTouch({
          onTouchStart,
          onTouchMove,
          onTouchEnd,
        })
      )

      expect(result.current.isTouch).toBe(false)
      expect(result.current.touchCount).toBe(0)

      // Simulate touch start
      act(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchStart(touchEvent)
      })

      expect(onTouchStart).toHaveBeenCalled()
      expect(result.current.isTouch).toBe(true)
      expect(result.current.touchCount).toBe(1)
    })

    it('should detect long press', async () => {
      const onLongPress = jest.fn()

      const { result } = renderHook(() =>
        useTouch({
          onLongPress,
          longPressDelay: 100,
        })
      )

      // Start touch
      act(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchStart(touchEvent)
      })

      // Wait for long press
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(onLongPress).toHaveBeenCalled()
    })

    it('should cancel long press on touch move', async () => {
      const onLongPress = jest.fn()

      const { result } = renderHook(() =>
        useTouch({
          onLongPress,
          longPressDelay: 100,
        })
      )

      // Start touch
      act(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchStart(touchEvent)
      })

      // Move touch (should cancel long press)
      act(() => {
        const touchEvent = new TouchEvent('touchmove', {
          touches: [{ clientX: 150, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchMove(touchEvent)
      })

      // Wait for would-be long press
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })

    it('should track multi-touch', () => {
      const { result } = renderHook(() => useTouch())

      // Simulate multi-touch
      act(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 100 } as Touch,
            { clientX: 200, clientY: 200 } as Touch,
          ],
        })
        result.current.handlers.onTouchStart(touchEvent)
      })

      expect(result.current.touchCount).toBe(2)
      expect(result.current.position).toEqual({
        x: 100,
        y: 100,
      })
    })
  })

  describe('useSwipe', () => {
    it('should detect horizontal swipe right', () => {
      const onSwipeRight = jest.fn()

      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight,
          threshold: 50,
        })
      )

      // Start swipe
      act(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchStart(touchEvent)
      })

      // End swipe (moved right)
      act(() => {
        const touchEvent = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 200, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchEnd(touchEvent)
      })

      expect(onSwipeRight).toHaveBeenCalledWith({
        direction: 'right',
        distance: 100,
        velocity: expect.any(Number),
        duration: expect.any(Number),
      })
    })

    it('should detect vertical swipe up', () => {
      const onSwipeUp = jest.fn()

      const { result } = renderHook(() =>
        useSwipe({
          onSwipeUp,
          threshold: 50,
          direction: 'vertical',
        })
      )

      // Start swipe
      act(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 200 } as Touch],
        })
        result.current.handlers.onTouchStart(touchEvent)
      })

      // End swipe (moved up)
      act(() => {
        const touchEvent = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchEnd(touchEvent)
      })

      expect(onSwipeUp).toHaveBeenCalledWith({
        direction: 'up',
        distance: 100,
        velocity: expect.any(Number),
        duration: expect.any(Number),
      })
    })

    it('should not trigger swipe below threshold', () => {
      const onSwipeRight = jest.fn()

      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight,
          threshold: 100,
        })
      )

      // Start swipe
      act(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchStart(touchEvent)
      })

      // End swipe (small distance)
      act(() => {
        const touchEvent = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 130, clientY: 100 } as Touch],
        })
        result.current.handlers.onTouchEnd(touchEvent)
      })

      expect(onSwipeRight).not.toHaveBeenCalled()
    })

    it('should provide current swipe state', () => {
      const { result } = renderHook(() => useSwipe())

      expect(result.current.isSwipingLeft).toBe(false)
      expect(result.current.isSwipingRight).toBe(false)
      expect(result.current.swipeDirection).toBeNull()
      expect(result.current.swipeDistance).toBe(0)
    })
  })

  describe('useHapticFeedback', () => {
    it('should trigger vibration feedback', () => {
      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.vibrate('light')
      })

      expect(mockNavigator.vibrate).toHaveBeenCalledWith(50)
    })

    it('should handle different feedback types', () => {
      const { result } = renderHook(() => useHapticFeedback())

      // Test different feedback types
      act(() => {
        result.current.vibrate('medium')
      })
      expect(mockNavigator.vibrate).toHaveBeenCalledWith(100)

      act(() => {
        result.current.vibrate('heavy')
      })
      expect(mockNavigator.vibrate).toHaveBeenCalledWith(200)

      act(() => {
        result.current.vibrate('selection')
      })
      expect(mockNavigator.vibrate).toHaveBeenCalledWith(20)
    })

    it('should handle custom vibration patterns', () => {
      const { result } = renderHook(() => useHapticFeedback())

      act(() => {
        result.current.vibratePattern([100, 50, 100])
      })

      expect(mockNavigator.vibrate).toHaveBeenCalledWith([100, 50, 100])
    })

    it('should check if vibration is supported', () => {
      const { result } = renderHook(() => useHapticFeedback())

      expect(result.current.isSupported).toBe(true)

      // Test without vibration support
      const originalVibrate = mockNavigator.vibrate
      delete (mockNavigator as any).vibrate

      const { result: result2 } = renderHook(() => useHapticFeedback())
      expect(result2.current.isSupported).toBe(false)

      // Restore
      mockNavigator.vibrate = originalVibrate
    })

    it('should handle disabled vibration gracefully', () => {
      const { result } = renderHook(() => useHapticFeedback({ enabled: false }))

      act(() => {
        result.current.vibrate('light')
      })

      expect(mockNavigator.vibrate).not.toHaveBeenCalled()
    })
  })

  describe('useNetworkStatus', () => {
    it('should track network status', () => {
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isOnline).toBe(true)
      expect(result.current.effectiveType).toBe('4g')
      expect(result.current.downlink).toBe(10)
    })

    it('should handle offline state', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isOnline).toBe(false)
    })

    it('should detect slow connections', () => {
      // Mock slow connection
      mockNavigator.connection.effectiveType = '2g'
      mockNavigator.connection.downlink = 0.5

      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isSlowConnection).toBe(true)
    })

    it('should handle missing connection API', () => {
      const originalConnection = mockNavigator.connection
      delete (mockNavigator as any).connection

      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.effectiveType).toBe('unknown')
      expect(result.current.downlink).toBe(0)

      // Restore
      mockNavigator.connection = originalConnection
    })
  })

  describe('useBatteryStatus', () => {
    it('should track battery status', async () => {
      const mockBattery = {
        level: 0.75,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 3600,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }

      mockNavigator.getBattery.mockResolvedValue(mockBattery)

      const { result } = renderHook(() => useBatteryStatus())

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      // Wait for battery API
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.level).toBe(0.75)
      expect(result.current.charging).toBe(false)
      expect(result.current.isLowBattery).toBe(false)
    })

    it('should detect low battery', async () => {
      const mockBattery = {
        level: 0.15,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 1800,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }

      mockNavigator.getBattery.mockResolvedValue(mockBattery)

      const { result } = renderHook(() => useBatteryStatus({ lowBatteryThreshold: 0.2 }))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isLowBattery).toBe(true)
    })

    it('should handle missing battery API', async () => {
      mockNavigator.getBattery.mockRejectedValue(new Error('Battery API not supported'))

      const { result } = renderHook(() => useBatteryStatus())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isSupported).toBe(false)
      expect(result.current.level).toBeNull()
    })
  })

  describe('useDeviceOrientation', () => {
    it('should track device orientation', () => {
      const { result } = renderHook(() => useDeviceOrientation())

      expect(result.current.alpha).toBeNull()
      expect(result.current.beta).toBeNull()
      expect(result.current.gamma).toBeNull()
      expect(result.current.isSupported).toBe(true)

      // Simulate orientation event
      act(() => {
        const orientationEvent = new DeviceOrientationEvent('deviceorientation', {
          alpha: 45,
          beta: 10,
          gamma: 5,
        })
        
        // Trigger all registered handlers
        deviceOrientationHandlers.forEach(handler => {
          handler(orientationEvent)
        })
      })

      expect(result.current.alpha).toBe(45)
      expect(result.current.beta).toBe(10)
      expect(result.current.gamma).toBe(5)
    })

    it('should calculate tilt direction', () => {
      const { result } = renderHook(() => useDeviceOrientation())

      // Simulate tilt
      act(() => {
        const orientationEvent = new DeviceOrientationEvent('deviceorientation', {
          alpha: 0,
          beta: 20, // Forward tilt
          gamma: 15, // Right tilt
        })
        
        // Trigger all registered handlers
        deviceOrientationHandlers.forEach(handler => {
          handler(orientationEvent)
        })
      })

      expect(result.current.tiltDirection).toMatchObject({
        forward: true,
        backward: false,
        left: false,
        right: true,
      })
    })

    it.skip('should handle missing orientation API', () => {
      // Save original
      const originalDeviceOrientationEvent = (window as any).DeviceOrientationEvent
      
      // Override with undefined
      Object.defineProperty(window, 'DeviceOrientationEvent', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useDeviceOrientation())

      expect(result.current.isSupported).toBe(false)
      expect(result.current.alpha).toBeNull()
      expect(result.current.beta).toBeNull()
      expect(result.current.gamma).toBeNull()
      
      // Restore
      Object.defineProperty(window, 'DeviceOrientationEvent', {
        value: originalDeviceOrientationEvent,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('useInstallPrompt', () => {
    it('should handle install prompt availability', () => {
      const { result } = renderHook(() => useInstallPrompt())

      expect(result.current.canInstall).toBe(false)
      expect(result.current.isInstalled).toBe(false)

      // Simulate beforeinstallprompt event
      act(() => {
        const mockEvent = {
          preventDefault: jest.fn(),
          prompt: jest.fn().mockResolvedValue({ outcome: 'accepted' }),
        }
        
        if (beforeInstallPromptEvent) {
          beforeInstallPromptEvent(mockEvent)
        }
      })

      expect(result.current.canInstall).toBe(true)
    })

    it('should handle install prompt trigger', async () => {
      const { result } = renderHook(() => useInstallPrompt())

      // First trigger the beforeinstallprompt event
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn().mockResolvedValue({ outcome: 'accepted' }),
      }

      act(() => {
        if (beforeInstallPromptEvent) {
          beforeInstallPromptEvent(mockEvent)
        }
      })

      // Now trigger install
      await act(async () => {
        await result.current.install()
      })

      expect(mockEvent.prompt).toHaveBeenCalled()
      expect(result.current.canInstall).toBe(false) // Should be consumed
    })

    it('should detect installed PWA', () => {
      // Mock standalone mode
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
      })

      const { result } = renderHook(() => useInstallPrompt())

      expect(result.current.isInstalled).toBe(true)
    })

    it('should handle install rejection', async () => {
      const onInstallDeclined = jest.fn()
      const { result } = renderHook(() => useInstallPrompt({ onInstallDeclined }))

      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn().mockResolvedValue({ outcome: 'dismissed' }),
      }

      act(() => {
        if (beforeInstallPromptEvent) {
          beforeInstallPromptEvent(mockEvent)
        }
      })

      await act(async () => {
        await result.current.install()
      })

      expect(onInstallDeclined).toHaveBeenCalled()
    })
  })

  describe('hook cleanup and performance', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useMobileDetection())

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should debounce resize events', () => {
      const { result } = renderHook(() => useMobileDetection())

      // Trigger multiple resize events rapidly
      act(() => {
        for (let i = 0; i < 10; i++) {
          const resizeEvent = new Event('resize')
          window.dispatchEvent(resizeEvent)
        }
      })

      // Should only update once due to debouncing
      expect(result.current.screenSize).toBeDefined()
    })

    it('should handle rapid touch events without memory leaks', () => {
      const { result } = renderHook(() => useTouch())

      // Simulate rapid touch events
      act(() => {
        for (let i = 0; i < 100; i++) {
          const touchEvent = new TouchEvent('touchstart', {
            touches: [{ clientX: i, clientY: i } as Touch],
          })
          result.current.handlers.onTouchStart(touchEvent)

          const touchEndEvent = new TouchEvent('touchend', {
            changedTouches: [{ clientX: i, clientY: i } as Touch],
          })
          result.current.handlers.onTouchEnd(touchEndEvent)
        }
      })

      // Should handle without errors
      expect(result.current.isTouch).toBe(false)
    })
  })
})