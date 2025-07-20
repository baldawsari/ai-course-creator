'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Device detection hook
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({ width, height })
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsDesktop(width >= 1024)
      setOrientation(height > width ? 'portrait' : 'landscape')
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  const breakpoint = {
    sm: screenSize.width >= 640,
    md: screenSize.width >= 768,
    lg: screenSize.width >= 1024,
    xl: screenSize.width >= 1280,
    '2xl': screenSize.width >= 1536,
  }

  const screenSizeCategory = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

  return {
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    screenSize: screenSizeCategory,
    breakpoint,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }
}

// Touch gestures hook
interface TouchOptions {
  onTouchStart?: (e: TouchEvent) => void
  onTouchMove?: (e: TouchEvent) => void
  onTouchEnd?: (e: TouchEvent) => void
  onLongPress?: () => void
  longPressDelay?: number
}

export function useTouch(options: TouchOptions = {}) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const [touchCount, setTouchCount] = useState(0)
  const longPressTimer = useRef<NodeJS.Timeout>()

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setTouchEnd(null)
    setIsTouch(true)
    setTouchCount(e.touches.length)
    
    if (options.onTouchStart) {
      options.onTouchStart(e)
    }
    
    if (options.onLongPress && options.longPressDelay) {
      longPressTimer.current = setTimeout(() => {
        options.onLongPress!()
      }, options.longPressDelay)
    }
  }, [options])

  const onTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
    
    // Cancel long press on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    
    if (options.onTouchMove) {
      options.onTouchMove(e)
    }
  }, [options])

  const onTouchEnd = useCallback((e: TouchEvent) => {
    setIsTouch(false)
    setTouchCount(0)
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    
    if (options.onTouchEnd) {
      options.onTouchEnd(e)
    }
  }, [options])

  return {
    isTouch,
    touchCount,
    position: touchStart,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}

// Swipe gestures hook
interface SwipeOptions {
  onSwipeUp?: (data: SwipeData) => void
  onSwipeDown?: (data: SwipeData) => void
  onSwipeLeft?: (data: SwipeData) => void
  onSwipeRight?: (data: SwipeData) => void
  threshold?: number
  direction?: 'horizontal' | 'vertical' | 'both'
}

interface SwipeData {
  direction: 'up' | 'down' | 'left' | 'right'
  distance: number
  velocity: number
  duration: number
}

export function useSwipe(options: SwipeOptions = {}) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null)
  const [isSwipingLeft, setIsSwipingLeft] = useState(false)
  const [isSwipingRight, setIsSwipingRight] = useState(false)
  const { threshold = 50, direction = 'both' } = options

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() })
    setTouchEnd(null)
    setSwipeDirection(null)
  }, [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
  }, [])

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart) return

    const touch = e.changedTouches[0]
    const endX = touch.clientX
    const endY = touch.clientY
    const deltaX = endX - touchStart.x
    const deltaY = endY - touchStart.y
    const duration = Date.now() - touchStart.time
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / duration

    let detectedDirection: string | null = null

    if (direction === 'horizontal' || direction === 'both') {
      if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        detectedDirection = deltaX > 0 ? 'right' : 'left'
      }
    }

    if (direction === 'vertical' || direction === 'both') {
      if (Math.abs(deltaY) > threshold && Math.abs(deltaY) > Math.abs(deltaX)) {
        detectedDirection = deltaY > 0 ? 'down' : 'up'
      }
    }

    if (detectedDirection) {
      const swipeData: SwipeData = {
        direction: detectedDirection as any,
        distance: Math.abs(detectedDirection === 'left' || detectedDirection === 'right' ? deltaX : deltaY),
        velocity,
        duration,
      }

      setSwipeDirection(detectedDirection)
      
      if (detectedDirection === 'up' && options.onSwipeUp) {
        options.onSwipeUp(swipeData)
      } else if (detectedDirection === 'down' && options.onSwipeDown) {
        options.onSwipeDown(swipeData)
      } else if (detectedDirection === 'left' && options.onSwipeLeft) {
        options.onSwipeLeft(swipeData)
      } else if (detectedDirection === 'right' && options.onSwipeRight) {
        options.onSwipeRight(swipeData)
      }
    }

    setIsSwipingLeft(false)
    setIsSwipingRight(false)
  }, [touchStart, threshold, direction, options])

  const swipeDistance = touchStart && touchEnd 
    ? Math.sqrt(
        Math.pow(touchEnd.x - touchStart.x, 2) + 
        Math.pow(touchEnd.y - touchStart.y, 2)
      )
    : 0

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    isSwipingLeft,
    isSwipingRight,
    swipeDirection,
    swipeDistance,
  }
}

// Haptic feedback hook
interface HapticOptions {
  enabled?: boolean
}

type HapticType = 'light' | 'medium' | 'heavy' | 'selection'

export function useHapticFeedback(options: HapticOptions = {}) {
  const { enabled = true } = options

  const vibrate = useCallback((type: HapticType | number = 'light') => {
    if (!enabled || !('vibrate' in navigator)) return

    const patterns = {
      light: 50,
      medium: 100,
      heavy: 200,
      selection: 20,
    }

    const pattern = typeof type === 'string' ? patterns[type] : type
    navigator.vibrate(pattern)
  }, [enabled])

  const vibratePattern = useCallback((pattern: number[]) => {
    if (!enabled || !('vibrate' in navigator)) return
    navigator.vibrate(pattern)
  }, [enabled])

  return {
    vibrate,
    vibratePattern,
    isSupported: 'vibrate' in navigator
  }
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine ?? true : true
  )
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [effectiveType, setEffectiveType] = useState<string>('unknown')
  const [downlink, setDownlink] = useState<number>(0)

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine ?? true)
    
    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        setConnectionType(connection.type || 'unknown')
        setEffectiveType(connection.effectiveType || 'unknown')
        setDownlink(connection.downlink || 0)
      }
    }

    updateOnlineStatus()
    updateConnectionInfo()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', updateConnectionInfo)
      
      return () => {
        window.removeEventListener('online', updateOnlineStatus)
        window.removeEventListener('offline', updateOnlineStatus)
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  return {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
    isFastConnection: effectiveType === '4g'
  }
}

// Battery status hook
interface BatteryStatusOptions {
  lowBatteryThreshold?: number
}

export function useBatteryStatus(options: BatteryStatusOptions = {}) {
  const { lowBatteryThreshold = 0.2 } = options
  const [level, setLevel] = useState<number | null>(null)
  const [charging, setCharging] = useState(false)
  const [chargingTime, setChargingTime] = useState(0)
  const [dischargingTime, setDischargingTime] = useState(Infinity)
  const [isLoading, setIsLoading] = useState(true)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery()
        .then((battery: any) => {
          const updateBatteryInfo = () => {
            setLevel(battery.level)
            setCharging(battery.charging)
            setChargingTime(battery.chargingTime)
            setDischargingTime(battery.dischargingTime)
            setIsLoading(false)
          }

          updateBatteryInfo()

          battery.addEventListener('chargingchange', updateBatteryInfo)
          battery.addEventListener('levelchange', updateBatteryInfo)

          return () => {
            battery.removeEventListener('chargingchange', updateBatteryInfo)
            battery.removeEventListener('levelchange', updateBatteryInfo)
          }
        })
        .catch(() => {
          setIsSupported(false)
          setIsLoading(false)
        })
    } else {
      setIsSupported(false)
      setIsLoading(false)
    }
  }, [])

  return {
    level,
    charging,
    chargingTime,
    dischargingTime,
    isLowBattery: level !== null && level < lowBatteryThreshold,
    isSupported,
    isLoading,
  }
}

// Device orientation hook
export function useDeviceOrientation() {
  const [alpha, setAlpha] = useState<number | null>(null)
  const [beta, setBeta] = useState<number | null>(null)
  const [gamma, setGamma] = useState<number | null>(null)
  const [absolute, setAbsolute] = useState(false)

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      setAlpha(event.alpha)
      setBeta(event.beta)
      setGamma(event.gamma)
      setAbsolute(event.absolute)
    }

    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation)
      
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }
  }, [])

  const tiltDirection = {
    forward: beta !== null && beta > 10,
    backward: beta !== null && beta < -10,
    left: gamma !== null && gamma < -10,
    right: gamma !== null && gamma > 10,
  }

  return {
    alpha,
    beta,
    gamma,
    absolute,
    tiltDirection,
    isSupported: 'DeviceOrientationEvent' in window
  }
}

// Scroll restoration hook for mobile
export function useScrollRestoration(key: string) {
  const scrollPositions = useRef<Map<string, number>>(new Map())

  const saveScrollPosition = useCallback(() => {
    scrollPositions.current.set(key, window.scrollY)
  }, [key])

  const restoreScrollPosition = useCallback(() => {
    const position = scrollPositions.current.get(key)
    if (position !== undefined) {
      window.scrollTo(0, position)
    }
  }, [key])

  useEffect(() => {
    // Save scroll position when component unmounts
    return saveScrollPosition
  }, [saveScrollPosition])

  return {
    saveScrollPosition,
    restoreScrollPosition
  }
}

// Safe area insets hook for devices with notches
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  useEffect(() => {
    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0')
      })
    }

    updateInsets()
    window.addEventListener('resize', updateInsets)

    return () => {
      window.removeEventListener('resize', updateInsets)
    }
  }, [])

  return insets
}

// Install prompt hook for PWA
interface InstallPromptOptions {
  onInstallAccepted?: () => void
  onInstallDeclined?: () => void
}

export function useInstallPrompt(options: InstallPromptOptions = {}) {
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const userChoice = await deferredPrompt.userChoice

    if (userChoice && userChoice.outcome === 'accepted') {
      options.onInstallAccepted?.()
    } else {
      options.onInstallDeclined?.()
    }

    setDeferredPrompt(null)
    setCanInstall(false)
  }, [deferredPrompt, options])

  const isInstalled = 
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches

  return {
    canInstall,
    isInstalled,
    install,
  }
}

export default {
  useMobileDetection,
  useTouch,
  useSwipe,
  useHapticFeedback,
  useNetworkStatus,
  useBatteryStatus,
  useDeviceOrientation,
  useScrollRestoration,
  useSafeAreaInsets,
  useInstallPrompt
}