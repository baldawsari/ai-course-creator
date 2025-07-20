'use client'

import { useState } from 'react'
import { format, isValid, parse } from 'date-fns'
import { motion } from 'framer-motion'
import { Calendar, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  showTime?: boolean
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  className?: string
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay()
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date...",
  showTime = false,
  minDate,
  maxDate,
  disabled = false,
  className
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value || new Date())
  const [timeInput, setTimeInput] = useState(
    value ? format(value, 'HH:mm') : '09:00'
  )

  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()
  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day)
    
    if (showTime && value) {
      // Preserve the time when selecting a new date
      const existingTime = format(value, 'HH:mm')
      const [hours, minutes] = existingTime.split(':').map(Number)
      selectedDate.setHours(hours, minutes)
    } else if (showTime) {
      // Use the time input value
      const [hours, minutes] = timeInput.split(':').map(Number)
      selectedDate.setHours(hours, minutes)
    }

    onChange(selectedDate)
    if (!showTime) {
      setIsOpen(false)
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTimeInput(newTime)
    
    if (value && isValid(value)) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDate = new Date(value)
      newDate.setHours(hours, minutes)
      onChange(newDate)
    }
  }

  const handleMonthChange = (month: string) => {
    const monthIndex = months.indexOf(month)
    setViewDate(new Date(currentYear, monthIndex, 1))
  }

  const handleYearChange = (year: string) => {
    setViewDate(new Date(parseInt(year), currentMonth, 1))
  }

  const isDateDisabled = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const generateCalendarDays = () => {
    const days = []
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-8 w-8" />
      )
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = value && 
        value.getDate() === day && 
        value.getMonth() === currentMonth && 
        value.getFullYear() === currentYear
      
      const isToday = new Date().getDate() === day && 
        new Date().getMonth() === currentMonth && 
        new Date().getFullYear() === currentYear

      const isDisabled = isDateDisabled(day)

      days.push(
        <motion.button
          key={day}
          whileHover={!isDisabled ? { scale: 1.1 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          onClick={() => !isDisabled && handleDateSelect(day)}
          disabled={isDisabled}
          className={cn(
            "h-8 w-8 rounded-full text-sm font-medium transition-colors duration-150",
            isSelected
              ? "bg-primary text-primary-foreground"
              : isToday
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent hover:text-accent-foreground",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {day}
        </motion.button>
      )
    }

    return days
  }

  const years = Array.from(
    { length: 21 }, 
    (_, i) => (new Date().getFullYear() - 10 + i).toString()
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value ? (
            <span>
              {format(value, showTime ? 'PPP p' : 'PPP')}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          {value && !disabled && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-5 w-5 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-0" align="start">
        <Card className="border-0 shadow-none">
          <CardContent className="p-4 space-y-4">
            {/* Month/Year Selectors */}
            <div className="flex items-center gap-2">
              <Select value={months[currentMonth]} onValueChange={handleMonthChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => (
                  <div 
                    key={day} 
                    className="h-8 w-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays()}
              </div>
            </div>

            {/* Time Picker */}
            {showTime && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input
                  type="time"
                  value={timeInput}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  if (showTime) {
                    const [hours, minutes] = timeInput.split(':').map(Number)
                    today.setHours(hours, minutes)
                  }
                  onChange(today)
                  setViewDate(today)
                }}
                className="flex-1"
              >
                Today
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange(undefined)
                  setIsOpen(false)
                }}
                className="flex-1"
              >
                Clear
              </Button>
              
              {showTime && (
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Done
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}