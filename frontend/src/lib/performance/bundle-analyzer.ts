// Bundle analysis utilities for performance optimization

interface BundleAnalysis {
  totalSize: number
  gzipSize: number
  chunks: ChunkInfo[]
  dependencies: DependencyInfo[]
  duplicates: DuplicateInfo[]
  recommendations: Recommendation[]
}

interface ChunkInfo {
  name: string
  size: number
  gzipSize: number
  files: string[]
  isEntryPoint: boolean
  isAsync: boolean
}

interface DependencyInfo {
  name: string
  version: string
  size: number
  gzipSize: number
  isDevDependency: boolean
  unusedExports?: string[]
}

interface DuplicateInfo {
  name: string
  versions: string[]
  totalSize: number
  locations: string[]
}

interface Recommendation {
  type: 'warning' | 'error' | 'info'
  category: 'size' | 'duplication' | 'optimization' | 'dependency'
  message: string
  details?: string
  impact: 'high' | 'medium' | 'low'
  solution?: string
}

class BundleAnalyzer {
  private readonly SIZE_THRESHOLDS = {
    chunk: {
      warning: 500 * 1024, // 500KB
      error: 1024 * 1024,  // 1MB
    },
    dependency: {
      warning: 100 * 1024, // 100KB
      error: 500 * 1024,   // 500KB
    },
    total: {
      warning: 3 * 1024 * 1024,  // 3MB
      error: 5 * 1024 * 1024,    // 5MB
    }
  }

  async analyzeBundleSize(): Promise<BundleAnalysis> {
    const chunks = await this.getChunkInfo()
    const dependencies = await this.getDependencyInfo()
    const duplicates = await this.findDuplicates(dependencies)
    const recommendations = this.generateRecommendations(chunks, dependencies, duplicates)

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const gzipSize = chunks.reduce((sum, chunk) => sum + chunk.gzipSize, 0)

    return {
      totalSize,
      gzipSize,
      chunks,
      dependencies,
      duplicates,
      recommendations
    }
  }

  private async getChunkInfo(): Promise<ChunkInfo[]> {
    // In a real implementation, this would parse webpack stats or Next.js build output
    // For now, we'll simulate the data structure
    
    const mockChunks: ChunkInfo[] = [
      {
        name: 'main',
        size: 245 * 1024,
        gzipSize: 85 * 1024,
        files: ['main.js', 'main.css'],
        isEntryPoint: true,
        isAsync: false
      },
      {
        name: 'vendor',
        size: 890 * 1024,
        gzipSize: 280 * 1024,
        files: ['vendor.js'],
        isEntryPoint: false,
        isAsync: false
      },
      {
        name: 'course-editor',
        size: 320 * 1024,
        gzipSize: 95 * 1024,
        files: ['course-editor.js'],
        isEntryPoint: false,
        isAsync: true
      }
    ]

    return mockChunks
  }

  private async getDependencyInfo(): Promise<DependencyInfo[]> {
    // Parse package.json and node_modules to get actual sizes
    const mockDependencies: DependencyInfo[] = [
      {
        name: 'react',
        version: '18.2.0',
        size: 85 * 1024,
        gzipSize: 32 * 1024,
        isDevDependency: false
      },
      {
        name: 'framer-motion',
        version: '10.16.0',
        size: 156 * 1024,
        gzipSize: 45 * 1024,
        isDevDependency: false
      },
      {
        name: 'moment',
        version: '2.29.4',
        size: 290 * 1024,
        gzipSize: 85 * 1024,
        isDevDependency: false,
        unusedExports: ['locale', 'timezone']
      }
    ]

    return mockDependencies
  }

  private async findDuplicates(dependencies: DependencyInfo[]): Promise<DuplicateInfo[]> {
    const duplicates: DuplicateInfo[] = []
    const dependencyMap = new Map<string, DependencyInfo[]>()

    // Group dependencies by name
    dependencies.forEach(dep => {
      const existing = dependencyMap.get(dep.name) || []
      existing.push(dep)
      dependencyMap.set(dep.name, existing)
    })

    // Find duplicates
    dependencyMap.forEach((deps, name) => {
      if (deps.length > 1) {
        duplicates.push({
          name,
          versions: deps.map(d => d.version),
          totalSize: deps.reduce((sum, d) => sum + d.size, 0),
          locations: deps.map(d => `node_modules/${d.name}`)
        })
      }
    })

    return duplicates
  }

  private generateRecommendations(
    chunks: ChunkInfo[],
    dependencies: DependencyInfo[],
    duplicates: DuplicateInfo[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Check chunk sizes
    chunks.forEach(chunk => {
      if (chunk.size > this.SIZE_THRESHOLDS.chunk.error) {
        recommendations.push({
          type: 'error',
          category: 'size',
          message: `Chunk "${chunk.name}" is too large (${this.formatBytes(chunk.size)})`,
          impact: 'high',
          solution: 'Consider code splitting or removing unused code'
        })
      } else if (chunk.size > this.SIZE_THRESHOLDS.chunk.warning) {
        recommendations.push({
          type: 'warning',
          category: 'size',
          message: `Chunk "${chunk.name}" is large (${this.formatBytes(chunk.size)})`,
          impact: 'medium',
          solution: 'Consider optimizing this chunk'
        })
      }
    })

    // Check dependency sizes
    dependencies.forEach(dep => {
      if (dep.size > this.SIZE_THRESHOLDS.dependency.error) {
        recommendations.push({
          type: 'error',
          category: 'dependency',
          message: `Dependency "${dep.name}" is very large (${this.formatBytes(dep.size)})`,
          impact: 'high',
          solution: 'Consider using a lighter alternative or tree shaking'
        })
      }
    })

    // Check for duplicates
    duplicates.forEach(duplicate => {
      recommendations.push({
        type: 'warning',
        category: 'duplication',
        message: `Duplicate dependency "${duplicate.name}" found`,
        details: `Versions: ${duplicate.versions.join(', ')}`,
        impact: 'medium',
        solution: 'Use npm dedupe or update to consistent versions'
      })
    })

    // Check total bundle size
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    if (totalSize > this.SIZE_THRESHOLDS.total.error) {
      recommendations.push({
        type: 'error',
        category: 'size',
        message: `Total bundle size is too large (${this.formatBytes(totalSize)})`,
        impact: 'high',
        solution: 'Implement aggressive code splitting and lazy loading'
      })
    }

    // Check for unused exports
    dependencies.forEach(dep => {
      if (dep.unusedExports && dep.unusedExports.length > 0) {
        recommendations.push({
          type: 'info',
          category: 'optimization',
          message: `Unused exports in "${dep.name}"`,
          details: `Unused: ${dep.unusedExports.join(', ')}`,
          impact: 'low',
          solution: 'Use tree shaking or import only needed functions'
        })
      }
    })

    // Suggest optimizations
    const heavyDependencies = dependencies
      .filter(dep => dep.size > 200 * 1024)
      .sort((a, b) => b.size - a.size)

    if (heavyDependencies.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'optimization',
        message: 'Consider lazy loading heavy dependencies',
        details: `Heavy deps: ${heavyDependencies.slice(0, 3).map(d => d.name).join(', ')}`,
        impact: 'medium',
        solution: 'Use dynamic imports for non-critical features'
      })
    }

    return recommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  // Get optimization suggestions based on current bundle
  getOptimizationSuggestions(): string[] {
    return [
      'Enable gzip compression on your server',
      'Use Next.js Image component for optimized images',
      'Implement code splitting with dynamic imports',
      'Enable tree shaking in your build configuration',
      'Use webpack-bundle-analyzer for detailed analysis',
      'Consider using a CDN for static assets',
      'Implement preloading for critical resources',
      'Use service workers for caching strategies',
      'Minimize use of large third-party libraries',
      'Enable production build optimizations'
    ]
  }

  // Performance budget checker
  checkPerformanceBudget(budget: { [key: string]: number }): boolean {
    // This would check against defined performance budgets
    // e.g., { 'main.js': 200 * 1024, 'vendor.js': 500 * 1024 }
    return true
  }
}

// Export utilities
export const bundleAnalyzer = new BundleAnalyzer()

export type {
  BundleAnalysis,
  ChunkInfo,
  DependencyInfo,
  DuplicateInfo,
  Recommendation
}

// React hook for bundle analysis
export function useBundleAnalysis() {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const analyze = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await bundleAnalyzer.analyzeBundleSize()
      setAnalysis(result)
    } catch (error) {
      console.error('Bundle analysis failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      analyze()
    }
  }, [analyze])

  return {
    analysis,
    isLoading,
    analyze,
    suggestions: bundleAnalyzer.getOptimizationSuggestions()
  }
}

export default bundleAnalyzer