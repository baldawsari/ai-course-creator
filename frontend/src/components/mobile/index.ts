// Mobile components barrel export

// Layout components
export { MobileLayout } from './mobile-layout'

// Interactive components
export { MobileCard } from './mobile-card'
export { TouchButton, TouchFAB, TouchIconButton, TouchListItem } from './touch-button'
export { SwipeGesture } from './swipe-gesture'
export { PullToRefresh } from './pull-to-refresh'

// Performance components
export { LazyImage, LazyAvatar, LazyCardImage, LazyHeroImage } from './lazy-image'
export { InfiniteScroll, useInfiniteScroll } from './infinite-scroll'
export { PerformanceMonitor } from './performance-monitor'

// Types
export type {
  // Touch Button types
  TouchButtonProps,
  
  // Mobile Card types
  MobileCardProps,
  
  // Swipe Gesture types
  SwipeGestureProps,
  
  // Pull to Refresh types
  PullToRefreshProps,
  
  // Lazy Image types
  LazyImageProps,
  
  // Infinite Scroll types
  InfiniteScrollProps,
  
  // Performance Monitor types
  PerformanceMonitorProps,
} from './types'

// Mobile utilities
export { isMobile, isTouchDevice, getDeviceInfo } from '../lib/utils/device'
export { useMobileDetection, useTouch, useSwipe } from '../hooks/mobile'

// Export default
export default {
  MobileLayout,
  MobileCard,
  TouchButton,
  TouchFAB,
  TouchIconButton,
  TouchListItem,
  SwipeGesture,
  PullToRefresh,
  LazyImage,
  LazyAvatar,
  LazyCardImage,
  LazyHeroImage,
  InfiniteScroll,
  PerformanceMonitor,
}