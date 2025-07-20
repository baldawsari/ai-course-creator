'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  List, 
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  Edit3
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  showPreview?: boolean
  disabled?: boolean
  className?: string
}

interface ToolbarButton {
  icon: React.ElementType
  label: string
  action: () => void
  isActive?: boolean
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = 200,
  maxHeight = 400,
  showPreview = true,
  disabled = false,
  className
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false)
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update selection when textarea value changes
  useEffect(() => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current
      setSelection({ start: selectionStart, end: selectionEnd })
    }
  }, [value])

  const insertText = (before: string, after: string = '', placeholder?: string) => {
    if (!textareaRef.current) return

    const { selectionStart, selectionEnd } = textareaRef.current
    const selectedText = value.substring(selectionStart, selectionEnd)
    const textToInsert = selectedText || placeholder || ''
    
    const newText = 
      value.substring(0, selectionStart) + 
      before + 
      textToInsert + 
      after + 
      value.substring(selectionEnd)

    onChange(newText)

    // Restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = selectionStart + before.length + textToInsert.length + after.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const insertAtLineStart = (prefix: string) => {
    if (!textareaRef.current) return

    const { selectionStart } = textareaRef.current
    const lines = value.split('\n')
    let currentLineStart = 0
    let lineIndex = 0

    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      if (currentLineStart + lines[i].length >= selectionStart) {
        lineIndex = i
        break
      }
      currentLineStart += lines[i].length + 1 // +1 for newline
    }

    // Insert prefix at the beginning of the line
    lines[lineIndex] = prefix + lines[lineIndex]
    onChange(lines.join('\n'))

    // Restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = selectionStart + prefix.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const toolbarButtons: ToolbarButton[] = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => insertText('**', '**', 'bold text')
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => insertText('*', '*', 'italic text')
    },
    {
      icon: Underline,
      label: 'Underline',
      action: () => insertText('<u>', '</u>', 'underlined text')
    },
    {
      icon: Code,
      label: 'Code',
      action: () => insertText('`', '`', 'code')
    },
    {
      icon: Link,
      label: 'Link',
      action: () => insertText('[', '](url)', 'link text')
    },
    {
      icon: Heading1,
      label: 'Heading 1',
      action: () => insertAtLineStart('# ')
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      action: () => insertAtLineStart('## ')
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      action: () => insertAtLineStart('### ')
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => insertAtLineStart('- ')
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      action: () => insertAtLineStart('1. ')
    },
    {
      icon: Quote,
      label: 'Quote',
      action: () => insertAtLineStart('> ')
    }
  ]

  // Simple markdown to HTML conversion for preview
  const markdownToHtml = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Underline
      .replace(/<u>(.*)<\/u>/gim, '<u>$1</u>')
      // Code
      .replace(/`(.*)`/gim, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]*)\]\(([^)]*)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Quotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Line breaks
      .replace(/\n/gim, '<br>')
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Markdown Supported
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {value.length} characters
            </span>
          </div>

          {showPreview && (
            <div className="flex items-center gap-1">
              <Button
                variant={!isPreview ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsPreview(false)}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant={isPreview ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsPreview(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        {!isPreview && (
          <div className="flex flex-wrap items-center gap-1 pt-2">
            {toolbarButtons.map((button, index) => (
              <div key={button.label}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={button.action}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                  title={button.label}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
                {(index === 4 || index === 7 || index === 10) && (
                  <Separator orientation="vertical" className="h-6 mx-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isPreview ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none p-4 border border-gray-200 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-900/50",
              `min-h-[${minHeight}px] max-h-[${maxHeight}px] overflow-y-auto`
            )}
            dangerouslySetInnerHTML={{ 
              __html: markdownToHtml(value) || '<p class="text-gray-400">Nothing to preview...</p>' 
            }}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "border-gray-200 dark:border-gray-800 resize-none focus-visible:ring-1 focus-visible:ring-primary",
                `min-h-[${minHeight}px] max-h-[${maxHeight}px]`
              )}
              style={{ minHeight, maxHeight }}
            />
          </motion.div>
        )}

        {/* Quick Help */}
        {!isPreview && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <strong>Quick tips:</strong> 
              **bold**, *italic*, `code`, # Heading, - List, {'>'} Quote, [link](url)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}