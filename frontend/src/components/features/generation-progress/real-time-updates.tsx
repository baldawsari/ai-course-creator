'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Pause, 
  Play, 
  Square, 
  Download,
  Search,
  Filter,
  Clock,
  Wifi,
  WifiOff,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { GenerationLog, GenerationControls } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface RealTimeUpdatesProps {
  logs: GenerationLog[]
  isConnected: boolean
  connectionError?: string | null
  controls: GenerationControls
  isPaused?: boolean
  canPause?: boolean
  canCancel?: boolean
  estimatedCompletion?: Date
  elapsedTime: number
  className?: string
}

const logLevelColors = {
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warn: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  debug: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
}

const logCategoryColors = {
  system: 'text-purple-400 bg-purple-500/10',
  rag: 'text-green-400 bg-green-500/10',
  ai: 'text-blue-400 bg-blue-500/10',
  processing: 'text-orange-400 bg-orange-500/10'
}

function ConnectionStatus({ 
  isConnected, 
  connectionError, 
  onReconnect 
}: {
  isConnected: boolean
  connectionError?: string | null
  onReconnect: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-success" />
        ) : (
          <WifiOff className="h-4 w-4 text-destructive" />
        )}
        <span className={cn(
          "text-xs font-medium",
          isConnected ? "text-success" : "text-destructive"
        )}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {connectionError && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {connectionError}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onReconnect}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}

function LogFilters({
  searchTerm,
  setSearchTerm,
  selectedLevels,
  setSelectedLevels,
  selectedCategories,
  setSelectedCategories,
  onClear
}: {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedLevels: Set<string>
  setSelectedLevels: (levels: Set<string>) => void
  selectedCategories: Set<string>
  setSelectedCategories: (categories: Set<string>) => void
  onClear: () => void
}) {
  const levels = ['info', 'warn', 'error', 'debug']
  const categories = ['system', 'rag', 'ai', 'processing']

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onClear}
          className="h-8 px-2 text-xs"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-1">
        <span className="text-xs text-muted-foreground mr-2">Levels:</span>
        {levels.map(level => (
          <Badge
            key={level}
            variant={selectedLevels.has(level) ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-xs h-5 px-2",
              selectedLevels.has(level) && logLevelColors[level as keyof typeof logLevelColors]
            )}
            onClick={() => {
              const newLevels = new Set(selectedLevels)
              if (newLevels.has(level)) {
                newLevels.delete(level)
              } else {
                newLevels.add(level)
              }
              setSelectedLevels(newLevels)
            }}
          >
            {level}
          </Badge>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-1">
        <span className="text-xs text-muted-foreground mr-2">Categories:</span>
        {categories.map(category => (
          <Badge
            key={category}
            variant={selectedCategories.has(category) ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-xs h-5 px-2",
              selectedCategories.has(category) && logCategoryColors[category as keyof typeof logCategoryColors]
            )}
            onClick={() => {
              const newCategories = new Set(selectedCategories)
              if (newCategories.has(category)) {
                newCategories.delete(category)
              } else {
                newCategories.add(category)
              }
              setSelectedCategories(newCategories)
            }}
          >
            {category}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function LogEntry({ log, index }: { log: GenerationLog; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasData = log.data && Object.keys(log.data).length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "border-l-2 pl-3 py-2 text-xs font-mono",
        logLevelColors[log.level]
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground whitespace-nowrap">
          {log.timestamp.toLocaleTimeString()}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "h-4 px-1 text-xs",
            logCategoryColors[log.category]
          )}
        >
          {log.category}
        </Badge>
        <span className="flex-1 break-words">{log.message}</span>
        {hasData && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-4 w-4 p-0"
          >
            {isExpanded ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      
      <AnimatePresence>
        {isExpanded && hasData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2 bg-muted/30 rounded text-xs"
          >
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function RealTimeUpdates({
  logs,
  isConnected,
  connectionError,
  controls,
  isPaused = false,
  canPause = true,
  canCancel = true,
  estimatedCompletion,
  elapsedTime,
  className
}: RealTimeUpdatesProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevels, setSelectedLevels] = useState(new Set(['info', 'warn', 'error']))
  const [selectedCategories, setSelectedCategories] = useState(new Set(['system', 'rag', 'ai', 'processing']))
  const [autoScroll, setAutoScroll] = useState(true)
  
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = selectedLevels.has(log.level)
    const matchesCategory = selectedCategories.has(log.category)
    
    return matchesSearch && matchesLevel && matchesCategory
  })

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Check if user has scrolled up to disable auto-scroll
  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5
      setAutoScroll(isAtBottom)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${
        log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
      }`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generation-logs-${new Date().toISOString().slice(0, 19)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedLevels(new Set(['info', 'warn', 'error']))
    setSelectedCategories(new Set(['system', 'rag', 'ai', 'processing']))
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with controls */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Title and connection status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              <h3 className="font-semibold">Real-time Updates</h3>
              <Badge variant="outline" className="text-xs">
                {filteredLogs.length} / {logs.length} logs
              </Badge>
            </div>
            <ConnectionStatus
              isConnected={isConnected}
              connectionError={connectionError}
              onReconnect={controls.onViewLogs}
            />
          </div>

          {/* Time and controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
              {estimatedCompletion && (
                <div>
                  ETA: {estimatedCompletion.toLocaleTimeString()}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {canPause && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={isPaused ? controls.onResume : controls.onPause}
                  className="h-8"
                >
                  {isPaused ? (
                    <><Play className="h-3 w-3 mr-1" /> Resume</>
                  ) : (
                    <><Pause className="h-3 w-3 mr-1" /> Pause</>
                  )}
                </Button>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={controls.onCancel}
                  className="h-8"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={downloadLogs}
                className="h-8"
                disabled={logs.length === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8"
              >
                {isExpanded ? (
                  <><ChevronUp className="h-3 w-3 mr-1" /> Collapse</>
                ) : (
                  <><ChevronDown className="h-3 w-3 mr-1" /> Expand</>
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <LogFilters
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedLevels={selectedLevels}
                  setSelectedLevels={setSelectedLevels}
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  onClear={clearFilters}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Logs container */}
      <Card className="overflow-hidden">
        <div className="bg-slate-900 text-green-400 font-mono text-xs">
          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <span className="text-slate-300">Generation Terminal</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              {!autoScroll && (
                <Badge variant="outline" className="h-4 px-1 text-xs">
                  Scroll paused
                </Badge>
              )}
              <span>{filteredLogs.length} lines</span>
            </div>
          </div>

          {/* Logs */}
          <div
            ref={logsContainerRef}
            onScroll={handleScroll}
            className="h-96 overflow-y-auto p-4 space-y-1"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                {logs.length === 0 ? 'No logs yet...' : 'No logs match current filters'}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <LogEntry key={log.id} log={log} index={index} />
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </Card>
    </div>
  )
}