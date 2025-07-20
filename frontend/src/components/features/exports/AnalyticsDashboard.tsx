'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  FileText, 
  Globe, 
  Archive,
  Clock,
  Users,
  Eye,
  Calendar,
  Filter,
  RefreshCw,
  Share2,
  Star,
  Target,
  Zap
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Mock data for analytics
const EXPORT_ANALYTICS = {
  overview: {
    totalExports: 1247,
    totalDownloads: 8934,
    totalShares: 2156,
    avgProcessingTime: 3.2,
    successRate: 94.5,
    totalStorage: 12400000000, // bytes
    activeUsers: 342,
    popularFormat: 'HTML'
  },
  timeSeriesData: [
    { date: '2024-01-01', exports: 45, downloads: 234, shares: 67 },
    { date: '2024-01-02', exports: 52, downloads: 287, shares: 78 },
    { date: '2024-01-03', exports: 38, downloads: 198, shares: 54 },
    { date: '2024-01-04', exports: 67, downloads: 345, shares: 89 },
    { date: '2024-01-05', exports: 71, downloads: 398, shares: 102 },
    { date: '2024-01-06', exports: 59, downloads: 312, shares: 87 },
    { date: '2024-01-07', exports: 83, downloads: 456, shares: 124 }
  ],
  formatDistribution: [
    { format: 'HTML', count: 456, percentage: 36.6, trend: 8.5 },
    { format: 'PDF', count: 387, percentage: 31.0, trend: -2.1 },
    { format: 'PowerPoint', count: 278, percentage: 22.3, trend: 12.3 },
    { format: 'Bundle', count: 126, percentage: 10.1, trend: 5.7 }
  ],
  templatePopularity: [
    { template: 'Modern Glass', usage: 342, rating: 4.8, exports: 25.2 },
    { template: 'Classic Elegant', usage: 289, rating: 4.6, exports: 21.3 },
    { template: 'Interactive Dynamic', usage: 234, rating: 4.9, exports: 17.2 },
    { template: 'Minimal Zen', usage: 198, rating: 4.4, exports: 14.6 },
    { template: 'Academic Research', usage: 184, rating: 4.7, exports: 13.5 }
  ],
  processingTimes: [
    { format: 'HTML', avgTime: 2.1, trend: -8.2 },
    { format: 'PDF', avgTime: 4.7, trend: -12.5 },
    { format: 'PowerPoint', avgTime: 3.8, trend: -5.3 },
    { format: 'Bundle', avgTime: 6.2, trend: -15.7 }
  ],
  userEngagement: {
    topCourses: [
      { id: '1', name: 'Advanced React Patterns', downloads: 1234, shares: 234, rating: 4.9 },
      { id: '2', name: 'Machine Learning Fundamentals', downloads: 987, shares: 187, rating: 4.7 },
      { id: '3', name: 'Data Structures & Algorithms', downloads: 856, shares: 156, rating: 4.8 },
      { id: '4', name: 'Python for Beginners', downloads: 743, shares: 134, rating: 4.6 },
      { id: '5', name: 'Web Development Bootcamp', downloads: 692, shares: 123, rating: 4.5 }
    ],
    downloadTrends: [
      { period: 'Last 7 days', downloads: 2156, change: 12.5 },
      { period: 'Last 30 days', downloads: 8934, change: 8.7 },
      { period: 'Last 90 days', downloads: 23456, change: 15.2 }
    ],
    shareAnalytics: {
      totalShares: 2156,
      emailShares: 1234,
      linkShares: 687,
      embedShares: 235,
      avgSharesPerExport: 1.7
    }
  }
}

interface AnalyticsDashboardProps {
  dateRange?: string
  onDateRangeChange?: (range: string) => void
}

export function AnalyticsDashboard({ 
  dateRange = 'last-30-days', 
  onDateRangeChange 
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setRefreshing(false)
  }

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get trend color
  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Get trend icon
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return TrendingUp
    if (trend < 0) return TrendingDown
    return TrendingUp
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Export Analytics</h2>
          <p className="text-gray-500">Insights into your export performance and usage patterns</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="last-year">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="formats">Formats</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Exports</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(EXPORT_ANALYTICS.overview.totalExports)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Download className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">+12.5% from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Downloads</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(EXPORT_ANALYTICS.overview.totalDownloads)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Eye className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">+8.7% from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {EXPORT_ANALYTICS.overview.successRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <Target className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">+3.2% improvement</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg Processing</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {EXPORT_ANALYTICS.overview.avgProcessingTime}m
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">-15.3% faster</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Interactive chart coming soon</p>
                    <p className="text-sm mt-2">
                      Showing export trends over {dateRange.replace('-', ' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Storage Used</span>
                    <span className="font-medium">{formatBytes(EXPORT_ANALYTICS.overview.totalStorage)}</span>
                  </div>
                  <div className="space-y-3">
                    {EXPORT_ANALYTICS.formatDistribution.map((format) => (
                      <div key={format.format} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm">{format.format}</span>
                        </div>
                        <span className="text-sm font-medium">{format.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Formats Tab */}
        <TabsContent value="formats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Format Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Format Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {EXPORT_ANALYTICS.formatDistribution.map((format) => {
                    const TrendIcon = getTrendIcon(format.trend)
                    return (
                      <div key={format.format} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {format.format === 'HTML' && <Globe className="w-4 h-4" />}
                              {format.format === 'PDF' && <FileText className="w-4 h-4" />}
                              {format.format === 'PowerPoint' && <FileText className="w-4 h-4" />}
                              {format.format === 'Bundle' && <Archive className="w-4 h-4" />}
                            </div>
                            <span className="font-medium">{format.format}</span>
                          </div>
                          <Badge variant="outline">{format.count} exports</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${format.percentage}%` }}
                            />
                          </div>
                          <div className={`flex items-center gap-1 text-sm ${getTrendColor(format.trend)}`}>
                            <TrendIcon className="w-3 h-3" />
                            {Math.abs(format.trend)}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Processing Times */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {EXPORT_ANALYTICS.processingTimes.map((item) => {
                    const TrendIcon = getTrendIcon(item.trend)
                    return (
                      <div key={item.format} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{item.format}</div>
                          <div className="text-sm text-gray-500">Avg processing time</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{item.avgTime}m</div>
                          <div className={`flex items-center gap-1 text-xs ${getTrendColor(item.trend)}`}>
                            <TrendIcon className="w-3 h-3" />
                            {Math.abs(item.trend)}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Popularity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {EXPORT_ANALYTICS.templatePopularity.map((template, index) => (
                  <motion.div
                    key={template.template}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                        <div>
                          <h3 className="font-medium">{template.template}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{template.usage} uses</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{template.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{template.exports}%</div>
                        <div className="text-sm text-gray-500">of total exports</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-amber-500 h-2 rounded-full" 
                        style={{ width: `${template.exports}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {EXPORT_ANALYTICS.userEngagement.topCourses.map((course, index) => (
                    <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                        <div>
                          <h4 className="font-medium text-sm">{course.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{course.downloads} downloads</span>
                            <span>{course.shares} shares</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-2 h-2 fill-amber-400 text-amber-400" />
                              <span>{course.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sharing Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Sharing Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {formatNumber(EXPORT_ANALYTICS.userEngagement.shareAnalytics.totalShares)}
                    </div>
                    <div className="text-sm text-gray-500">Total Shares</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Email Shares</span>
                      </div>
                      <span className="font-medium">
                        {formatNumber(EXPORT_ANALYTICS.userEngagement.shareAnalytics.emailShares)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Direct Links</span>
                      </div>
                      <span className="font-medium">
                        {formatNumber(EXPORT_ANALYTICS.userEngagement.shareAnalytics.linkShares)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">Embeds</span>
                      </div>
                      <span className="font-medium">
                        {formatNumber(EXPORT_ANALYTICS.userEngagement.shareAnalytics.embedShares)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Avg shares per export</span>
                      <span className="font-bold">
                        {EXPORT_ANALYTICS.userEngagement.shareAnalytics.avgSharesPerExport}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Download Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Download Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {EXPORT_ANALYTICS.userEngagement.downloadTrends.map((trend) => {
                  const TrendIcon = getTrendIcon(trend.change)
                  return (
                    <div key={trend.period} className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatNumber(trend.downloads)}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">{trend.period}</div>
                      <div className={`flex items-center justify-center gap-1 text-sm ${getTrendColor(trend.change)}`}>
                        <TrendIcon className="w-3 h-3" />
                        +{trend.change}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}