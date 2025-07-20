'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GitBranch, 
  History, 
  Download, 
  Eye, 
  RotateCcw, 
  Archive, 
  Star,
  Calendar,
  Clock,
  User,
  FileText,
  Diff,
  Plus,
  Minus,
  Edit,
  Trash2,
  Tag,
  Copy,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

// Types
interface Version {
  id: string
  version: string
  courseId: string
  courseName: string
  author: string
  createdAt: Date
  size: number
  format: 'html' | 'pdf' | 'ppt' | 'bundle'
  template: string
  isStarred: boolean
  isArchived: boolean
  downloadUrl: string
  changes: Change[]
  metadata: {
    exportSettings: any
    templateSettings: any
    contentHash: string
  }
  tags: string[]
  description?: string
}

interface Change {
  type: 'added' | 'modified' | 'removed'
  section: string
  content?: string
  lineNumber?: number
  details: string
}

interface VersionCompare {
  from: Version
  to: Version
  changes: Change[]
  summary: {
    added: number
    modified: number
    removed: number
  }
}

// Mock data
const MOCK_VERSIONS: Version[] = [
  {
    id: 'v_001',
    version: '2.1.0',
    courseId: 'course_001',
    courseName: 'Introduction to React Development',
    author: 'John Doe',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    size: 2400000,
    format: 'html',
    template: 'modern-glass',
    isStarred: true,
    isArchived: false,
    downloadUrl: 'https://example.com/versions/v_001.zip',
    changes: [
      { type: 'added', section: 'Session 3', details: 'Added new session on React Hooks' },
      { type: 'modified', section: 'Session 1', details: 'Updated introduction content' }
    ],
    metadata: {
      exportSettings: { quality: 'high', optimization: true },
      templateSettings: { theme: 'dark', animations: true },
      contentHash: 'abc123'
    },
    tags: ['stable', 'production'],
    description: 'Major update with new React Hooks session'
  },
  {
    id: 'v_002',
    version: '2.0.1',
    courseId: 'course_001',
    courseName: 'Introduction to React Development',
    author: 'Jane Smith',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    size: 2200000,
    format: 'html',
    template: 'modern-glass',
    isStarred: false,
    isArchived: false,
    downloadUrl: 'https://example.com/versions/v_002.zip',
    changes: [
      { type: 'modified', section: 'Session 2', details: 'Fixed code examples' },
      { type: 'removed', section: 'Session 4', details: 'Removed outdated content' }
    ],
    metadata: {
      exportSettings: { quality: 'high', optimization: false },
      templateSettings: { theme: 'light', animations: true },
      contentHash: 'def456'
    },
    tags: ['bugfix'],
    description: 'Bug fixes and content updates'
  },
  {
    id: 'v_003',
    version: '2.0.0',
    courseId: 'course_001',
    courseName: 'Introduction to React Development',
    author: 'John Doe',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    size: 2100000,
    format: 'html',
    template: 'classic-elegant',
    isStarred: true,
    isArchived: false,
    downloadUrl: 'https://example.com/versions/v_003.zip',
    changes: [
      { type: 'added', section: 'Overall', details: 'Complete course restructure' },
      { type: 'added', section: 'Session 1', details: 'New introduction format' },
      { type: 'added', section: 'Session 2', details: 'Enhanced code examples' }
    ],
    metadata: {
      exportSettings: { quality: 'medium', optimization: true },
      templateSettings: { theme: 'light', animations: false },
      contentHash: 'ghi789'
    },
    tags: ['major', 'stable'],
    description: 'Major version with complete restructure'
  }
]

interface VersionControlProps {
  courseId?: string
  onVersionRestore?: (version: Version) => void
  onVersionDelete?: (versionId: string) => void
}

export function VersionControl({ 
  courseId, 
  onVersionRestore, 
  onVersionDelete 
}: VersionControlProps) {
  const [versions, setVersions] = useState<Version[]>(MOCK_VERSIONS)
  const [selectedVersions, setSelectedVersions] = useState<[string | null, string | null]>([null, null])
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)

  // Filter versions
  const filteredVersions = useMemo(() => {
    let filtered = versions

    // Filter by course if specified
    if (courseId) {
      filtered = filtered.filter(v => v.courseId === courseId)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(v => 
        v.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by tag
    if (filterTag !== 'all') {
      filtered = filtered.filter(v => v.tags.includes(filterTag))
    }

    // Filter archived
    if (!showArchived) {
      filtered = filtered.filter(v => !v.isArchived)
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [versions, courseId, searchQuery, filterTag, showArchived])

  // Get all tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    versions.forEach(v => v.tags.forEach(tag => tags.add(tag)))
    return Array.from(tags)
  }, [versions])

  // Generate version comparison
  const generateComparison = useCallback((fromId: string, toId: string): VersionCompare | null => {
    const fromVersion = versions.find(v => v.id === fromId)
    const toVersion = versions.find(v => v.id === toId)
    
    if (!fromVersion || !toVersion) return null

    // Mock comparison logic - in real implementation, this would analyze actual content
    const changes: Change[] = [
      { type: 'added', section: 'Session 3', details: 'New React Hooks content added', lineNumber: 45 },
      { type: 'modified', section: 'Session 1', details: 'Introduction text updated', lineNumber: 12 },
      { type: 'removed', section: 'Session 4', details: 'Outdated examples removed', lineNumber: 78 }
    ]

    return {
      from: fromVersion,
      to: toVersion,
      changes,
      summary: {
        added: changes.filter(c => c.type === 'added').length,
        modified: changes.filter(c => c.type === 'modified').length,
        removed: changes.filter(c => c.type === 'removed').length
      }
    }
  }, [versions])

  // Handle version actions
  const handleStarVersion = useCallback((versionId: string) => {
    setVersions(prev => prev.map(v => 
      v.id === versionId ? { ...v, isStarred: !v.isStarred } : v
    ))
  }, [])

  const handleArchiveVersion = useCallback((versionId: string) => {
    setVersions(prev => prev.map(v => 
      v.id === versionId ? { ...v, isArchived: !v.isArchived } : v
    ))
  }, [])

  const handleRestoreVersion = useCallback((version: Version) => {
    onVersionRestore?.(version)
  }, [onVersionRestore])

  const handleDeleteVersion = useCallback((versionId: string) => {
    setVersions(prev => prev.filter(v => v.id !== versionId))
    onVersionDelete?.(versionId)
  }, [onVersionDelete])

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  // Get change type color
  const getChangeTypeColor = (type: Change['type']) => {
    switch (type) {
      case 'added': return 'text-green-600 bg-green-50'
      case 'modified': return 'text-blue-600 bg-blue-50'
      case 'removed': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get change type icon
  const getChangeTypeIcon = (type: Change['type']) => {
    switch (type) {
      case 'added': return Plus
      case 'modified': return Edit
      case 'removed': return Minus
      default: return FileText
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Version Control</h2>
          <p className="text-gray-500">Manage and track export versions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
          >
            {viewMode === 'list' ? <History className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            {viewMode === 'list' ? 'Timeline View' : 'List View'}
          </Button>
          
          <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Diff className="w-4 h-4 mr-2" />
                Compare Versions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Compare Versions</DialogTitle>
                <DialogDescription>
                  Select two versions to compare their differences
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Version</Label>
                  <Select 
                    value={selectedVersions[0] || ''} 
                    onValueChange={(value) => setSelectedVersions([value, selectedVersions[1]])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map(version => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.version} - {formatRelativeTime(version.createdAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>To Version</Label>
                  <Select 
                    value={selectedVersions[1] || ''} 
                    onValueChange={(value) => setSelectedVersions([selectedVersions[0], value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map(version => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.version} - {formatRelativeTime(version.createdAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedVersions[0] && selectedVersions[1] && (
                <div className="mt-6">
                  {(() => {
                    const comparison = generateComparison(selectedVersions[0], selectedVersions[1])
                    if (!comparison) return null
                    
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{comparison.summary.added}</div>
                            <div className="text-sm text-green-600">Added</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{comparison.summary.modified}</div>
                            <div className="text-sm text-blue-600">Modified</div>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{comparison.summary.removed}</div>
                            <div className="text-sm text-red-600">Removed</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {comparison.changes.map((change, index) => {
                            const ChangeIcon = getChangeTypeIcon(change.type)
                            return (
                              <div 
                                key={index}
                                className={`p-3 rounded-lg border ${getChangeTypeColor(change.type)}`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <ChangeIcon className="w-4 h-4" />
                                  <span className="font-medium capitalize">{change.type}</span>
                                  <span className="text-sm">in {change.section}</span>
                                  {change.lineNumber && (
                                    <Badge variant="outline" className="text-xs">
                                      Line {change.lineNumber}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm">{change.details}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search versions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label className="text-sm">Show Archived</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredVersions.map((version, index) => (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`${version.isArchived ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <GitBranch className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{version.version}</h3>
                          {version.isStarred && (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          )}
                          {version.isArchived && (
                            <Badge variant="outline">Archived</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{version.courseName}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(version.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {formatSize(version.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <Badge variant="outline" className="mb-2">
                          {version.format.toUpperCase()}
                        </Badge>
                        <div className="text-sm text-gray-500">{version.template}</div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(version.downloadUrl, '_blank')}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStarVersion(version.id)}>
                            <Star className="w-4 h-4 mr-2" />
                            {version.isStarred ? 'Unstar' : 'Star'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRestoreVersion(version)}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchiveVersion(version.id)}>
                            <Archive className="w-4 h-4 mr-2" />
                            {version.isArchived ? 'Unarchive' : 'Archive'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteVersion(version.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {version.description && (
                    <p className="text-sm text-gray-600 mb-4">{version.description}</p>
                  )}
                  
                  {/* Tags */}
                  <div className="flex items-center gap-2 mb-4">
                    {version.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="w-2 h-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Changes */}
                  {version.changes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Changes in this version:</h4>
                      <div className="space-y-1">
                        {version.changes.map((change, idx) => {
                          const ChangeIcon = getChangeTypeIcon(change.type)
                          return (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <ChangeIcon className={`w-3 h-3 ${
                                change.type === 'added' ? 'text-green-600' :
                                change.type === 'modified' ? 'text-blue-600' : 'text-red-600'
                              }`} />
                              <span className="text-gray-600">{change.details}</span>
                              <Badge variant="outline" className="text-xs">
                                {change.section}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredVersions.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center text-gray-500">
                <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No versions found</p>
                {searchQuery && (
                  <p className="text-sm mt-2">Try adjusting your search criteria</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}