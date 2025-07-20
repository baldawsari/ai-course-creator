'use client'

import { useState } from 'react'
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  X, 
  User, 
  Settings, 
  Shield, 
  CreditCard,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye
} from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface ChangeHistoryProps {
  onClose: () => void
}

const CHANGE_HISTORY = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    action: 'Profile Updated',
    category: 'profile',
    user: {
      name: 'John Doe',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: 'Email', oldValue: 'john@oldcompany.com', newValue: 'john@newcompany.com' },
      { field: 'Job Title', oldValue: 'Manager', newValue: 'Senior Manager' }
    ],
    severity: 'info',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: '2',
    timestamp: '2024-01-15T09:15:00Z',
    action: 'Password Changed',
    category: 'security',
    user: {
      name: 'John Doe',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: 'Password', oldValue: '••••••••', newValue: '••••••••' }
    ],
    severity: 'warning',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: '3',
    timestamp: '2024-01-14T16:45:00Z',
    action: 'Team Member Invited',
    category: 'organization',
    user: {
      name: 'John Doe',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: 'Email', oldValue: null, newValue: 'sarah@company.com' },
      { field: 'Role', oldValue: null, newValue: 'Editor' }
    ],
    severity: 'success',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: '4',
    timestamp: '2024-01-14T14:20:00Z',
    action: 'Billing Plan Updated',
    category: 'billing',
    user: {
      name: 'John Doe',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: 'Plan', oldValue: 'Starter', newValue: 'Professional' },
      { field: 'Billing Cycle', oldValue: 'Monthly', newValue: 'Annual' }
    ],
    severity: 'info',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: '5',
    timestamp: '2024-01-14T11:30:00Z',
    action: 'API Key Generated',
    category: 'security',
    user: {
      name: 'Jane Smith',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: 'API Key', oldValue: null, newValue: 'sk-••••••••••••4a3f' },
      { field: 'Permissions', oldValue: null, newValue: 'Read, Write' }
    ],
    severity: 'warning',
    ipAddress: '10.0.1.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  {
    id: '6',
    timestamp: '2024-01-13T15:45:00Z',
    action: 'Notification Preferences Updated',
    category: 'profile',
    user: {
      name: 'John Doe',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: 'Email Notifications', oldValue: 'Enabled', newValue: 'Disabled' },
      { field: 'Weekly Digest', oldValue: 'Disabled', newValue: 'Enabled' }
    ],
    severity: 'info',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  },
  {
    id: '7',
    timestamp: '2024-01-13T09:20:00Z',
    action: 'Integration Connected',
    category: 'integrations',
    user: {
      name: 'Mike Johnson',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: 'Service', oldValue: null, newValue: 'Google Classroom' },
      { field: 'Status', oldValue: null, newValue: 'Connected' }
    ],
    severity: 'success',
    ipAddress: '172.16.0.25',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: '8',
    timestamp: '2024-01-12T13:10:00Z',
    action: 'Two-Factor Authentication Enabled',
    category: 'security',
    user: {
      name: 'John Doe',
      avatar: '/api/placeholder/32/32'
    },
    changes: [
      { field: '2FA Status', oldValue: 'Disabled', newValue: 'Enabled' },
      { field: 'Method', oldValue: null, newValue: 'Authenticator App' }
    ],
    severity: 'success',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  }
]

const CATEGORIES = [
  { value: 'all', label: 'All Categories', icon: History },
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'organization', label: 'Organization', icon: Settings },
  { value: 'billing', label: 'Billing', icon: CreditCard },
  { value: 'integrations', label: 'Integrations', icon: Settings }
]

export function ChangeHistory({ onClose }: ChangeHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTimeframe, setSelectedTimeframe] = useState('7days')
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)

  const filteredHistory = CHANGE_HISTORY.filter(entry => {
    const matchesSearch = entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.user.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory
    
    // Filter by timeframe
    const entryDate = new Date(entry.timestamp)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    
    let matchesTimeframe = true
    if (selectedTimeframe === '24hours') matchesTimeframe = daysDiff === 0
    else if (selectedTimeframe === '7days') matchesTimeframe = daysDiff <= 7
    else if (selectedTimeframe === '30days') matchesTimeframe = daysDiff <= 30
    
    return matchesSearch && matchesCategory && matchesTimeframe
  })

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const config = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800'
    }
    return <Badge className={config[severity as keyof typeof config] || config.info}>{severity}</Badge>
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  const exportHistory = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'User', 'Category', 'Changes', 'IP Address'].join(','),
      ...filteredHistory.map(entry => [
        entry.timestamp,
        entry.action,
        entry.user.name,
        entry.category,
        entry.changes.map(c => `${c.field}: ${c.oldValue || 'null'} → ${c.newValue}`).join('; '),
        entry.ipAddress
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `change-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const selectedHistoryEntry = selectedEntry ? CHANGE_HISTORY.find(entry => entry.id === selectedEntry) : null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Change History
          </DialogTitle>
          <DialogDescription>
            View all changes made to your account and organization settings
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 py-4 border-b">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search changes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24hours">Last 24 hours</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportHistory} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No changes found matching your criteria</p>
            </div>
          ) : (
            filteredHistory.map((entry) => (
              <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={entry.user.avatar} />
                      <AvatarFallback>
                        {entry.user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(entry.severity)}
                        <h4 className="font-medium truncate">{entry.action}</h4>
                        {getSeverityBadge(entry.severity)}
                        <Badge variant="outline" className="text-xs">
                          {entry.category}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        By {entry.user.name} • {formatTimestamp(entry.timestamp)}
                      </div>
                      
                      <div className="space-y-1">
                        {entry.changes.slice(0, 2).map((change, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{change.field}:</span>
                            {change.oldValue && (
                              <span className="text-red-600 line-through ml-1">{change.oldValue}</span>
                            )}
                            <span className="text-green-600 ml-1">{change.newValue}</span>
                          </div>
                        ))}
                        {entry.changes.length > 2 && (
                          <div className="text-sm text-muted-foreground">
                            +{entry.changes.length - 2} more changes
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                        <div>IP: {entry.ipAddress}</div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedEntry(entry.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Modal */}
        {selectedHistoryEntry && (
          <Dialog open onOpenChange={() => setSelectedEntry(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getSeverityIcon(selectedHistoryEntry.severity)}
                  {selectedHistoryEntry.action}
                </DialogTitle>
                <DialogDescription>
                  Detailed view of this change
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">User</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={selectedHistoryEntry.user.avatar} />
                        <AvatarFallback className="text-xs">
                          {selectedHistoryEntry.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{selectedHistoryEntry.user.name}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Timestamp</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(selectedHistoryEntry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">IP Address</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedHistoryEntry.ipAddress}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        {selectedHistoryEntry.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-sm font-medium">Changes Made</Label>
                  <div className="mt-2 space-y-2">
                    {selectedHistoryEntry.changes.map((change, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="font-medium text-sm mb-1">{change.field}</div>
                        <div className="text-sm">
                          {change.oldValue ? (
                            <div className="space-y-1">
                              <div className="text-red-600">
                                <span className="font-medium">Old:</span> {change.oldValue}
                              </div>
                              <div className="text-green-600">
                                <span className="font-medium">New:</span> {change.newValue}
                              </div>
                            </div>
                          ) : (
                            <div className="text-green-600">
                              <span className="font-medium">Added:</span> {change.newValue}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-sm font-medium">User Agent</Label>
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {selectedHistoryEntry.userAgent}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}