'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Check, 
  X, 
  AlertTriangle, 
  Eye, 
  Type, 
  Mouse, 
  Volume2,
  Contrast,
  Zap,
  RefreshCw,
  Download,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export interface AccessibilityIssue {
  id: string
  severity: 'error' | 'warning' | 'info'
  category: 'color' | 'typography' | 'navigation' | 'multimedia' | 'structure'
  title: string
  description: string
  element?: string
  suggestion: string
  wcagGuideline: string
  autoFixable: boolean
}

export interface AccessibilityReport {
  score: number
  totalIssues: number
  errors: AccessibilityIssue[]
  warnings: AccessibilityIssue[]
  info: AccessibilityIssue[]
  passed: AccessibilityIssue[]
  categories: {
    [K in AccessibilityIssue['category']]: {
      issues: number
      score: number
    }
  }
}

interface AccessibilityCheckerProps {
  designSettings: any
  onIssuesFix?: (issues: AccessibilityIssue[]) => void
  onReportGenerated?: (report: AccessibilityReport) => void
}

const WCAG_GUIDELINES = {
  'color-contrast': 'WCAG 2.1 AA - 1.4.3 Contrast (Minimum)',
  'focus-visible': 'WCAG 2.1 AA - 2.4.7 Focus Visible',
  'alt-text': 'WCAG 2.1 A - 1.1.1 Non-text Content',
  'heading-structure': 'WCAG 2.1 AA - 1.3.1 Info and Relationships',
  'keyboard-navigation': 'WCAG 2.1 AA - 2.1.1 Keyboard',
  'motion-preference': 'WCAG 2.1 AAA - 2.3.3 Animation from Interactions'
}

const CATEGORY_ICONS = {
  color: Contrast,
  typography: Type,
  navigation: Mouse,
  multimedia: Volume2,
  structure: Eye
}

export function AccessibilityChecker({ 
  designSettings, 
  onIssuesFix, 
  onReportGenerated 
}: AccessibilityCheckerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [report, setReport] = useState<AccessibilityReport | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Simulate accessibility scanning
  const performAccessibilityCheck = useCallback(async () => {
    setIsScanning(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    const issues: AccessibilityIssue[] = []

    // Color contrast checks
    const contrastRatio = calculateContrastRatio(designSettings.colors.text, designSettings.colors.background)
    if (contrastRatio < 4.5) {
      issues.push({
        id: 'contrast-main',
        severity: 'error',
        category: 'color',
        title: 'Insufficient Color Contrast',
        description: `Text color (#${designSettings.colors.text}) and background color (#${designSettings.colors.background}) have a contrast ratio of ${contrastRatio.toFixed(2)}:1`,
        suggestion: 'Use darker text or lighter background to achieve minimum 4.5:1 ratio',
        wcagGuideline: WCAG_GUIDELINES['color-contrast'],
        autoFixable: true
      })
    }

    // Typography checks
    if (designSettings.typography.size < 14) {
      issues.push({
        id: 'font-size-small',
        severity: 'warning',
        category: 'typography',
        title: 'Small Font Size',
        description: `Base font size is ${designSettings.typography.size}px, which may be difficult to read`,
        suggestion: 'Consider using a minimum of 14px for better readability',
        wcagGuideline: WCAG_GUIDELINES['heading-structure'],
        autoFixable: true
      })
    }

    // Animation checks
    if (designSettings.animations.enabled && !designSettings.animations.reduceMotion) {
      issues.push({
        id: 'motion-preference',
        severity: 'info',
        category: 'multimedia',
        title: 'Motion Preference Not Respected',
        description: 'Animations are enabled without checking for prefers-reduced-motion',
        suggestion: 'Add media query to respect user motion preferences',
        wcagGuideline: WCAG_GUIDELINES['motion-preference'],
        autoFixable: true
      })
    }

    // Navigation checks
    if (!designSettings.components.showNavigation) {
      issues.push({
        id: 'missing-navigation',
        severity: 'warning',
        category: 'navigation',
        title: 'No Navigation Menu',
        description: 'Course lacks a navigation menu for easy content access',
        suggestion: 'Enable navigation menu in component settings',
        wcagGuideline: WCAG_GUIDELINES['keyboard-navigation'],
        autoFixable: true
      })
    }

    // Structure checks
    if (!designSettings.components.showToc) {
      issues.push({
        id: 'missing-toc',
        severity: 'info',
        category: 'structure',
        title: 'No Table of Contents',
        description: 'Course would benefit from a table of contents for better navigation',
        suggestion: 'Enable table of contents in component settings',
        wcagGuideline: WCAG_GUIDELINES['heading-structure'],
        autoFixable: true
      })
    }

    // Generate report
    const newReport: AccessibilityReport = generateReport(issues)
    setReport(newReport)
    setIsScanning(false)
    
    onReportGenerated?.(newReport)
  }, [designSettings, onReportGenerated])

  // Calculate contrast ratio
  const calculateContrastRatio = (color1: string, color2: string): number => {
    // Simplified contrast calculation - in real implementation, use proper color conversion
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')
    
    const r1 = parseInt(hex1.substr(0, 2), 16)
    const g1 = parseInt(hex1.substr(2, 2), 16)
    const b1 = parseInt(hex1.substr(4, 2), 16)
    
    const r2 = parseInt(hex2.substr(0, 2), 16)
    const g2 = parseInt(hex2.substr(2, 2), 16)
    const b2 = parseInt(hex2.substr(4, 2), 16)
    
    const luminance1 = (0.299 * r1 + 0.587 * g1 + 0.114 * b1) / 255
    const luminance2 = (0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255
    
    const brighter = Math.max(luminance1, luminance2)
    const darker = Math.min(luminance1, luminance2)
    
    return (brighter + 0.05) / (darker + 0.05)
  }

  // Generate accessibility report
  const generateReport = (issues: AccessibilityIssue[]): AccessibilityReport => {
    const errors = issues.filter(issue => issue.severity === 'error')
    const warnings = issues.filter(issue => issue.severity === 'warning')
    const info = issues.filter(issue => issue.severity === 'info')
    
    const totalIssues = issues.length
    const maxScore = 100
    const scoreDeduction = errors.length * 20 + warnings.length * 10 + info.length * 5
    const score = Math.max(0, maxScore - scoreDeduction)

    const categories = issues.reduce((acc, issue) => {
      if (!acc[issue.category]) {
        acc[issue.category] = { issues: 0, score: 100 }
      }
      acc[issue.category].issues++
      acc[issue.category].score = Math.max(0, 100 - acc[issue.category].issues * 15)
      return acc
    }, {} as AccessibilityReport['categories'])

    return {
      score,
      totalIssues,
      errors,
      warnings,
      info,
      passed: [], // Would be populated with successful checks
      categories
    }
  }

  // Auto-fix issues
  const handleAutoFix = useCallback((issuesToFix: AccessibilityIssue[]) => {
    const fixableIssues = issuesToFix.filter(issue => issue.autoFixable)
    onIssuesFix?.(fixableIssues)
  }, [onIssuesFix])

  // Export report
  const handleExportReport = useCallback(() => {
    if (!report) return

    const reportData = {
      timestamp: new Date().toISOString(),
      score: report.score,
      summary: {
        total: report.totalIssues,
        errors: report.errors.length,
        warnings: report.warnings.length,
        info: report.info.length
      },
      issues: [...report.errors, ...report.warnings, ...report.info],
      recommendations: [
        'Fix all error-level issues for WCAG AA compliance',
        'Address warning-level issues for better accessibility',
        'Consider info-level suggestions for enhanced user experience'
      ]
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [report])

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }, [])

  // Memoized issue lists by category
  const issuesByCategory = useMemo(() => {
    if (!report) return {}
    
    const allIssues = [...report.errors, ...report.warnings, ...report.info]
    return allIssues.reduce((acc, issue) => {
      if (!acc[issue.category]) acc[issue.category] = []
      acc[issue.category].push(issue)
      return acc
    }, {} as Record<string, AccessibilityIssue[]>)
  }, [report])

  const getSeverityColor = (severity: AccessibilityIssue['severity']) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: AccessibilityIssue['severity']) => {
    switch (severity) {
      case 'error': return X
      case 'warning': return AlertTriangle
      case 'info': return Info
      default: return Check
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold">Accessibility Checker</h2>
            <p className="text-sm text-gray-500">WCAG 2.1 AA compliance analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {report && (
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          )}
          <Button 
            onClick={performAccessibilityCheck}
            disabled={isScanning}
            className="flex items-center gap-2"
          >
            {isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isScanning ? 'Scanning...' : 'Run Check'}
          </Button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {isScanning && (
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
                      <Shield className="w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">Analyzing Accessibility</h3>
                    <p className="text-sm text-gray-500">Checking WCAG 2.1 compliance...</p>
                  </div>
                  <Progress value={65} className="w-64 mx-auto" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {report && !isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Accessibility Score</span>
                  <Badge variant={report.score >= 90 ? "default" : report.score >= 70 ? "secondary" : "destructive"}>
                    {report.score >= 90 ? 'Excellent' : report.score >= 70 ? 'Good' : 'Needs Work'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(report.score)}`}>
                      {report.score}
                    </div>
                    <div className="text-sm text-gray-500">out of 100</div>
                  </div>
                  
                  <Progress value={report.score} className="w-full" />
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-red-600">{report.errors.length}</div>
                      <div className="text-xs text-gray-500">Errors</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">{report.warnings.length}</div>
                      <div className="text-xs text-gray-500">Warnings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{report.info.length}</div>
                      <div className="text-xs text-gray-500">Suggestions</div>
                    </div>
                  </div>

                  {report.errors.length > 0 && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleAutoFix(report.errors)}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Auto-fix {report.errors.filter(e => e.autoFixable).length} Issues
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Issues by Category */}
            <div className="space-y-4">
              {Object.entries(issuesByCategory).map(([category, issues]) => {
                const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
                const isExpanded = expandedCategories.has(category)
                
                return (
                  <Card key={category}>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <CardHeader 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleCategory(category)}
                        >
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <IconComponent className="w-5 h-5 text-gray-500" />
                              <span className="capitalize">{category}</span>
                              <Badge variant="outline" className="text-xs">
                                {issues.length} issues
                              </Badge>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {issues.map((issue) => {
                              const SeverityIcon = getSeverityIcon(issue.severity)
                              
                              return (
                                <div 
                                  key={issue.id}
                                  className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <SeverityIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">{issue.title}</h4>
                                        {issue.autoFixable && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleAutoFix([issue])}
                                          >
                                            <Zap className="w-3 h-3 mr-1" />
                                            Fix
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-sm mb-2">{issue.description}</p>
                                      <p className="text-sm font-medium mb-2">
                                        💡 {issue.suggestion}
                                      </p>
                                      <p className="text-xs opacity-75">{issue.wcagGuideline}</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}