'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  FileText, 
  Share2, 
  BarChart3, 
  History, 
  Settings, 
  Search, 
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  Calendar,
  Clock,
  FileIcon,
  Users,
  TrendingUp,
  TrendingDown,
  Archive,
  GitBranch,
  Zap,
  Globe,
  Mail,
  QrCode,
  Code,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { AnalyticsDashboard } from '@/components/features/exports/AnalyticsDashboard'
import { DistributionCenter } from '@/components/features/exports/DistributionCenter'
import { VersionControl } from '@/components/features/exports/VersionControl'

// Types
interface ExportJob {
  id: string
  courseId: string
  courseName: string
  format: 'html' | 'pdf' | 'ppt' | 'bundle'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  size?: number
  downloadUrl?: string
  createdAt: Date
  completedAt?: Date
  version: string
  template: string
  settings: any
  shares: number
  downloads: number
}

interface ExportStats {
  totalExports: number
  activeJobs: number
  completedToday: number
  totalSize: number
  avgProcessingTime: number
  successRate: number
}

// Mock data
const MOCK_ACTIVE_EXPORTS: ExportJob[] = [
  {
    id: 'exp_001',
    courseId: 'course_001',
    courseName: 'Introduction to React Development',
    format: 'html',
    status: 'processing',
    progress: 67,
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    version: '1.2.0',
    template: 'modern-glass',
    settings: {},
    shares: 0,
    downloads: 0
  },
  {
    id: 'exp_002',
    courseId: 'course_002',
    courseName: 'Advanced JavaScript Patterns',
    format: 'pdf',
    status: 'processing',
    progress: 34,
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
    version: '2.1.0',
    template: 'classic-elegant',
    settings: {},
    shares: 0,
    downloads: 0
  },
  {
    id: 'exp_003',
    courseId: 'course_003',
    courseName: 'Python for Data Science',
    format: 'bundle',
    status: 'pending',
    progress: 0,
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    version: '1.0.0',
    template: 'interactive-dynamic',
    settings: {},
    shares: 0,
    downloads: 0
  }
]

const MOCK_EXPORT_HISTORY: ExportJob[] = [
  {
    id: 'exp_004',
    courseId: 'course_001',
    courseName: 'Introduction to React Development',
    format: 'html',
    status: 'completed',
    progress: 100,
    size: 2400000, // 2.29 MB
    downloadUrl: 'https://example.com/exports/exp_004.zip',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 3 * 60 * 1000),
    version: '1.1.0',
    template: 'modern-glass',
    settings: {},
    shares: 12,
    downloads: 45
  },
  {
    id: 'exp_005',
    courseId: 'course_002',
    courseName: 'Advanced JavaScript Patterns',
    format: 'pdf',
    status: 'completed',
    progress: 100,
    size: 1800000,
    downloadUrl: 'https://example.com/exports/exp_005.pdf',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 4 * 60 * 1000),
    version: '2.0.0',
    template: 'classic-elegant',
    settings: {},
    shares: 8,
    downloads: 23
  },
  {
    id: 'exp_006',
    courseId: 'course_004',
    courseName: 'Machine Learning Fundamentals',
    format: 'ppt',
    status: 'failed',
    progress: 0,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    version: '1.0.0',
    template: 'academic-research',
    settings: {},
    shares: 0,
    downloads: 0
  }
]

const MOCK_STATS: ExportStats = {
  totalExports: 127,
  activeJobs: 3,
  completedToday: 8,
  totalSize: 45600000,
  avgProcessingTime: 3.2,
  successRate: 94.5
}

export default function ExportsPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const [selectedExports, setSelectedExports] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Combine active and history exports
  const allExports = useMemo(() => [...MOCK_ACTIVE_EXPORTS, ...MOCK_EXPORT_HISTORY], [])

  // Filter and sort exports
  const filteredExports = useMemo(() => {
    let filtered = allExports

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(exp => 
        exp.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(exp => exp.status === statusFilter)
    }

    // Format filter
    if (formatFilter !== 'all') {
      filtered = filtered.filter(exp => exp.format === formatFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof ExportJob]
      let bValue = b[sortBy as keyof ExportJob]

      if (aValue instanceof Date && bValue instanceof Date) {
        aValue = aValue.getTime()
        bValue = bValue.getTime()
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    return filtered
  }, [allExports, searchQuery, statusFilter, formatFilter, sortBy, sortOrder])

  // Handle export selection
  const handleExportSelect = useCallback((exportId: string, checked: boolean) => {
    setSelectedExports(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(exportId)
      } else {
        newSet.delete(exportId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const allIds = filteredExports.map(exp => exp.id)
    setSelectedExports(new Set(allIds))
  }, [filteredExports])

  const handleDeselectAll = useCallback(() => {
    setSelectedExports(new Set())
  }, [])

  // Export actions
  const handleCancelExport = useCallback((exportId: string) => {
    console.log('Cancelling export:', exportId)
  }, [])

  const handleRetryExport = useCallback((exportId: string) => {
    console.log('Retrying export:', exportId)
  }, [])

  const handleDeleteExport = useCallback((exportId: string) => {
    console.log('Deleting export:', exportId)
  }, [])

  const handleDownload = useCallback((export_: ExportJob) => {
    if (export_.downloadUrl) {
      window.open(export_.downloadUrl, '_blank')
    }
  }, [])

  // Batch actions
  const handleBatchDelete = useCallback(() => {
    console.log('Batch deleting:', Array.from(selectedExports))
    setSelectedExports(new Set())
  }, [selectedExports])

  const handleBatchDownload = useCallback(() => {
    console.log('Batch downloading:', Array.from(selectedExports))
  }, [selectedExports])

  // Get status icon
  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'processing': return Loader2
      case 'pending': return Clock
      case 'failed': return XCircle
      case 'cancelled': return XCircle
      default: return AlertCircle
    }
  }

  // Get status color
  const getStatusColor = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'processing': return 'text-blue-600 bg-blue-50'
      case 'pending': return 'text-amber-600 bg-amber-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'cancelled': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get format icon
  const getFormatIcon = (format: ExportJob['format']) => {
    switch (format) {
      case 'html': return Globe
      case 'pdf': return FileText
      case 'ppt': return FileIcon
      case 'bundle': return Archive
      default: return FileIcon
    }
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Export Hub</h1>
          <p className="text-gray-500">Manage and track your course exports</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-amber-500">
            <Download className="w-4 h-4" />
            New Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Exports</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{MOCK_STATS.totalExports}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{MOCK_STATS.activeJobs}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-600">Avg: {MOCK_STATS.avgProcessingTime}m</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{MOCK_STATS.successRate}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">+3% improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Size</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSize(MOCK_STATS.totalSize)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Archive className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">Optimized storage</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Versions
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6" data-testid="dashboard-tab-content">
          {/* Active Exports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600" />
                Active Exports
                <Badge variant="outline">{MOCK_ACTIVE_EXPORTS.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {MOCK_ACTIVE_EXPORTS.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active exports</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {MOCK_ACTIVE_EXPORTS.map((export_) => {
                    const FormatIcon = getFormatIcon(export_.format)
                    const StatusIcon = getStatusIcon(export_.status)
                    
                    return (
                      <motion.div
                        key={export_.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <FormatIcon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white" data-testid={`active-export-${export_.id}`}>{export_.courseName}</h3>
                              <p className="text-sm text-gray-500">{export_.format.toUpperCase()} • {export_.template}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(export_.status)} data-testid={`status-badge-${export_.status}`}>
                              <StatusIcon className={`w-3 h-3 mr-1 ${export_.status === 'processing' ? 'animate-spin' : ''}`} />
                              {export_.status}
                            </Badge>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleCancelExport(export_.id)}>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRetryExport(export_.id)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Retry
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteExport(export_.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">{export_.progress}%</span>
                          </div>
                          <Progress value={export_.progress} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Started {formatRelativeTime(export_.createdAt)}</span>
                            <span>Version {export_.version}</span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Completed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Recent Completed
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_EXPORT_HISTORY.filter(exp => exp.status === 'completed').slice(0, 3).map((export_) => {
                  const FormatIcon = getFormatIcon(export_.format)
                  
                  return (
                    <div key={export_.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FormatIcon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{export_.courseName}</h4>
                          <p className="text-xs text-gray-500">
                            {formatSize(export_.size || 0)} • {formatRelativeTime(export_.completedAt!)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm">
                          <p className="text-gray-900 dark:text-white">{export_.downloads} downloads</p>
                          <p className="text-gray-500 text-xs">{export_.shares} shares</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(export_)}>
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6" data-testid="history-tab-content">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search exports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="exports-search"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32" data-testid="status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={formatFilter} onValueChange={setFormatFilter}>
                    <SelectTrigger className="w-32" data-testid="format-filter">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Formats</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="ppt">PowerPoint</SelectItem>
                      <SelectItem value="bundle">Bundle</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Batch Actions */}
              {selectedExports.size > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {selectedExports.size} export{selectedExports.size === 1 ? '' : 's'} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleBatchDownload}>
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBatchDelete} className="text-red-600">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Export History</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Clear All
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredExports.map((export_) => {
                  const FormatIcon = getFormatIcon(export_.format)
                  const StatusIcon = getStatusIcon(export_.status)
                  const isSelected = selectedExports.has(export_.id)
                  
                  return (
                    <motion.div
                      key={export_.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleExportSelect(export_.id, checked as boolean)}
                        />
                        
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FormatIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white">{export_.courseName}</h3>
                            <Badge className={getStatusColor(export_.status)} data-testid={`status-badge-${export_.status}`}>
                              <StatusIcon className={`w-3 h-3 mr-1 ${export_.status === 'processing' ? 'animate-spin' : ''}`} />
                              {export_.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{export_.format.toUpperCase()}</span>
                            <span>•</span>
                            <span>{export_.template}</span>
                            <span>•</span>
                            <span>v{export_.version}</span>
                            {export_.size && (
                              <>
                                <span>•</span>
                                <span>{formatSize(export_.size)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-900 dark:text-white mb-1">
                            {export_.downloads} downloads
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatRelativeTime(export_.createdAt)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {export_.downloadUrl && (
                            <Button variant="outline" size="sm" onClick={() => handleDownload(export_)}>
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Share2 className="w-3 h-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <GitBranch className="w-4 h-4 mr-2" />
                                View Versions
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteExport(export_.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              
              {filteredExports.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No exports found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6" data-testid="analytics-tab-content">
          <AnalyticsDashboard />
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6" data-testid="distribution-tab-content">
          <DistributionCenter />
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-6" data-testid="versions-tab-content">
          <VersionControl 
            onVersionRestore={(version) => {
              console.log('Restoring version:', version)
              // Implementation for version restore
            }}
            onVersionDelete={(versionId) => {
              console.log('Deleting version:', versionId)
              // Implementation for version delete
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}