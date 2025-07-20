'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Command, 
  Plus, 
  FileText, 
  Settings, 
  Users, 
  Home,
  BookOpen,
  Download,
  Palette,
  Calculator,
  Clock,
  Hash,
  ArrowRight
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  title: string
  description?: string
  icon?: React.ElementType
  category: string
  shortcut?: string[]
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  commands?: CommandItem[]
  placeholder?: string
  className?: string
}

const defaultCommands: CommandItem[] = [
  {
    id: 'new-course',
    title: 'Create New Course',
    description: 'Start building a new course from scratch',
    icon: Plus,
    category: 'Create',
    shortcut: ['⌘', 'N'],
    keywords: ['new', 'create', 'course', 'start'],
    action: () => console.log('Navigate to course creation')
  },
  {
    id: 'dashboard',
    title: 'Go to Dashboard',
    description: 'Return to the main dashboard',
    icon: Home,
    category: 'Navigate',
    shortcut: ['⌘', 'H'],
    keywords: ['dashboard', 'home', 'main'],
    action: () => console.log('Navigate to dashboard')
  },
  {
    id: 'courses',
    title: 'View All Courses',
    description: 'Browse your course library',
    icon: BookOpen,
    category: 'Navigate',
    keywords: ['courses', 'library', 'browse'],
    action: () => console.log('Navigate to courses')
  },
  {
    id: 'settings',
    title: 'Open Settings',
    description: 'Configure your account and preferences',
    icon: Settings,
    category: 'Navigate',
    shortcut: ['⌘', ','],
    keywords: ['settings', 'preferences', 'config'],
    action: () => console.log('Navigate to settings')
  },
  {
    id: 'team',
    title: 'Team Management',
    description: 'Manage team members and permissions',
    icon: Users,
    category: 'Navigate',
    keywords: ['team', 'users', 'members', 'permissions'],
    action: () => console.log('Navigate to team')
  },
  {
    id: 'export',
    title: 'Export Course',
    description: 'Export current course to various formats',
    icon: Download,
    category: 'Actions',
    keywords: ['export', 'download', 'pdf', 'html'],
    action: () => console.log('Open export dialog')
  },
  {
    id: 'theme',
    title: 'Change Theme',
    description: 'Switch between light and dark themes',
    icon: Palette,
    category: 'Actions',
    keywords: ['theme', 'dark', 'light', 'appearance'],
    action: () => console.log('Toggle theme')
  }
]

const categoryIcons = {
  Create: Plus,
  Navigate: ArrowRight,
  Actions: Command,
  Search: Search
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  commands = defaultCommands,
  placeholder = "Type a command or search...",
  className
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter commands based on search
  const filteredCommands = commands.filter(command => {
    const searchLower = search.toLowerCase()
    return (
      command.title.toLowerCase().includes(searchLower) ||
      command.description?.toLowerCase().includes(searchLower) ||
      command.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower)) ||
      command.category.toLowerCase().includes(searchLower)
    )
  })

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    const category = command.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(command)
    return acc
  }, {} as Record<string, CommandItem[]>)

  const totalCommands = filteredCommands.length

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % totalCommands)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + totalCommands) % totalCommands)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onOpenChange(false)
          setSearch('')
        }
        break
      case 'Escape':
        onOpenChange(false)
        setSearch('')
        break
    }
  }, [isOpen, selectedIndex, totalCommands, filteredCommands, onOpenChange])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [onOpenChange])

  const renderShortcut = (shortcut: string[]) => (
    <div className="flex items-center gap-1">
      {shortcut.map((key, index) => (
        <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
          {key}
        </Badge>
      ))}
    </div>
  )

  let currentIndex = 0

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-2xl p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800",
        className
      )}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="pl-10 pr-20 border-0 bg-transparent text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  <Command className="w-3 h-3 mr-1" />
                  K
                </Badge>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {Object.keys(groupedCommands).length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  No commands found for "{search}"
                </p>
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedCommands).map(([category, categoryCommands]) => {
                  const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons] || Command
                  
                  return (
                    <div key={category} className="mb-4 last:mb-0">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        <CategoryIcon className="w-3 h-3" />
                        {category}
                      </div>

                      {/* Category Commands */}
                      <div className="space-y-1">
                        {categoryCommands.map((command) => {
                          const isSelected = currentIndex === selectedIndex
                          currentIndex++
                          const CommandIcon = command.icon || FileText

                          return (
                            <motion.div
                              key={command.id}
                              className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-150",
                                isSelected 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
                              )}
                              onClick={() => {
                                command.action()
                                onOpenChange(false)
                                setSearch('')
                              }}
                              whileHover={{ x: 2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className={cn(
                                "p-2 rounded-md",
                                isSelected 
                                  ? "bg-primary-foreground/20" 
                                  : "bg-gray-100 dark:bg-gray-800"
                              )}>
                                <CommandIcon className={cn(
                                  "w-4 h-4",
                                  isSelected 
                                    ? "text-primary-foreground" 
                                    : "text-gray-600 dark:text-gray-400"
                                )} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {command.title}
                                </div>
                                {command.description && (
                                  <div className={cn(
                                    "text-sm truncate",
                                    isSelected 
                                      ? "text-primary-foreground/70" 
                                      : "text-gray-500 dark:text-gray-400"
                                  )}>
                                    {command.description}
                                  </div>
                                )}
                              </div>

                              {command.shortcut && (
                                <div className="flex-shrink-0">
                                  {renderShortcut(command.shortcut)}
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">↑↓</Badge>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">↵</Badge>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">Esc</Badge>
                  <span>Close</span>
                </div>
              </div>
              <div>
                {totalCommands} {totalCommands === 1 ? 'result' : 'results'}
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}