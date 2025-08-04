/**
 * Notification Center Component
 * Real-time notifications with toast, bell icon, and desktop notifications
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeNotifications } from '@/lib/collaboration/hooks'
import { RealtimeNotification } from '@/lib/websocket/client'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  X, 
  Settings, 
  Volume2, 
  VolumeX,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Filter
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Notification type icons
const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle
}

// Notification type colors
const notificationColors = {
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  success: 'text-green-500 bg-green-50 dark:bg-green-950',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  error: 'text-red-500 bg-red-50 dark:bg-red-950'
}

interface NotificationItemProps {
  notification: RealtimeNotification & { read?: boolean }
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onAction?: (url: string) => void
}

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  onAction 
}: NotificationItemProps) {
  const Icon = notificationIcons[notification.type]
  
  const handleAction = () => {
    if (notification.actionUrl && onAction) {
      onAction(notification.actionUrl)
    }
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "group relative p-3 rounded-lg border transition-colors cursor-pointer",
        notification.read 
          ? "bg-muted/50 border-muted" 
          : "bg-background border-border hover:bg-muted/30",
        notificationColors[notification.type]
      )}
      onClick={handleAction}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          !notification.read && "ring-2 ring-primary/20"
        )}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-medium text-sm",
              notification.read ? "text-muted-foreground" : "text-foreground"
            )}>
              {notification.title}
            </h4>
            
            <div className="flex items-center gap-1">
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
              
              {/* Action buttons */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {!notification.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkAsRead(notification.id)
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(notification.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <p className={cn(
            "text-xs mt-1",
            notification.read ? "text-muted-foreground/70" : "text-muted-foreground"
          )}>
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.timestamp)}
            </span>
            
            {notification.actionUrl && (
              <Badge variant="outline" className="text-xs">
                Click to view
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface NotificationSettingsProps {
  soundEnabled: boolean
  onSoundToggle: () => void
  desktopEnabled: boolean
  onDesktopToggle: () => void
  onRequestPermission: () => void
}

function NotificationSettings({
  soundEnabled,
  onSoundToggle,
  desktopEnabled,
  onDesktopToggle,
  onRequestPermission
}: NotificationSettingsProps) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-medium mb-3">Notification Settings</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-sm">Sound notifications</span>
            </div>
            <Button
              size="sm"
              variant={soundEnabled ? "default" : "outline"}
              onClick={onSoundToggle}
            >
              {soundEnabled ? "On" : "Off"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm">Desktop notifications</span>
            </div>
            {Notification.permission === 'granted' ? (
              <Button
                size="sm"
                variant={desktopEnabled ? "default" : "outline"}
                onClick={onDesktopToggle}
              >
                {desktopEnabled ? "On" : "Off"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={onRequestPermission}
              >
                Enable
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface NotificationCenterProps {
  className?: string
  maxNotifications?: number
}

export function NotificationCenter({ 
  className,
  maxNotifications = 50 
}: NotificationCenterProps) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    requestNotificationPermission 
  } = useRealtimeNotifications()
  
  const [isOpen, setIsOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [desktopEnabled, setDesktopEnabled] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'info' | 'success' | 'warning' | 'error'>('all')
  
  // Load settings from localStorage
  useEffect(() => {
    const savedSoundEnabled = localStorage.getItem('notifications_sound_enabled')
    const savedDesktopEnabled = localStorage.getItem('notifications_desktop_enabled')
    
    if (savedSoundEnabled !== null) {
      setSoundEnabled(savedSoundEnabled === 'true')
    }
    if (savedDesktopEnabled !== null) {
      setDesktopEnabled(savedDesktopEnabled === 'true')
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('notifications_sound_enabled', soundEnabled.toString())
  }, [soundEnabled])

  useEffect(() => {
    localStorage.setItem('notifications_desktop_enabled', desktopEnabled.toString())
  }, [desktopEnabled])

  // Filter notifications
  const filteredNotifications = notifications
    .slice(0, maxNotifications)
    .filter(notification => {
      switch (filter) {
        case 'unread':
          return !notification.read
        case 'info':
        case 'success':
        case 'warning':
        case 'error':
          return notification.type === filter
        default:
          return true
      }
    })

  const handleMarkAsRead = useCallback((notificationId?: string) => {
    markAsRead(notificationId)
  }, [markAsRead])

  const handleDeleteNotification = useCallback((notificationId: string) => {
    // This would need to be implemented in the notification system
    console.log('Delete notification:', notificationId)
  }, [])

  const handleNotificationAction = useCallback((url: string) => {
    window.location.href = url
    setIsOpen(false)
  }, [])

  const handleMarkAllAsRead = useCallback(() => {
    markAsRead()
  }, [markAsRead])

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      setDesktopEnabled(true)
      toast({
        title: "Desktop notifications enabled",
        description: "You'll now receive desktop notifications for important updates."
      })
    }
  }, [requestNotificationPermission])

  // Show new notification toast
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0]
      if (!latestNotification.read && !isOpen) {
        toast({
          title: latestNotification.title,
          description: latestNotification.message,
          variant: latestNotification.type === 'error' ? 'destructive' : 'default'
        })
      }
    }
  }, [notifications, isOpen])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative", className)}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-xs font-medium min-w-5 h-5 flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0"
        sideOffset={5}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {/* Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Filter className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    All notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('unread')}>
                    Unread only
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilter('info')}>
                    Info
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('success')}>
                    Success
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('warning')}>
                    Warning
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('error')}>
                    Error
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Settings className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <NotificationSettings
                    soundEnabled={soundEnabled}
                    onSoundToggle={() => setSoundEnabled(!soundEnabled)}
                    desktopEnabled={desktopEnabled}
                    onDesktopToggle={() => setDesktopEnabled(!desktopEnabled)}
                    onRequestPermission={handleRequestPermission}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMarkAllAsRead}
                className="text-xs h-6"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            </div>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-96">
          <div className="p-2">
            {filteredNotifications.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      onAction={handleNotificationAction}
                    />
                  ))}
                </div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs">You're all caught up!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {filteredNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  // Navigate to full notifications page
                  setIsOpen(false)
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Toast notification component for immediate feedback
export function useCollaborationToast() {
  const { notifications } = useRealtimeNotifications()

  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0]
      
      // Show toast for important notifications
      if (latestNotification.persistent || latestNotification.type === 'error') {
        toast({
          title: latestNotification.title,
          description: latestNotification.message,
          variant: latestNotification.type === 'error' ? 'destructive' : 'default'
        })
      }
    }
  }, [notifications])
}

export default NotificationCenter