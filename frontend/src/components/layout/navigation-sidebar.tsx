'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCourseStore } from '@/lib/store/course-store'
import { 
  Home, BookOpen, FileText, Settings, HelpCircle, 
  Zap, BarChart3, Upload, PanelLeftClose, PanelLeftOpen,
  ChevronDown, ChevronRight, Plus, Sparkles, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationSidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  onClose: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavItem[]
}

export function NavigationSidebar({ 
  isOpen, 
  isCollapsed, 
  onToggleCollapse, 
  onClose 
}: NavigationSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['courses'])
  const pathname = usePathname()
  const { courses } = useCourseStore()

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const recentCourses = courses.slice(0, 5)

  const navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home
    },
    {
      label: 'Courses',
      href: '/courses',
      icon: BookOpen,
      badge: courses.length,
      children: recentCourses.map(course => ({
        label: course.title,
        href: `/courses/${course.id}`,
        icon: Sparkles
      }))
    },
    {
      label: 'Documents',
      href: '/documents',
      icon: FileText,
      badge: 'NEW'
    },
    {
      label: 'Generate',
      href: '/generate',
      icon: Zap
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3
    },
    {
      label: 'Upload',
      href: '/upload',
      icon: Upload
    }
  ]

  const bottomItems: NavItem[] = [
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings
    },
    {
      label: 'Help',
      href: '/help',
      icon: HelpCircle
    }
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isItemExpanded = expandedItems.includes(item.label)
    const active = isActive(item.href)

    return (
      <div key={item.label}>
        <div className="relative">
          <Link
            href={item.href}
            className={cn(
              "group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              level > 0 && "ml-6 pl-6",
              active 
                ? "bg-gradient-to-r from-violet-500/10 to-amber-500/10 text-violet-600 dark:text-violet-400 border-r-2 border-violet-500 dark:border-violet-400" 
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50",
              isCollapsed && level === 0 && "justify-center px-2"
            )}
            onClick={() => level === 0 && onClose()}
          >
            <item.icon className={cn(
              "flex-shrink-0 transition-colors",
              active 
                ? "text-violet-600 dark:text-violet-400" 
                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200",
              isCollapsed ? "w-6 h-6" : "w-5 h-5"
            )} />
            
            {!isCollapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                
                {/* Badge */}
                {item.badge && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded-full",
                    typeof item.badge === 'number'
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      : "bg-amber-500/10 text-amber-600"
                  )}>
                    {item.badge}
                  </span>
                )}

                {/* Expand/Collapse Icon */}
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleExpanded(item.label)
                    }}
                    className="flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  >
                    {isItemExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                )}
              </>
            )}
          </Link>

          {/* Active Indicator */}
          {active && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b from-violet-500 to-amber-500 rounded-r-full"
              initial={false}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </div>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <AnimatePresence>
            {isItemExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 mt-1">
                  {item.children?.map(child => renderNavItem(child, level + 1))}
                  
                  {/* Add New Course Button for Courses */}
                  {item.label === 'Courses' && (
                    <Link
                      href="/courses/new"
                      className="group flex items-center gap-3 ml-6 pl-6 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      onClick={onClose}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Course</span>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isCollapsed ? 64 : 256,
          x: 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-amber-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-violet-500 to-amber-500 bg-clip-text text-transparent">
                AI Course Creator
              </span>
            </Link>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(
              "flex-shrink-0",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigationItems.map(item => renderNavItem(item))}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            {bottomItems.map(item => renderNavItem(item))}
          </div>
        </div>

        {/* Quick Course Switcher - Collapsed Mode */}
        {isCollapsed && recentCourses.length > 0 && (
          <div className="p-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {recentCourses.length}
              </span>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-violet-500 to-amber-500 bg-clip-text text-transparent">
                  AI Course Creator
                </span>
              </Link>
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {navigationItems.map(item => renderNavItem(item))}
              </div>
            </nav>

            {/* Bottom Navigation */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                {bottomItems.map(item => renderNavItem(item))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}