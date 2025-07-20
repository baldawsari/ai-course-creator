'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isDetailsOpen: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReportBug = () => {
    const { error, errorInfo } = this.state
    const errorReport = {
      error: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // In a real app, you would send this to your error reporting service
    console.log('Error report:', errorReport)
    
    // For demo purposes, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('Error details copied to clipboard'))
      .catch(() => console.log('Could not copy error details'))
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo } = this.state

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="text-center space-y-4">
                <motion.div
                  className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </motion.div>
                
                <div>
                  <CardTitle className="text-2xl text-red-900 dark:text-red-100">
                    Oops! Something went wrong
                  </CardTitle>
                  <p className="text-red-700 dark:text-red-300 mt-2">
                    We encountered an unexpected error. Don't worry, this has been logged and we'll fix it soon.
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Error Summary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      Error Type
                    </Badge>
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {error?.name || 'Unknown Error'}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                      {error?.message || 'An unexpected error occurred'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={this.handleRetry}
                    className="gap-2"
                    size="lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={this.handleGoHome}
                    className="gap-2"
                    size="lg"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={this.handleReportBug}
                    className="gap-2"
                    size="lg"
                  >
                    <Bug className="w-4 h-4" />
                    Report Issue
                  </Button>
                </div>

                {/* Technical Details (Collapsible) */}
                {(error?.stack || errorInfo?.componentStack) && (
                  <Collapsible
                    open={this.state.isDetailsOpen}
                    onOpenChange={(isOpen) => this.setState({ isDetailsOpen: isOpen })}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between text-sm"
                        size="sm"
                      >
                        <span>Technical Details</span>
                        {this.state.isDetailsOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-3">
                      {error?.stack && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Error Stack:
                          </h4>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-32 font-mono text-gray-600 dark:text-gray-400">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Component Stack:
                          </h4>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-32 font-mono text-gray-600 dark:text-gray-400">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Help Text */}
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t">
                  <p>
                    If this problem persists, please contact support with the error details above.
                  </p>
                  <p className="mt-1">
                    Error ID: {Date.now().toString(36)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}