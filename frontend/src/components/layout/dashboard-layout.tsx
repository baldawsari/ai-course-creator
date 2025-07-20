'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AppHeader } from './app-header'
import { NavigationSidebar } from './navigation-sidebar'
import { Button } from '@/components/ui/button'
import { Menu, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      // Escape to close search
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 dark:from-slate-900 dark:to-violet-900/20">
      {/* Command Palette Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50 px-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-violet-200 dark:border-violet-700/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-200 dark:border-violet-700/50">
                  <Search className="w-5 h-5 text-violet-400" />
                  <input
                    type="text"
                    placeholder="Search courses, documents, or navigate..."
                    className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-500 outline-none"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchOpen(false)}
                    className="text-violet-400 hover:text-violet-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4 text-center text-violet-500 dark:text-violet-400">
                  Start typing to search...
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <NavigationSidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Header */}
        <AppHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSearch={() => setSearchOpen(true)}
          breadcrumbs={breadcrumbs}
        />

        {/* Page Content */}
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 z-30">
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs">Menu</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Search className="w-5 h-5" />
            <span className="text-xs">Search</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

interface Breadcrumb {
  label: string
  href?: string
}

function generateBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: Breadcrumb[] = []

  // Always start with Dashboard
  breadcrumbs.push({ label: 'Dashboard', href: '/dashboard' })

  // Add additional segments based on path
  segments.forEach((segment, index) => {
    if (segment === 'dashboard') return

    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    const href = '/' + segments.slice(0, index + 1).join('/')
    
    breadcrumbs.push({ label, href })
  })

  return breadcrumbs
}