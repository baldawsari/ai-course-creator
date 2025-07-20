'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  BookOpen, 
  Settings, 
  Download,
  Plus,
  Menu,
  Search,
  Bell,
  User
} from 'lucide-react'

interface MobileLayoutProps {
  children: React.ReactNode
  currentPath?: string
  onNavigate?: (path: string) => void
  showBottomNav?: boolean
  showTopBar?: boolean
}

const bottomNavItems = [
  { id: 'dashboard', icon: Home, label: 'Home', path: '/dashboard' },
  { id: 'courses', icon: BookOpen, label: 'Courses', path: '/courses' },
  { id: 'exports', icon: Download, label: 'Exports', path: '/exports' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
]

export function MobileLayout({
  children,
  currentPath = '/dashboard',
  onNavigate,
  showBottomNav = true,
  showTopBar = true
}: MobileLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    }
  }

  const activeNavItem = bottomNavItems.find(item => 
    currentPath.startsWith(item.path)
  )?.id || 'dashboard'

  if (!isMobile && showBottomNav) {
    // On desktop, render children with regular layout
    return <div className="min-h-screen bg-background">{children}</div>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Top Bar */}
      {showTopBar && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left side - Menu and brand */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => {/* Handle menu */}}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Course Creator
              </h1>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="p-2 relative"
                onClick={() => {/* Handle notifications */}}
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => {/* Handle profile */}}
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search Overlay */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-full left-0 right-0 bg-background border-b p-4 z-50"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search courses, content..."
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    onBlur={() => setIsSearchOpen(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto",
        showBottomNav && "pb-20", // Add bottom padding when bottom nav is shown
        showTopBar && "pt-0" // No top padding as header handles it
      )}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t z-50">
          <div className="flex items-center justify-around px-2 py-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNavItem === item.id
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-3 h-auto min-w-0 flex-1",
                    isActive && "text-primary"
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <div className="relative">
                    <Icon className={cn(
                      "h-5 w-5 transition-all",
                      isActive && "scale-110"
                    )} />
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-all",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </Button>
              )
            })}
          </div>
        </nav>
      )}

      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-24 right-4 z-40"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-secondary hover:shadow-xl transition-shadow"
          onClick={() => handleNavigation('/courses/new')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  )
}

export default MobileLayout