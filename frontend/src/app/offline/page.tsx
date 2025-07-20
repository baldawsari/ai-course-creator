'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  WifiOff, 
  RefreshCw, 
  BookOpen, 
  Download, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { offlineManager } from '@/lib/pwa/offline-manager'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSync, setLastSync] = useState<number>(0)
  const [cachedCourses, setCachedCourses] = useState<any[]>([])
  const [cachedDocuments, setCachedDocuments] = useState<any[]>([])
  const [pendingActions, setPendingActions] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Load offline data
    loadOfflineData()
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadOfflineData = async () => {
    try {
      const [courses, documents, lastSyncTime] = await Promise.all([
        offlineManager.getCachedData('courses'),
        offlineManager.getCachedData('documents'),
        offlineManager.getLastSync()
      ])
      
      setCachedCourses(courses)
      setCachedDocuments(documents)
      setLastSync(lastSyncTime)
      
      // Get pending actions count (you'd need to implement this in offline manager)
      // setPendingActions(await offlineManager.getPendingActionsCount())
    } catch (error) {
      console.error('Failed to load offline data:', error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      if (isOnline) {
        // Try to sync with server
        await offlineManager.syncPendingActions()
        window.location.reload()
      } else {
        // Just refresh local data
        await loadOfflineData()
      }
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatLastSync = () => {
    if (!lastSync) return 'Never'
    
    const now = Date.now()
    const diff = now - lastSync
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className={cn(
              "mx-auto w-20 h-20 rounded-full flex items-center justify-center",
              isOnline 
                ? "bg-green-100 text-green-600 dark:bg-green-900/20" 
                : "bg-orange-100 text-orange-600 dark:bg-orange-900/20"
            )}
          >
            {isOnline ? (
              <CheckCircle className="w-10 h-10" />
            ) : (
              <WifiOff className="w-10 h-10" />
            )}
          </motion.div>
          
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {isOnline ? 'Back Online!' : 'You\'re Offline'}
            </h1>
            <p className="text-muted-foreground">
              {isOnline 
                ? 'Your connection has been restored. You can now sync your changes.'
                : 'Don\'t worry, you can still access your cached content and create new work offline.'
              }
            </p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Connection Status */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isOnline ? "bg-green-500" : "bg-orange-500"
              )} />
              <div>
                <h3 className="font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isOnline 
                    ? 'All features available' 
                    : 'Limited functionality'
                  }
                </p>
              </div>
            </div>
          </Card>

          {/* Last Sync */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Last Sync</h3>
                <p className="text-sm text-muted-foreground">
                  {formatLastSync()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Actions */}
        {pendingActions > 0 && (
          <Card className="p-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-900 dark:text-orange-100">
                  Pending Changes
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {pendingActions} action{pendingActions > 1 ? 's' : ''} waiting to sync when online
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Available Content */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Available Offline</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cached Courses */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Courses</h3>
              </div>
              <p className="text-2xl font-bold mb-1">{cachedCourses.length}</p>
              <p className="text-sm text-muted-foreground">
                {cachedCourses.length === 0 
                  ? 'No courses cached' 
                  : 'Available for offline viewing'
                }
              </p>
            </Card>

            {/* Cached Documents */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Documents</h3>
              </div>
              <p className="text-2xl font-bold mb-1">{cachedDocuments.length}</p>
              <p className="text-sm text-muted-foreground">
                {cachedDocuments.length === 0 
                  ? 'No documents cached' 
                  : 'Ready to use offline'
                }
              </p>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="lg"
            className="w-full"
          >
            {isRefreshing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {isOnline ? 'Sync Changes' : 'Refresh Data'}
          </Button>
          
          <div className="grid gap-3 md:grid-cols-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              size="lg"
            >
              View Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/courses'}
              size="lg"
            >
              Browse Courses
            </Button>
          </div>
        </div>

        {/* Tips */}
        <Card className="p-4 bg-muted/50">
          <h3 className="font-medium mb-2">Offline Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your changes are saved locally and will sync when online</li>
            <li>• You can still view and edit cached courses</li>
            <li>• New content creation has limited functionality</li>
            <li>• Enable notifications to know when you're back online</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}