'use client'

import { motion } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description?: string
  isCompleted?: boolean
  isOptional?: boolean
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'compact' | 'numbered'
  onStepClick?: (stepIndex: number) => void
  className?: string
}

export function StepIndicator({
  steps,
  currentStep,
  orientation = 'horizontal',
  variant = 'default',
  onStepClick,
  className
}: StepIndicatorProps) {
  const isClickable = !!onStepClick

  const getStepStatus = (index: number) => {
    if (steps[index].isCompleted) return 'completed'
    if (index === currentStep) return 'current'
    if (index < currentStep) return 'completed'
    return 'upcoming'
  }

  const StepContent = ({ step, index }: { step: Step; index: number }) => {
    const status = getStepStatus(index)
    const isActive = status === 'current'
    const isCompleted = status === 'completed'
    const isUpcoming = status === 'upcoming'

    return (
      <motion.div
        className={cn(
          "flex items-center gap-3",
          orientation === 'vertical' && "flex-col items-start",
          isClickable && "cursor-pointer group",
          "transition-all duration-200"
        )}
        onClick={() => isClickable && onStepClick(index)}
        whileHover={isClickable ? { scale: 1.02 } : {}}
        whileTap={isClickable ? { scale: 0.98 } : {}}
      >
        {/* Step Circle */}
        <div className={cn(
          "relative flex items-center justify-center rounded-full border-2 transition-all duration-300",
          variant === 'compact' ? "w-6 h-6" : "w-8 h-8",
          isCompleted 
            ? "bg-primary border-primary text-primary-foreground" 
            : isActive
            ? "bg-primary/10 border-primary text-primary"
            : "bg-background border-gray-300 dark:border-gray-600 text-gray-400",
          isClickable && "group-hover:scale-110"
        )}>
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Check className={cn(
                variant === 'compact' ? "w-3 h-3" : "w-4 h-4"
              )} />
            </motion.div>
          ) : variant === 'numbered' ? (
            <span className={cn(
              "font-semibold",
              variant === 'compact' ? "text-xs" : "text-sm"
            )}>
              {index + 1}
            </span>
          ) : (
            <motion.div
              className={cn(
                "rounded-full",
                variant === 'compact' ? "w-2 h-2" : "w-3 h-3",
                isActive ? "bg-primary" : "bg-current"
              )}
              animate={isActive ? {
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              } : {}}
              transition={{
                duration: 2,
                repeat: isActive ? Infinity : 0,
                ease: "easeInOut"
              }}
            />
          )}

          {/* Active pulse */}
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
        </div>

        {/* Step Content */}
        {variant !== 'compact' && (
          <div className={cn(
            "space-y-1",
            orientation === 'vertical' && "text-center"
          )}>
            <div className="flex items-center gap-2">
              <h4 className={cn(
                "font-medium text-sm",
                isCompleted || isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground"
              )}>
                {step.title}
              </h4>
              {step.isOptional && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Optional
                </span>
              )}
            </div>
            
            {step.description && (
              <p className={cn(
                "text-xs",
                isCompleted || isActive 
                  ? "text-muted-foreground" 
                  : "text-muted-foreground/70"
              )}>
                {step.description}
              </p>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  const ConnectorLine = ({ index }: { index: number }) => {
    const isCompleted = getStepStatus(index) === 'completed'
    const nextIsCompleted = index + 1 < steps.length && 
      (getStepStatus(index + 1) === 'completed' || getStepStatus(index + 1) === 'current')

    if (orientation === 'horizontal') {
      return (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="relative w-full h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: nextIsCompleted ? "100%" : "0%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      )
    } else {
      return (
        <div className="flex justify-center py-3">
          <div className="relative w-0.5 h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-x-0 top-0 bg-primary rounded-full"
              initial={{ height: "0%" }}
              animate={{ height: nextIsCompleted ? "100%" : "0%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      )
    }
  }

  return (
    <div className={cn(
      "flex",
      orientation === 'horizontal' 
        ? "items-center justify-between" 
        : "flex-col items-start",
      className
    )}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            "flex",
            orientation === 'horizontal' 
              ? "items-center" 
              : "flex-col w-full"
          )}
        >
          <StepContent step={step} index={index} />
          
          {/* Connector */}
          {index < steps.length - 1 && (
            <ConnectorLine index={index} />
          )}
        </div>
      ))}
    </div>
  )
}