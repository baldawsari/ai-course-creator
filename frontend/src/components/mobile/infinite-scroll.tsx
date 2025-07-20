'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InfiniteScrollProps<T> {
  items: T[]
  hasMore: boolean
  isLoading: boolean
  isError?: boolean
  onLoadMore: () => void
  onRetry?: () => void
  renderItem: (item: T, index: number) => React.ReactNode
  loadingThreshold?: number
  className?: string
  emptyState?: React.ReactNode
  errorMessage?: string
  loadingIndicator?: React.ReactNode
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export function InfiniteScroll<T extends { id: string | number }>({
  items,
  hasMore,
  isLoading,
  isError = false,
  onLoadMore,
  onRetry,
  renderItem,
  loadingThreshold = 200,
  className,
  emptyState,
  errorMessage = 'Failed to load more items',
  loadingIndicator,
  spacing = 'md'
}: InfiniteScrollProps<T>) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for auto-loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: `${loadingThreshold}px`,
      }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [loadingThreshold])

  // Auto-load when intersecting and not already loading
  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading && !isError) {
      onLoadMore()
    }
  }, [isIntersecting, hasMore, isLoading, isError, onLoadMore])

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry()
    } else {
      onLoadMore()
    }
  }, [onRetry, onLoadMore])

  const getSpacingClass = () => {
    switch (spacing) {
      case 'none': return 'space-y-0'
      case 'sm': return 'space-y-2'
      case 'md': return 'space-y-4'
      case 'lg': return 'space-y-6'
      default: return 'space-y-4'
    }
  }

  // Show empty state if no items and not loading
  if (items.length === 0 && !isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        {emptyState || (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-lg">No items found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {/* Items list */}
      <div className={getSpacingClass()}>
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                delay: Math.min(index * 0.05, 0.3)
              }}
              layout
            >
              {renderItem(item, index)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading and error states */}
      <div 
        ref={loadMoreRef}
        className="flex items-center justify-center py-8"
      >
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-muted-foreground"
          >
            {loadingIndicator || (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </>
            )}
          </motion.div>
        )}

        {isError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-3"
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{errorMessage}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </motion.div>
        )}

        {!hasMore && !isLoading && !isError && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              You've reached the end
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Hook for infinite scroll data management
export function useInfiniteScroll<T>({
  fetchData,
  pageSize = 20,
  initialData = [],
}: {
  fetchData: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>
  pageSize?: number
  initialData?: T[]
}) {
  const [items, setItems] = useState<T[]>(initialData)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setIsError(false)

    try {
      const result = await fetchData(page, pageSize)
      
      setItems(prev => page === 0 ? result.data : [...prev, ...result.data])
      setHasMore(result.hasMore)
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Failed to load more items:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, page, pageSize, isLoading, hasMore])

  const retry = useCallback(() => {
    setIsError(false)
    loadMore()
  }, [loadMore])

  const reset = useCallback(() => {
    setItems([])
    setPage(0)
    setHasMore(true)
    setIsError(false)
    setIsLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    setPage(0)
    setHasMore(true)
    setIsError(false)
    
    try {
      setIsLoading(true)
      const result = await fetchData(0, pageSize)
      setItems(result.data)
      setHasMore(result.hasMore)
      setPage(1)
    } catch (error) {
      console.error('Failed to refresh items:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, pageSize])

  return {
    items,
    hasMore,
    isLoading,
    isError,
    loadMore,
    retry,
    reset,
    refresh,
  }
}

export default InfiniteScroll