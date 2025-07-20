'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Network, 
  FileText, 
  Brain, 
  Layers, 
  Search, 
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  Download,
  Info,
  TrendingUp,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react'
import { 
  RAGContext, 
  KnowledgeGraph, 
  KnowledgeGraphNode, 
  KnowledgeGraphEdge,
  RAGRelationship 
} from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface RAGContextViewerProps {
  contexts: RAGContext[]
  knowledgeGraph?: KnowledgeGraph
  className?: string
}

interface GraphViewProps {
  graph: KnowledgeGraph
  selectedNodeId?: string
  onNodeSelect: (nodeId: string | undefined) => void
  isFullscreen: boolean
}

function ConceptCard({ context, isSelected, onClick }: {
  context: RAGContext
  isSelected: boolean
  onClick: () => void
}) {
  const relevanceColor = context.relevanceScore >= 0.8 ? 'text-green-500' :
                        context.relevanceScore >= 0.6 ? 'text-yellow-500' :
                        'text-orange-500'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 rounded-lg border",
        isSelected ? 
          "ring-2 ring-primary border-primary bg-primary/5" : 
          "border-border hover:border-primary/50 bg-card"
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {context.type === 'concept' && <Brain className="h-4 w-4 text-purple-500" />}
            {context.type === 'chunk' && <Layers className="h-4 w-4 text-blue-500" />}
            {context.type === 'document' && <FileText className="h-4 w-4 text-green-500" />}
            <span className="font-medium text-sm capitalize">{context.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className={cn("h-3 w-3", relevanceColor)} />
            <span className={cn("text-xs font-medium", relevanceColor)}>
              {Math.round(context.relevanceScore * 100)}%
            </span>
          </div>
        </div>

        <div className="text-sm text-foreground line-clamp-3">
          {context.content}
        </div>

        {context.sourceDocument && (
          <div className="text-xs text-muted-foreground truncate">
            Source: {context.sourceDocument}
            {context.chunkIndex !== undefined && ` (chunk ${context.chunkIndex})`}
          </div>
        )}

        {context.extractedConcepts && context.extractedConcepts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {context.extractedConcepts.slice(0, 3).map((concept, index) => (
              <Badge key={index} variant="outline" className="text-xs h-5 px-1">
                {concept}
              </Badge>
            ))}
            {context.extractedConcepts.length > 3 && (
              <Badge variant="outline" className="text-xs h-5 px-1">
                +{context.extractedConcepts.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RelationshipsList({ 
  relationships, 
  onRelationshipClick 
}: {
  relationships: RAGRelationship[]
  onRelationshipClick: (rel: RAGRelationship) => void
}) {
  const relationshipColors = {
    semantic: 'text-blue-500 bg-blue-500/10',
    hierarchical: 'text-green-500 bg-green-500/10',
    contextual: 'text-purple-500 bg-purple-500/10'
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Network className="h-4 w-4" />
        Relationships ({relationships.length})
      </h4>
      
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {relationships.map((rel, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onRelationshipClick(rel)}
            className="cursor-pointer rounded border p-2 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs h-5 px-2", relationshipColors[rel.type])}
                >
                  {rel.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {rel.source} → {rel.target}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(rel.strength * 100)}%
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function GraphVisualization({ 
  graph, 
  selectedNodeId, 
  onNodeSelect, 
  isFullscreen 
}: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })

  // Simulate basic force-directed layout
  const simulatedGraph = useMemo(() => {
    if (!graph.nodes.length) return { nodes: [], edges: [] }

    const width = dimensions.width
    const height = dimensions.height
    const centerX = width / 2
    const centerY = height / 2

    // Position nodes in a circular layout for simplicity
    const nodes = graph.nodes.map((node, index) => {
      const angle = (index / graph.nodes.length) * 2 * Math.PI
      const radius = Math.min(width, height) * 0.3
      
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      }
    })

    return { nodes, edges: graph.edges }
  }, [graph, dimensions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Draw edges
    simulatedGraph.edges.forEach(edge => {
      const sourceNode = simulatedGraph.nodes.find(n => n.id === edge.source)
      const targetNode = simulatedGraph.nodes.find(n => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.x!, sourceNode.y!)
        ctx.lineTo(targetNode.x!, targetNode.y!)
        ctx.strokeStyle = edge.color || '#666'
        ctx.lineWidth = edge.weight * 3
        ctx.globalAlpha = 0.6
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    })

    // Draw nodes
    simulatedGraph.nodes.forEach(node => {
      const isSelected = node.id === selectedNodeId
      
      ctx.beginPath()
      ctx.arc(node.x!, node.y!, node.size, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? '#3b82f6' : node.color
      ctx.fill()
      
      if (isSelected) {
        ctx.strokeStyle = '#1d4ed8'
        ctx.lineWidth = 3
        ctx.stroke()
      }
      
      // Draw label
      ctx.fillStyle = '#000'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(node.label, node.x!, node.y! + node.size + 15)
    })
  }, [simulatedGraph, selectedNodeId, dimensions])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Find clicked node
    const clickedNode = simulatedGraph.nodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(x - node.x!, 2) + Math.pow(y - node.y!, 2)
      )
      return distance <= node.size
    })

    onNodeSelect(clickedNode?.id)
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current?.parentElement) {
        const parent = canvasRef.current.parentElement
        const width = parent.clientWidth - 32 // Account for padding
        const height = isFullscreen ? window.innerHeight - 200 : 400
        setDimensions({ width, height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [isFullscreen])

  return (
    <div className="relative border rounded-lg overflow-hidden bg-muted/20">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        className="cursor-pointer"
      />
      
      {simulatedGraph.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No knowledge graph data available</p>
          </div>
        </div>
      )}
      
      {selectedNodeId && (
        <div className="absolute top-2 right-2 bg-background/95 border rounded-lg p-2 max-w-xs">
          <div className="text-sm">
            <div className="font-medium">
              {simulatedGraph.nodes.find(n => n.id === selectedNodeId)?.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Type: {simulatedGraph.nodes.find(n => n.id === selectedNodeId)?.type}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RAGContextViewer({ contexts, knowledgeGraph, className }: RAGContextViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedContextId, setSelectedContextId] = useState<string>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [showGraph, setShowGraph] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const filteredContexts = useMemo(() => {
    return contexts.filter(context => {
      const matchesSearch = searchTerm === '' || 
        context.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (context.extractedConcepts?.some(concept => 
          concept.toLowerCase().includes(searchTerm.toLowerCase())
        ) ?? false)
      
      const matchesType = selectedType === 'all' || context.type === selectedType
      
      return matchesSearch && matchesType
    })
  }, [contexts, searchTerm, selectedType])

  const selectedContext = selectedContextId ? 
    contexts.find(c => c.id === selectedContextId) : undefined

  const contextTypes = ['all', 'concept', 'chunk', 'document']

  const stats = useMemo(() => {
    const totalContexts = contexts.length
    const avgRelevance = contexts.length > 0 ? 
      contexts.reduce((sum, c) => sum + c.relevanceScore, 0) / contexts.length : 0
    const highQuality = contexts.filter(c => c.relevanceScore >= 0.8).length
    const relationships = contexts.reduce((sum, c) => sum + (c.relationships?.length || 0), 0)

    return { totalContexts, avgRelevance, highQuality, relationships }
  }, [contexts])

  const exportData = () => {
    const data = {
      contexts: filteredContexts,
      knowledgeGraph,
      stats,
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rag-context-${new Date().toISOString().slice(0, 19)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with stats */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h3 className="font-semibold">RAG Context & Knowledge Graph</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowGraph(!showGraph)}
                className="h-8"
              >
                <Network className="h-3 w-3 mr-1" />
                {showGraph ? 'Hide' : 'Show'} Graph
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportData}
                className="h-8"
                disabled={contexts.length === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalContexts}</div>
              <div className="text-xs text-muted-foreground">Total Contexts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.highQuality}</div>
              <div className="text-xs text-muted-foreground">High Quality</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {Math.round(stats.avgRelevance * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Relevance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{stats.relationships}</div>
              <div className="text-xs text-muted-foreground">Relationships</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search contexts and concepts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
            <div className="flex gap-1">
              {contextTypes.map(type => (
                <Badge
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  className="cursor-pointer text-xs h-8 px-3 capitalize"
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Knowledge Graph */}
      <AnimatePresence>
        {showGraph && knowledgeGraph && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Knowledge Graph</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8"
                >
                  {isFullscreen ? (
                    <><Minimize2 className="h-3 w-3 mr-1" /> Minimize</>
                  ) : (
                    <><Maximize2 className="h-3 w-3 mr-1" /> Fullscreen</>
                  )}
                </Button>
              </div>
              
              <GraphVisualization
                graph={knowledgeGraph}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                isFullscreen={isFullscreen}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Grid and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Context List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              Extracted Contexts ({filteredContexts.length})
            </h4>
            {filteredContexts.length !== contexts.length && (
              <Badge variant="outline" className="text-xs">
                Filtered from {contexts.length}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredContexts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No contexts match current filters</p>
              </div>
            ) : (
              filteredContexts.map(context => (
                <ConceptCard
                  key={context.id}
                  context={context}
                  isSelected={selectedContextId === context.id}
                  onClick={() => setSelectedContextId(
                    selectedContextId === context.id ? undefined : context.id
                  )}
                />
              ))
            )}
          </div>
        </div>

        {/* Context Details */}
        <div>
          <h4 className="font-medium mb-3">Context Details</h4>
          
          {selectedContext ? (
            <Card className="p-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="capitalize">
                    {selectedContext.type}
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(selectedContext.relevanceScore * 100)}% relevance
                  </Badge>
                </div>
                
                <p className="text-sm text-foreground">
                  {selectedContext.content}
                </p>
              </div>

              {selectedContext.sourceDocument && (
                <div>
                  <h5 className="font-medium text-sm mb-1">Source</h5>
                  <p className="text-xs text-muted-foreground">
                    {selectedContext.sourceDocument}
                    {selectedContext.chunkIndex !== undefined && 
                      ` (chunk ${selectedContext.chunkIndex})`
                    }
                  </p>
                </div>
              )}

              {selectedContext.extractedConcepts && selectedContext.extractedConcepts.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Extracted Concepts</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedContext.extractedConcepts.map((concept, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedContext.relationships && selectedContext.relationships.length > 0 && (
                <RelationshipsList
                  relationships={selectedContext.relationships}
                  onRelationshipClick={(rel) => {
                    // Find and select the target context
                    const targetContext = contexts.find(c => c.id === rel.target)
                    if (targetContext) {
                      setSelectedContextId(targetContext.id)
                    }
                  }}
                />
              )}
            </Card>
          ) : (
            <Card className="p-4">
              <div className="text-center text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Select a context to view details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Why This Content Explanations */}
      {selectedContext && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-yellow-500" />
            <h4 className="font-medium">Why This Content?</h4>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              This {selectedContext.type} was selected because of its{' '}
              <span className="font-medium text-foreground">
                {Math.round(selectedContext.relevanceScore * 100)}% relevance score
              </span>{' '}
              to your course generation request.
            </p>
            
            {selectedContext.extractedConcepts && selectedContext.extractedConcepts.length > 0 && (
              <p>
                Key concepts identified: {selectedContext.extractedConcepts.slice(0, 3).join(', ')}
                {selectedContext.extractedConcepts.length > 3 && ` and ${selectedContext.extractedConcepts.length - 3} more`}.
              </p>
            )}
            
            {selectedContext.relationships && selectedContext.relationships.length > 0 && (
              <p>
                This content has {selectedContext.relationships.length} relationship(s) with other contexts,
                indicating strong thematic connections.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}