'use client'

import React, { useState } from 'react'
import { GenerationProgress } from './index'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Mock data for demonstration
const mockJobId = 'job_' + Math.random().toString(36).substr(2, 9)

export function GenerationProgressExample() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const startGeneration = () => {
    setJobId(mockJobId)
    setIsGenerating(true)
  }

  const handleComplete = (progress: any) => {
    console.log('Generation completed:', progress)
    setIsGenerating(false)
  }

  const handleError = (error: string) => {
    console.error('Generation error:', error)
    setIsGenerating(false)
  }

  const handleCancel = () => {
    console.log('Generation cancelled')
    setIsGenerating(false)
    setJobId(null)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">AI Generation Progress Interface</h1>
            <p className="text-muted-foreground">
              A comprehensive interface for tracking AI course generation with real-time updates,
              RAG context visualization, and live content preview.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Processing Pipeline</Badge>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Animated stage visualization</li>
                    <li>• Progress tracking with tips</li>
                    <li>• Error handling and retry</li>
                    <li>• Celebration animations</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Real-time Updates</Badge>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• WebSocket live connection</li>
                    <li>• Terminal-style log viewer</li>
                    <li>• Log filtering and search</li>
                    <li>• Export functionality</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">RAG Context</Badge>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Knowledge graph visualization</li>
                    <li>• Concept relationship mapping</li>
                    <li>• Relevance score tracking</li>
                    <li>• Interactive context explorer</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Live Preview</Badge>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Real-time content updates</li>
                    <li>• Multi-device preview</li>
                    <li>• Quality score indicators</li>
                    <li>• Session fade-in animations</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isGenerating ? (
                <Button onClick={startGeneration}>
                  Start Demo Generation
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleCancel}>
                  Cancel Generation
                </Button>
              )}
              
              <Button variant="outline" disabled={!jobId}>
                {jobId ? `Job: ${jobId}` : 'No active job'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Generation Progress Interface */}
      {jobId && (
        <GenerationProgress
          jobId={jobId}
          onComplete={handleComplete}
          onError={handleError}
          onCancel={handleCancel}
        />
      )}

      {/* Usage Instructions */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Usage Instructions</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Basic Implementation</h4>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`import { GenerationProgress } from '@/components/features/generation-progress'

function MyComponent() {
  const handleComplete = (progress) => {
    console.log('Generation completed:', progress)
  }

  const handleError = (error) => {
    console.error('Generation error:', error)
  }

  return (
    <GenerationProgress
      jobId="your-job-id"
      onComplete={handleComplete}
      onError={handleError}
      onCancel={() => router.push('/courses')}
    />
  )
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">WebSocket Configuration</h4>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`// Environment variables needed:
NEXT_PUBLIC_WS_URL=ws://localhost:3001

// Backend WebSocket endpoint should send:
{
  type: 'stage_update' | 'log' | 'rag_context' | 'preview_update' | 'complete' | 'error',
  data: {...},
  timestamp: Date
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Design System Integration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Uses Tailwind CSS with custom design system colors</li>
                <li>• Integrates with Shadcn/ui components (Button, Card, Badge, Input)</li>
                <li>• Supports dark/light mode theming</li>
                <li>• Responsive design with mobile-first approach</li>
                <li>• Framer Motion animations throughout</li>
                <li>• Accessibility compliant (WCAG 2.1 AA)</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default GenerationProgressExample