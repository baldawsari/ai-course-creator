'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ImageIcon, AlertCircle } from 'lucide-react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  fallback?: string
  placeholder?: React.ReactNode
  onLoad?: () => void
  onError?: (error: Event) => void
  quality?: number
  priority?: boolean
  sizes?: string
  fill?: boolean
  aspectRatio?: number
  blurDataURL?: string
}

export function LazyImage({
  src,
  alt,
  className,
  fallback,
  placeholder,
  onLoad,
  onError,
  quality = 75,
  priority = false,
  sizes,
  fill = false,
  aspectRatio,
  blurDataURL,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [priority, isInView])

  const handleLoad = () => {
    setIsLoaded(true)
    if (onLoad) onLoad()
  }

  const handleError = (event: Event) => {
    setIsError(true)
    if (onError) onError(event)
  }

  // Generate optimized image URL
  const getOptimizedSrc = (originalSrc: string, width?: number) => {
    // If it's a Next.js optimized image or external URL, return as-is
    if (originalSrc.startsWith('/_next/') || originalSrc.startsWith('http')) {
      return originalSrc
    }

    // For local images, we could add optimization parameters
    const params = new URLSearchParams()
    if (quality) params.set('q', quality.toString())
    if (width) params.set('w', width.toString())
    
    const queryString = params.toString()
    return queryString ? `${originalSrc}?${queryString}` : originalSrc
  }

  // Generate srcSet for responsive images
  const generateSrcSet = (baseSrc: string) => {
    const widths = [320, 640, 960, 1280, 1920]
    return widths
      .map(width => `${getOptimizedSrc(baseSrc, width)} ${width}w`)
      .join(', ')
  }

  const containerStyle = fill ? {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
  } : aspectRatio ? {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: aspectRatio.toString(),
  } : undefined

  const imageStyle = fill ? {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  } : undefined

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden bg-muted",
        fill && "relative",
        className
      )}
      style={containerStyle}
    >
      {/* Placeholder while loading */}
      {!isLoaded && !isError && (
        <div 
          className={cn(
            "flex items-center justify-center",
            fill ? "absolute inset-0" : "w-full h-full"
          )}
        >
          {placeholder || (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div 
          className={cn(
            "flex items-center justify-center bg-muted",
            fill ? "absolute inset-0" : "w-full h-full"
          )}
        >
          {fallback ? (
            <img
              src={fallback}
              alt={alt}
              className="w-full h-full object-cover"
              style={imageStyle}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm">Failed to load</span>
            </div>
          )}
        </div>
      )}

      {/* Actual image */}
      {isInView && !isError && (
        <motion.img
          ref={imgRef}
          src={getOptimizedSrc(src)}
          srcSet={generateSrcSet(src)}
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "transition-opacity duration-300",
            fill && "absolute inset-0 w-full h-full object-cover"
          )}
          style={imageStyle}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          placeholder={blurDataURL ? 'blur' : 'empty'}
        />
      )}

      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <div
          className={cn(
            "absolute inset-0 bg-cover bg-center filter blur-sm scale-110",
            fill ? "absolute inset-0" : "w-full h-full"
          )}
          style={{
            backgroundImage: `url(${blurDataURL})`,
          }}
        />
      )}
    </div>
  )
}

// Preset image components for common use cases
export function LazyAvatar({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<LazyImageProps, 'aspectRatio'> & { size?: number }) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn(
        "rounded-full",
        className
      )}
      style={{
        width: size,
        height: size,
      }}
      aspectRatio={1}
      {...props}
    />
  )
}

export function LazyCardImage({
  className,
  ...props
}: LazyImageProps) {
  return (
    <LazyImage
      className={cn(
        "w-full rounded-lg",
        className
      )}
      aspectRatio={16 / 9}
      {...props}
    />
  )
}

export function LazyHeroImage({
  className,
  ...props
}: LazyImageProps) {
  return (
    <LazyImage
      className={cn(
        "w-full",
        className
      )}
      aspectRatio={21 / 9}
      priority
      {...props}
    />
  )
}

export default LazyImage