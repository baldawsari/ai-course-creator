'use client'

import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  maxTags?: number
  allowDuplicates?: boolean
  className?: string
  disabled?: boolean
}

export function TagInput({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = "Add tags...",
  maxTags,
  allowDuplicates = false,
  className,
  disabled = false
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
    (allowDuplicates || !tags.includes(suggestion))
  )

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return

    if (maxTags && tags.length >= maxTags) return
    if (!allowDuplicates && tags.includes(trimmedTag)) return

    onTagsChange([...tags, trimmedTag])
    setInputValue('')
    setShowSuggestions(false)
  }

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index)
    onTagsChange(newTags)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setShowSuggestions(e.target.value.length > 0 && filteredSuggestions.length > 0)
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
      case ',':
      case ';':
        e.preventDefault()
        if (inputValue.trim()) {
          addTag(inputValue)
        }
        break
      case 'Backspace':
        if (inputValue === '' && tags.length > 0) {
          removeTag(tags.length - 1)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion)
    inputRef.current?.focus()
  }

  const canAddMoreTags = !maxTags || tags.length < maxTags

  return (
    <div className={cn("relative", className)}>
      {/* Tags Container */}
      <div className={cn(
        "min-h-[2.5rem] p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all duration-200",
        disabled && "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
      )}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Existing Tags */}
          <AnimatePresence mode="popLayout">
            {tags.map((tag, index) => (
              <motion.div
                key={`${tag}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
                className="inline-flex"
              >
                <Badge
                  variant="secondary"
                  className="text-sm py-1 px-2 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors duration-200"
                >
                  <span>{tag}</span>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTag(index)}
                      className="h-4 w-4 p-0 hover:bg-transparent text-primary/70 hover:text-primary"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Input Field */}
          {canAddMoreTags && !disabled && (
            <div className="flex-1 min-w-[120px]">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setShowSuggestions(inputValue.length > 0 && filteredSuggestions.length > 0)}
                placeholder={tags.length === 0 ? placeholder : ""}
                className="border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              />
            </div>
          )}

          {/* Add Button for mobile */}
          {canAddMoreTags && !disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (inputValue.trim()) {
                  addTag(inputValue)
                }
                inputRef.current?.focus()
              }}
              className="h-6 w-6 p-0 text-gray-400 hover:text-primary lg:hidden"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Max tags indicator */}
        {maxTags && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {tags.length}/{maxTags} tags
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            <div className="p-1">
              {filteredSuggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 focus:outline-none transition-colors duration-150"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Press Enter, comma, or semicolon to add tags
        {maxTags && ` (max ${maxTags})`}
      </p>
    </div>
  )
}