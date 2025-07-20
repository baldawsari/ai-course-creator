'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  className?: string
  contentClassName?: string
}

const sizeConfig = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]'
}

const variantConfig = {
  default: {
    icon: null,
    iconColor: '',
    borderColor: 'border-gray-200 dark:border-gray-800'
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800'
  }
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  contentClassName
}: ModalProps) {
  const config = variantConfig[variant]
  const IconComponent = config.icon

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, closeOnEscape, onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut"
            }}
            className={cn(
              "relative w-full bg-white dark:bg-gray-950 rounded-lg shadow-xl border",
              sizeConfig[size],
              config.borderColor,
              className
            )}
          >
            {/* Header */}
            {(title || description || showCloseButton) && (
              <div className={cn(
                "flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-800",
                !title && !description && "pb-0 border-b-0"
              )}>
                <div className="flex items-start gap-3 flex-1">
                  {IconComponent && (
                    <div className="flex-shrink-0 mt-0.5">
                      <IconComponent className={cn("w-5 h-5", config.iconColor)} />
                    </div>
                  )}
                  
                  <div className="space-y-1 flex-1">
                    {title && (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                      </h3>
                    )}
                    {description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 -mt-1 -mr-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            {children && (
              <div className={cn(
                "p-6",
                (title || description) && "pt-4",
                contentClassName
              )}>
                {children}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Confirmation Modal
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'warning' | 'error'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      variant={variant}
      size="sm"
    >
      <div className="flex items-center gap-3 justify-end">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'error' ? 'destructive' : 'default'}
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : confirmText}
        </Button>
      </div>
    </Modal>
  )
}

// Alert Modal
interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  variant?: 'success' | 'warning' | 'error' | 'info'
  buttonText?: string
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  variant = 'info',
  buttonText = 'OK'
}: AlertModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      variant={variant}
      size="sm"
    >
      <div className="flex justify-end">
        <Button onClick={onClose}>
          {buttonText}
        </Button>
      </div>
    </Modal>
  )
}

// Loading Modal
interface LoadingModalProps {
  isOpen: boolean
  title?: string
  description?: string
}

export function LoadingModal({
  isOpen,
  title = 'Loading...',
  description
}: LoadingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // No close action for loading
      title={title}
      description={description}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="flex items-center justify-center py-6">
        <motion.div
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    </Modal>
  )
}

// Form Modal wrapper
interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  onSubmit: (e: React.FormEvent) => void
  submitText?: string
  cancelText?: string
  isLoading?: boolean
  children: React.ReactNode
  size?: ModalProps['size']
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  isLoading = false,
  children,
  size = 'md'
}: FormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {children}
        </div>
        
        <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : submitText}
          </Button>
        </div>
      </form>
    </Modal>
  )
}