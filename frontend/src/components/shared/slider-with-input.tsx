'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SliderWithInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  description?: string
  unit?: string
  formatValue?: (value: number) => string
  showInput?: boolean
  showButtons?: boolean
  disabled?: boolean
  className?: string
}

export function SliderWithInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  description,
  unit = '',
  formatValue,
  showInput = true,
  showButtons = false,
  disabled = false,
  className
}: SliderWithInputProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const [isInputFocused, setIsInputFocused] = useState(false)

  // Update input value when prop value changes (unless input is focused)
  useEffect(() => {
    if (!isInputFocused) {
      setInputValue(value.toString())
    }
  }, [value, isInputFocused])

  const handleSliderChange = (newValues: number[]) => {
    const newValue = newValues[0]
    onChange(newValue)
    if (!isInputFocused) {
      setInputValue(newValue.toString())
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
    const numValue = parseFloat(inputValue)
    
    if (isNaN(numValue)) {
      setInputValue(value.toString())
      return
    }

    // Clamp value to min/max range
    const clampedValue = Math.min(Math.max(numValue, min), max)
    
    // Round to nearest step
    const steppedValue = Math.round(clampedValue / step) * step
    
    onChange(steppedValue)
    setInputValue(steppedValue.toString())
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    } else if (e.key === 'Escape') {
      setInputValue(value.toString())
      setIsInputFocused(false)
    }
  }

  const handleButtonClick = (direction: 'increase' | 'decrease') => {
    const change = direction === 'increase' ? step : -step
    const newValue = Math.min(Math.max(value + change, min), max)
    onChange(newValue)
  }

  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label and Description */}
      {(label || description) && (
        <div className="space-y-1">
          {label && (
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {label}
              </Label>
              <span className="text-sm text-muted-foreground">
                {displayValue}
              </span>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center gap-3">
        {/* Decrease Button */}
        {showButtons && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleButtonClick('decrease')}
            disabled={disabled || value <= min}
            className="h-8 w-8 p-0 shrink-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
        )}

        {/* Slider Container */}
        <div className="flex-1 space-y-2">
          <div className="relative">
            <Slider
              value={[value]}
              onValueChange={handleSliderChange}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="w-full"
            />
            
            {/* Value indicator */}
            <motion.div
              className="absolute top-0 transform -translate-y-8 -translate-x-1/2 pointer-events-none"
              style={{ left: `${percentage}%` }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="bg-primary text-primary-foreground text-xs py-1 px-2 rounded-md shadow-md">
                {displayValue}
              </div>
            </motion.div>
          </div>

          {/* Range indicators */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatValue ? formatValue(min) : `${min}${unit}`}</span>
            <span>{formatValue ? formatValue(max) : `${max}${unit}`}</span>
          </div>
        </div>

        {/* Increase Button */}
        {showButtons && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleButtonClick('increase')}
            disabled={disabled || value >= max}
            className="h-8 w-8 p-0 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Input Field */}
        {showInput && (
          <div className="w-20 shrink-0">
            <Input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setIsInputFocused(true)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="text-center text-sm h-8"
            />
          </div>
        )}
      </div>

      {/* Progress segments for complex ranges */}
      {max > 100 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Range: {min} - {max}</span>
            <span>Step: {step}</span>
          </div>
          
          {/* Visual progress bar */}
          <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      )}

      {/* Quick preset buttons for common values */}
      {max >= 100 && (
        <div className="flex items-center gap-1 pt-1">
          <span className="text-xs text-muted-foreground mr-2">Quick:</span>
          {[0, 25, 50, 75, 100].filter(preset => preset >= min && preset <= max).map(preset => (
            <Button
              key={preset}
              variant={value === preset ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(preset)}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              {preset}{unit}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}