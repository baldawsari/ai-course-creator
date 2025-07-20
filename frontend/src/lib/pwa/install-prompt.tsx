'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallPromptProps {
  onInstall?: () => void
  onDismiss?: () => void
  className?: string
}

export function InstallPrompt({ onInstall, onDismiss, className }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [promptDismissed, setPromptDismissed] = useState(false)

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    setPromptDismissed(dismissed === 'true')

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after a delay if not dismissed
      if (!dismissed && !standalone) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setShowPrompt(false)
      setDeferredPrompt(null)
      if (onInstall) onInstall()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [onInstall])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      
      if (choice.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        if (onInstall) onInstall()
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Install prompt failed:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setPromptDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
    if (onDismiss) onDismiss()
  }

  // Don't show if already installed, dismissed, or no prompt available
  if (isStandalone || promptDismissed || (!deferredPrompt && !isIOS) || !showPrompt) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm",
          "md:bottom-6 md:left-6 md:right-auto md:max-w-md",
          className
        )}
      >
        <Card className="p-4 shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
              <Download className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                Install AI Course Creator
              </h3>
              
              {isIOS ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Install this app for a better experience. Tap the share button and select "Add to Home Screen".
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <span>Works on iPhone and iPad</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Get quick access, offline support, and a native app experience.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                    <span>Works offline • Fast loading</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                {!isIOS && (
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="text-xs px-3 py-1.5 h-auto"
                  >
                    Install App
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="text-xs px-3 py-1.5 h-auto"
                >
                  {isIOS ? 'Got it' : 'Not now'}
                </Button>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for programmatic install prompt
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      
      setDeferredPrompt(null)
      setCanInstall(false)
      
      return choice.outcome === 'accepted'
    } catch (error) {
      console.error('Install failed:', error)
      return false
    }
  }

  return { canInstall, install }
}

export default InstallPrompt