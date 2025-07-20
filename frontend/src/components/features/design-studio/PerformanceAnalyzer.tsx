'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Gauge, 
  Zap, 
  Image as ImageIcon, 
  Code2, 
  Globe, 
  Smartphone,
  Wifi,
  HardDrive,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Settings,
  Monitor,
  Tablet
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor'
  description: string
  recommendation?: string
}

export interface PerformanceReport {
  overallScore: number
  deviceType: 'desktop' | 'mobile' | 'tablet'
  metrics: {
    loading: PerformanceMetric[]
    rendering: PerformanceMetric[]
    interactivity: PerformanceMetric[]
    accessibility: PerformanceMetric[]
    seo: PerformanceMetric[]
  }
  opportunities: Array<{
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
    savings: string
    complexity: 'easy' | 'medium' | 'hard'
  }>
  resources: {
    totalSize: number
    imageSize: number
    cssSize: number
    jsSize: number
    fontSize: number
    requestCount: number
  }
  coreWebVitals: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
  }
}

interface PerformanceAnalyzerProps {
  designSettings: any
  onOptimizationApplied?: (optimizations: string[]) => void
}

const DEVICE_CONFIGS = {
  desktop: { name: 'Desktop', icon: Monitor, connection: '4G' },
  tablet: { name: 'Tablet', icon: Tablet, connection: '4G' },
  mobile: { name: 'Mobile', icon: Smartphone, connection: '3G' }
}

export function PerformanceAnalyzer({ 
  designSettings, 
  onOptimizationApplied 
}: PerformanceAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<keyof typeof DEVICE_CONFIGS>('desktop')
  const [report, setReport] = useState<PerformanceReport | null>(null)

  // Simulate performance analysis
  const runPerformanceAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Generate mock performance data based on design settings
    const mockReport: PerformanceReport = generateMockReport(designSettings, selectedDevice)
    setReport(mockReport)
    setIsAnalyzing(false)
  }, [designSettings, selectedDevice])

  // Generate mock performance report
  const generateMockReport = (settings: any, device: string): PerformanceReport => {
    const baseScore = 85
    let scoreModifier = 0

    // Adjust score based on settings
    if (settings.animations.enabled) scoreModifier -= 5
    if (settings.customCSS.length > 1000) scoreModifier -= 10
    if (!settings.components.showProgress) scoreModifier += 5
    if (device === 'mobile') scoreModifier -= 15

    const overallScore = Math.max(0, Math.min(100, baseScore + scoreModifier))

    return {
      overallScore,
      deviceType: device as any,
      metrics: {
        loading: [
          {
            name: 'First Contentful Paint',
            value: device === 'mobile' ? 2.1 : 1.3,
            unit: 's',
            status: device === 'mobile' ? 'needs-improvement' : 'good',
            description: 'Time when the first text or image is painted'
          },
          {
            name: 'Largest Contentful Paint',
            value: device === 'mobile' ? 3.4 : 2.1,
            unit: 's',
            status: device === 'mobile' ? 'poor' : 'good',
            description: 'Time when the largest text or image is painted'
          },
          {
            name: 'Time to Interactive',
            value: device === 'mobile' ? 4.2 : 2.8,
            unit: 's',
            status: device === 'mobile' ? 'needs-improvement' : 'good',
            description: 'Time when the page becomes fully interactive'
          }
        ],
        rendering: [
          {
            name: 'Cumulative Layout Shift',
            value: settings.animations.enabled ? 0.15 : 0.05,
            unit: '',
            status: settings.animations.enabled ? 'needs-improvement' : 'excellent',
            description: 'Visual stability of the page'
          },
          {
            name: 'Total Blocking Time',
            value: 180,
            unit: 'ms',
            status: 'good',
            description: 'Total time between FCP and TTI where tasks blocked the main thread'
          }
        ],
        interactivity: [
          {
            name: 'First Input Delay',
            value: 45,
            unit: 'ms',
            status: 'excellent',
            description: 'Time from first user interaction to browser response'
          }
        ],
        accessibility: [
          {
            name: 'Color Contrast',
            value: 4.2,
            unit: ':1',
            status: 'good',
            description: 'Text to background color contrast ratio'
          }
        ],
        seo: [
          {
            name: 'Meta Description',
            value: 1,
            unit: '',
            status: 'excellent',
            description: 'Page has a meta description'
          }
        ]
      },
      opportunities: [
        {
          title: 'Optimize Images',
          description: 'Serve images in next-gen formats and compress properly',
          impact: 'high',
          savings: '1.2s',
          complexity: 'easy'
        },
        {
          title: 'Minimize CSS',
          description: 'Remove unused CSS and minify the remaining styles',
          impact: 'medium',
          savings: '0.3s',
          complexity: 'easy'
        },
        {
          title: 'Reduce Animation Complexity',
          description: 'Simplify animations to improve performance',
          impact: settings.animations.enabled ? 'medium' : 'low',
          savings: '0.5s',
          complexity: 'medium'
        }
      ],
      resources: {
        totalSize: 2400,
        imageSize: 800,
        cssSize: 320,
        jsSize: 1100,
        fontSize: 180,
        requestCount: 12
      },
      coreWebVitals: {
        lcp: device === 'mobile' ? 3.4 : 2.1,
        fid: 45,
        cls: settings.animations.enabled ? 0.15 : 0.05
      }
    }
  }

  // Apply optimizations
  const applyOptimizations = useCallback((optimizations: string[]) => {
    onOptimizationApplied?.(optimizations)
  }, [onOptimizationApplied])

  // Export report
  const exportReport = useCallback(() => {
    if (!report) return

    const reportData = {
      timestamp: new Date().toISOString(),
      device: selectedDevice,
      score: report.overallScore,
      coreWebVitals: report.coreWebVitals,
      metrics: report.metrics,
      opportunities: report.opportunities,
      resources: report.resources
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${selectedDevice}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [report, selectedDevice])

  // Get status color
  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'
      case 'needs-improvement': return 'text-amber-600 bg-amber-50'
      case 'poor': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-amber-100 text-amber-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gauge className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold">Performance Analyzer</h2>
            <p className="text-sm text-gray-500">Web performance and optimization insights</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Device Selection */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {Object.entries(DEVICE_CONFIGS).map(([key, config]) => {
              const IconComponent = config.icon
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDevice(key as any)}
                  className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    selectedDevice === key 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {config.name}
                </button>
              )
            })}
          </div>

          {report && (
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
          
          <Button 
            onClick={runPerformanceAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
      </div>

      {/* Analysis Progress */}
      <AnimatePresence mode="wait">
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Gauge className="w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">Running Performance Analysis</h3>
                    <p className="text-sm text-gray-500">Testing on {DEVICE_CONFIGS[selectedDevice].name.toLowerCase()} device...</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Loading Performance</span>
                      <span>Analyzing...</span>
                    </div>
                    <Progress value={75} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {report && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Performance Score</span>
                  <Badge variant={report.overallScore >= 90 ? "default" : report.overallScore >= 75 ? "secondary" : "destructive"}>
                    {selectedDevice} · {DEVICE_CONFIGS[selectedDevice].connection}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className={`text-5xl font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}
                  </div>
                  <Progress value={report.overallScore} className="w-full" />
                  
                  {/* Core Web Vitals */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-500">LCP</div>
                      <div className={`text-xl font-bold ${report.coreWebVitals.lcp <= 2.5 ? 'text-green-600' : 'text-red-600'}`}>
                        {report.coreWebVitals.lcp}s
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-500">FID</div>
                      <div className={`text-xl font-bold ${report.coreWebVitals.fid <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {report.coreWebVitals.fid}ms
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-500">CLS</div>
                      <div className={`text-xl font-bold ${report.coreWebVitals.cls <= 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                        {report.coreWebVitals.cls}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Metrics */}
            <Tabs defaultValue="metrics" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="space-y-4">
                {Object.entries(report.metrics).map(([category, metrics]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-base capitalize">{category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {metrics.map((metric, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{metric.name}</span>
                                <Badge variant="outline" className={getStatusColor(metric.status)}>
                                  {metric.status.replace('-', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">{metric.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                {metric.value}{metric.unit}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="opportunities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Optimization Opportunities</span>
                      <Button 
                        size="sm"
                        onClick={() => applyOptimizations(report.opportunities.map(o => o.title))}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Apply All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {report.opportunities.map((opportunity, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{opportunity.title}</h4>
                                <Badge className={getImpactColor(opportunity.impact)}>
                                  {opportunity.impact} impact
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-green-600">
                                  <TrendingUp className="w-3 h-3" />
                                  Save {opportunity.savings}
                                </span>
                                <span className="text-gray-500">
                                  {opportunity.complexity} to implement
                                </span>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => applyOptimizations([opportunity.title])}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Resource Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">Images</span>
                          </div>
                          <span className="text-sm font-medium">{report.resources.imageSize} KB</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm">JavaScript</span>
                          </div>
                          <span className="text-sm font-medium">{report.resources.jsSize} KB</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-purple-500" />
                            <span className="text-sm">CSS</span>
                          </div>
                          <span className="text-sm font-medium">{report.resources.cssSize} KB</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-amber-500" />
                            <span className="text-sm">Fonts</span>
                          </div>
                          <span className="text-sm font-medium">{report.resources.fontSize} KB</span>
                        </div>
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center justify-between font-medium">
                            <span>Total Size</span>
                            <span>{report.resources.totalSize} KB</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Network Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            {report.resources.requestCount}
                          </div>
                          <div className="text-sm text-gray-500">HTTP Requests</div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Cache Hit Rate</span>
                            <span className="text-green-600">78%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Compression</span>
                            <span className="text-green-600">Enabled</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>HTTP/2</span>
                            <span className="text-green-600">Supported</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}