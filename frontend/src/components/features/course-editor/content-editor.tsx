'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  Quote,
  Code,
  Image,
  Video,
  Table,
  Sparkles,
  Type,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal,
  Plus,
  GripVertical,
  Trash2,
  Eye,
  Edit
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Session, Activity } from '@/types/course'

interface ContentEditorProps {
  courseId: string
  selectedSession: Session | null
  selectedActivity: string | null
  onSessionUpdate: (sessionId: string, updates: Partial<Session>) => void
  onActivityUpdate: (sessionId: string, activityId: string, updates: Partial<Activity>) => void
  onOpenAIPanel: () => void
  focusMode: boolean
  searchQuery?: string
}

interface ContentBlock {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list' | 'quote' | 'code' | 'image' | 'video' | 'table'
  content: string
  metadata?: Record<string, any>
}

export function ContentEditor({
  courseId,
  selectedSession,
  selectedActivity,
  onSessionUpdate,
  onActivityUpdate,
  onOpenAIPanel,
  focusMode,
  searchQuery = ''
}: ContentEditorProps) {
  const [editMode, setEditMode] = useState(true)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const editorRef = useRef<HTMLDivElement>(null)

  // Get current activity
  const currentActivity = selectedSession?.activities?.find(a => a.id === selectedActivity)

  // Initialize content blocks from activity content
  useEffect(() => {
    if (currentActivity?.content) {
      // Parse content into blocks (simplified implementation)
      const blocks: ContentBlock[] = [
        {
          id: '1',
          type: 'paragraph',
          content: currentActivity.content
        }
      ]
      setContentBlocks(blocks)
    }
  }, [currentActivity])

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setToolbarPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      })
      setShowFloatingToolbar(true)
    } else {
      setShowFloatingToolbar(false)
    }
  }

  const addBlock = (type: ContentBlock['type'], afterBlockId?: string) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      metadata: {}
    }

    if (afterBlockId) {
      const index = contentBlocks.findIndex(b => b.id === afterBlockId)
      const newBlocks = [...contentBlocks]
      newBlocks.splice(index + 1, 0, newBlock)
      setContentBlocks(newBlocks)
    } else {
      setContentBlocks([...contentBlocks, newBlock])
    }

    setSelectedBlockId(newBlock.id)
  }

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    setContentBlocks(blocks => 
      blocks.map(block => 
        block.id === blockId ? { ...block, ...updates } : block
      )
    )
  }

  const deleteBlock = (blockId: string) => {
    setContentBlocks(blocks => blocks.filter(b => b.id !== blockId))
  }

  const renderBlock = (block: ContentBlock) => {
    const isSelected = selectedBlockId === block.id

    const BlockWrapper = ({ children }: { children: React.ReactNode }) => (
      <motion.div
        layout
        className={cn(
          "group relative border border-transparent rounded-lg p-3 transition-all duration-200",
          isSelected && "border-purple-200 bg-purple-50/50",
          "hover:border-gray-200 hover:bg-gray-50/50"
        )}
        onClick={() => setSelectedBlockId(block.id)}
      >
        {/* Block Actions */}
        <div className={cn(
          "absolute left-0 top-3 flex items-center space-x-1 -translate-x-full pr-2 opacity-0 transition-opacity duration-200",
          (isSelected || "group-hover:opacity-100") && "opacity-100"
        )}>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <Plus className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => addBlock('paragraph', block.id)}>
                <Type className="h-4 w-4 mr-2" />
                Paragraph
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock('heading1', block.id)}>
                <Heading1 className="h-4 w-4 mr-2" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock('heading2', block.id)}>
                <Heading2 className="h-4 w-4 mr-2" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock('list', block.id)}>
                <List className="h-4 w-4 mr-2" />
                Bullet List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock('quote', block.id)}>
                <Quote className="h-4 w-4 mr-2" />
                Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock('code', block.id)}>
                <Code className="h-4 w-4 mr-2" />
                Code Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock('image', block.id)}>
                <Image className="h-4 w-4 mr-2" />
                Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Block Actions - Right Side */}
        <div className={cn(
          "absolute right-3 top-3 flex items-center space-x-1 opacity-0 transition-opacity duration-200",
          (isSelected || "group-hover:opacity-100") && "opacity-100"
        )}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenAIPanel}
                  className="p-1"
                >
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Enhance with AI
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteBlock(block.id)}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {children}
      </motion.div>
    )

    switch (block.type) {
      case 'paragraph':
        return (
          <BlockWrapper key={block.id}>
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Start typing..."
              className="min-h-[80px] border-0 p-0 resize-none focus:ring-0 text-gray-900"
              onMouseUp={handleTextSelection}
              data-testid="content-textarea"
            />
          </BlockWrapper>
        )

      case 'heading1':
        return (
          <BlockWrapper key={block.id}>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Heading 1"
              className="text-3xl font-bold border-0 p-0 focus:ring-0 text-gray-900 bg-transparent"
            />
          </BlockWrapper>
        )

      case 'heading2':
        return (
          <BlockWrapper key={block.id}>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Heading 2"
              className="text-2xl font-semibold border-0 p-0 focus:ring-0 text-gray-900 bg-transparent"
            />
          </BlockWrapper>
        )

      case 'heading3':
        return (
          <BlockWrapper key={block.id}>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Heading 3"
              className="text-xl font-medium border-0 p-0 focus:ring-0 text-gray-900 bg-transparent"
            />
          </BlockWrapper>
        )

      case 'list':
        return (
          <BlockWrapper key={block.id}>
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="• List item 1&#10;• List item 2&#10;• List item 3"
              className="min-h-[100px] border-0 p-0 resize-none focus:ring-0 text-gray-900 font-mono"
            />
          </BlockWrapper>
        )

      case 'quote':
        return (
          <BlockWrapper key={block.id}>
            <div className="border-l-4 border-purple-300 pl-4">
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Enter quote..."
                className="min-h-[80px] border-0 p-0 resize-none focus:ring-0 text-gray-700 italic"
              />
            </div>
          </BlockWrapper>
        )

      case 'code':
        return (
          <BlockWrapper key={block.id}>
            <div className="bg-gray-900 rounded-lg p-4">
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Enter code..."
                className="min-h-[120px] border-0 p-0 resize-none focus:ring-0 text-green-400 font-mono bg-transparent"
              />
            </div>
          </BlockWrapper>
        )

      case 'image':
        return (
          <BlockWrapper key={block.id}>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Click to upload an image</p>
              <Input
                type="url"
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Or paste image URL..."
                className="max-w-xs mx-auto"
              />
            </div>
          </BlockWrapper>
        )

      default:
        return null
    }
  }

  if (!selectedSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a session to edit</h3>
          <p className="text-gray-500">Choose a session from the left panel to start editing content.</p>
        </div>
      </div>
    )
  }

  if (!currentActivity) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an activity to edit</h3>
          <p className="text-gray-500">Choose an activity from the session to start editing content.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex-1 flex flex-col bg-white transition-all duration-300",
      focusMode && "mx-auto max-w-4xl"
    )}>
      {/* Editor Header */}
      {!focusMode && (
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentActivity.title}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedSession.title} • Activity Editor
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={editMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setEditMode(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant={!editMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setEditMode(false)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Formatting Toolbar */}
      {editMode && !focusMode && (
        <div className="border-b border-gray-100 px-6 py-2">
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Bold className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bold (Cmd+B)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Italic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Italic (Cmd+I)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Underline className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Underline (Cmd+U)</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Link className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Link (Cmd+K)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bullet List</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Numbered List</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Quote className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Quote</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Code Block</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Table className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Insert Table</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenAIPanel}
                    className="p-2 text-purple-600"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enhance with AI</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div 
          ref={editorRef}
          className={cn(
            "max-w-none mx-auto p-6",
            focusMode ? "max-w-4xl" : "max-w-5xl"
          )}
        >
          {editMode ? (
            <div className="space-y-4">
              <AnimatePresence>
                {contentBlocks.map(renderBlock)}
              </AnimatePresence>
              
              {/* Add Block Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full max-w-xs">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Block
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => addBlock('paragraph')}>
                      <Type className="h-4 w-4 mr-2" />
                      Paragraph
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addBlock('heading1')}>
                      <Heading1 className="h-4 w-4 mr-2" />
                      Heading 1
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addBlock('heading2')}>
                      <Heading2 className="h-4 w-4 mr-2" />
                      Heading 2
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addBlock('list')}>
                      <List className="h-4 w-4 mr-2" />
                      Bullet List
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addBlock('quote')}>
                      <Quote className="h-4 w-4 mr-2" />
                      Quote
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addBlock('code')}>
                      <Code className="h-4 w-4 mr-2" />
                      Code Block
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addBlock('image')}>
                      <Image className="h-4 w-4 mr-2" />
                      Image
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            </div>
          ) : (
            // Preview Mode
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ 
                __html: contentBlocks.map(block => {
                  switch (block.type) {
                    case 'heading1':
                      return `<h1>${block.content}</h1>`
                    case 'heading2':
                      return `<h2>${block.content}</h2>`
                    case 'heading3':
                      return `<h3>${block.content}</h3>`
                    case 'quote':
                      return `<blockquote>${block.content}</blockquote>`
                    case 'code':
                      return `<pre><code>${block.content}</code></pre>`
                    case 'list':
                      return `<ul>${block.content.split('\n').map(item => 
                        item.trim() ? `<li>${item.replace(/^[•\-\*]\s*/, '')}</li>` : ''
                      ).join('')}</ul>`
                    default:
                      return `<p>${block.content}</p>`
                  }
                }).join('')
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Formatting Toolbar */}
      <AnimatePresence>
        {showFloatingToolbar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              left: toolbarPosition.x,
              top: toolbarPosition.y,
              transform: 'translateX(-50%) translateY(-100%)',
              zIndex: 50
            }}
            className="bg-gray-900 text-white rounded-lg shadow-lg p-2 flex items-center space-x-1"
          >
            <Button variant="ghost" size="sm" className="p-1 text-white hover:bg-gray-700">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 text-white hover:bg-gray-700">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 text-white hover:bg-gray-700">
              <Link className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="sm" className="p-1 text-purple-400 hover:bg-gray-700">
              <Sparkles className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}