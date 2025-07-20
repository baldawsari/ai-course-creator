'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store/auth-store'
import { 
  Menu, Search, Bell, User, Settings, LogOut, 
  HelpCircle, ChevronDown, Sparkles, Sun, Moon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Breadcrumb {
  label: string
  href?: string
}

interface AppHeaderProps {
  onToggleSidebar: () => void
  onOpenSearch: () => void
  breadcrumbs: Breadcrumb[]
}

export function AppHeader({ onToggleSidebar, onOpenSearch, breadcrumbs }: AppHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  const { user, logout } = useAuthStore()

  const notifications = [
    {
      id: 1,
      title: 'Course Generation Complete',
      message: 'Your course "Introduction to AI" is ready for review',
      time: '2 minutes ago',
      unread: true
    },
    {
      id: 2,
      title: 'Document Upload Successful',
      message: '5 documents have been processed and indexed',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 3,
      title: 'Weekly Report Available',
      message: 'Your course generation analytics are ready',
      time: '1 day ago',
      unread: false
    }
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Side - Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Breadcrumbs */}
          <nav className="hidden md:flex items-center gap-2 text-sm">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb.label} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-slate-400 dark:text-slate-500">/</span>
                )}
                {breadcrumb.href ? (
                  <Link
                    href={breadcrumb.href}
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {breadcrumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 dark:text-white font-medium">
                    {breadcrumb.label}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Center - Quick Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSearch}
            className="w-64 justify-start text-slate-500 dark:text-slate-400"
          >
            <Search className="w-4 h-4 mr-2" />
            Search courses, documents...
            <kbd className="ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Right Side - Actions & User Menu */}
        <div className="flex items-center gap-2">
          {/* Search Button (Mobile) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSearch}
            className="lg:hidden"
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="hidden sm:flex"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative"
              data-testid="notification-bell"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" data-testid="notification-badge">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50"
                    data-testid="notification-center"
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Notifications
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer",
                            notification.unread && "bg-violet-50 dark:bg-violet-900/20"
                          )}
                          data-testid="notification-item"
                        >
                          <div className="flex items-start gap-3">
                            {notification.unread && (
                              <div className="w-2 h-2 bg-violet-500 rounded-full mt-2" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                                {notification.title}
                              </h4>
                              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                                {notification.message}
                              </p>
                              <p className="text-slate-400 text-xs mt-2">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                      <Button variant="ghost" size="sm" className="w-full">
                        View All Notifications
                      </Button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative" data-testid="user-menu">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-amber-500 rounded-full flex items-center justify-center">
                {user?.name ? (
                  <span className="text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <ChevronDown className="w-4 h-4 hidden sm:block" />
            </Button>

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50"
                  >
                    {/* User Info */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-amber-500 rounded-full flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {user?.email || 'user@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile Settings
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Preferences
                      </Link>
                      <Link
                        href="/help"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <HelpCircle className="w-4 h-4" />
                        Help & Support
                      </Link>
                      <hr className="my-2 border-slate-200 dark:border-slate-700" />
                      <button
                        onClick={handleLogout}
                        data-testid="logout-button"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}