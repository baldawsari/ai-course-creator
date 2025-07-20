'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon, MoreHorizontal, Separator } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextMenuItem {
  id: string
  label: string
  icon?: LucideIcon
  shortcut?: string
  disabled?: boolean
  destructive?: boolean
  separator?: boolean
  action?: () => void
  submenu?: ContextMenuItem[]
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

interface Position {
  x: number
  y: number
}

export function ContextMenu({
  items,
  children,
  disabled = false,
  className
}: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return
    
    e.preventDefault()
    e.stopPropagation()

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Calculate position relative to viewport
    let x = e.clientX
    let y = e.clientY

    // Ensure menu doesn't go off screen
    const menuWidth = 200 // Approximate menu width
    const menuHeight = items.length * 40 // Approximate item height

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }

    setPosition({ x, y })
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setOpenSubmenu(null)
  }

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return
    
    if (item.submenu) {
      setOpenSubmenu(openSubmenu === item.id ? null : item.id)
    } else {
      item.action?.()
      handleClose()
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('scroll', handleClose)
      window.addEventListener('resize', handleClose)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('scroll', handleClose)
      window.removeEventListener('resize', handleClose)
    }
  }, [isOpen])

  const renderMenuItem = (item: ContextMenuItem, depth = 0) => {
    if (item.separator) {
      return (
        <div key={item.id} className="my-1">
          <div className="h-px bg-gray-200 dark:bg-gray-700 mx-2" />
        </div>
      )
    }

    const ItemIcon = item.icon
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isSubmenuOpen = openSubmenu === item.id

    return (
      <div key={item.id} className="relative">
        <motion.button
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors duration-150 text-left",
            item.disabled
              ? "opacity-50 cursor-not-allowed"
              : item.destructive
              ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          disabled={item.disabled}
          onClick={() => handleItemClick(item)}
          whileHover={!item.disabled ? { x: 2 } : {}}
          whileTap={!item.disabled ? { scale: 0.98 } : {}}
        >
          <div className="flex items-center gap-3">
            {ItemIcon && (
              <ItemIcon className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </div>

          <div className="flex items-center gap-2">
            {item.shortcut && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {item.shortcut}
              </span>
            )}
            {hasSubmenu && (
              <motion.div
                animate={{ rotate: isSubmenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <MoreHorizontal className="w-3 h-3 rotate-90" />
              </motion.div>
            )}
          </div>
        </motion.button>

        {/* Submenu */}
        <AnimatePresence>
          {hasSubmenu && isSubmenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full top-0 ml-1 z-50"
            >
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]">
                {item.submenu!.map((subItem) => renderMenuItem(subItem, depth + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        className={cn("select-none", className)}
      >
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={handleClose}
            />

            {/* Menu */}
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px] max-w-[250px]"
              style={{
                left: position.x,
                top: position.y,
              }}
            >
              {items.map((item) => renderMenuItem(item))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Hook for easier usage
export function useContextMenu(items: ContextMenuItem[]) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })

  const open = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setPosition({ x: e.clientX, y: e.clientY })
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
  }

  return {
    isOpen,
    position,
    open,
    close,
    ContextMenu: ({ children, ...props }: Omit<ContextMenuProps, 'items'>) => (
      <ContextMenu items={items} {...props}>
        {children}
      </ContextMenu>
    )
  }
}