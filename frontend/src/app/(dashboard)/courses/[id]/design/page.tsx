'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Palette, 
  Eye, 
  Settings, 
  Download, 
  Save, 
  Star, 
  Clock, 
  BarChart3,
  Smartphone,
  Tablet,
  Monitor,
  Code2,
  Layers,
  Zap,
  Share2,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Heart,
  TrendingUp,
  Sparkles,
  PenTool,
  Layout,
  Type,
  Image as ImageIcon,
  Sliders,
  Globe,
  Shield,
  Gauge
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useParams, useRouter } from 'next/navigation'

// Template data with comprehensive metadata
const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Layers },
  { id: 'modern', name: 'Modern', icon: Sparkles },
  { id: 'classic', name: 'Classic', icon: Type },
  { id: 'academic', name: 'Academic', icon: Globe },
  { id: 'minimal', name: 'Minimal', icon: PenTool },
  { id: 'interactive', name: 'Interactive', icon: Zap }
]

const TEMPLATES = [
  {
    id: 'modern-glass',
    name: 'Modern Glass',
    category: 'modern',
    description: 'Sleek glass morphism design with gradient backgrounds',
    preview: '/templates/modern-glass-preview.jpg',
    rating: 4.8,
    exports: 1247,
    isFavorite: true,
    isRecent: true,
    features: ['Glass Effects', 'Dark Mode', 'Animations', 'Mobile First'],
    colors: ['#7C3AED', '#F59E0B', '#06B6D4'],
    tags: ['Premium', 'Popular', 'Responsive']
  },
  {
    id: 'classic-elegant',
    name: 'Classic Elegant',
    category: 'classic',
    description: 'Timeless typography-focused design for academic content',
    preview: '/templates/classic-elegant-preview.jpg',
    rating: 4.6,
    exports: 892,
    isFavorite: false,
    isRecent: false,
    features: ['Typography', 'Print Ready', 'Accessibility', 'Clean Layout'],
    colors: ['#1F2937', '#F9FAFB', '#6B7280'],
    tags: ['Academic', 'Professional', 'Clean']
  },
  {
    id: 'interactive-dynamic',
    name: 'Interactive Dynamic',
    category: 'interactive',
    description: 'Engaging interactions with micro-animations and hover effects',
    preview: '/templates/interactive-dynamic-preview.jpg',
    rating: 4.9,
    exports: 2156,
    isFavorite: true,
    isRecent: true,
    features: ['Animations', 'Interactions', 'Media Rich', 'Gamification'],
    colors: ['#EF4444', '#10B981', '#3B82F6'],
    tags: ['Interactive', 'Engaging', 'Modern']
  },
  {
    id: 'minimal-zen',
    name: 'Minimal Zen',
    category: 'minimal',
    description: 'Clean, distraction-free learning environment',
    preview: '/templates/minimal-zen-preview.jpg',
    rating: 4.5,
    exports: 678,
    isFavorite: false,
    isRecent: false,
    features: ['Minimal Design', 'Focus Mode', 'Reading Optimized', 'Fast Loading'],
    colors: ['#000000', '#FFFFFF', '#6B7280'],
    tags: ['Minimal', 'Focus', 'Fast']
  },
  {
    id: 'academic-research',
    name: 'Academic Research',
    category: 'academic',
    description: 'Research-focused with citations and references',
    preview: '/templates/academic-research-preview.jpg',
    rating: 4.7,
    exports: 543,
    isFavorite: false,
    isRecent: true,
    features: ['Citations', 'References', 'Tables', 'Footnotes'],
    colors: ['#1E40AF', '#F3F4F6', '#374151'],
    tags: ['Academic', 'Research', 'Scholarly']
  }
]

const DEVICE_MODES = [
  { id: 'desktop', name: 'Desktop', icon: Monitor, width: '100%', height: '600px' },
  { id: 'tablet', name: 'Tablet', icon: Tablet, width: '768px', height: '600px' },
  { id: 'mobile', name: 'Mobile', icon: Smartphone, width: '375px', height: '600px' }
]

const EXPORT_FORMATS = [
  { id: 'html', name: 'HTML Package', icon: Code2, description: 'Interactive web content' },
  { id: 'pdf', name: 'PDF Document', icon: ImageIcon, description: 'Print-ready format' },
  { id: 'ppt', name: 'PowerPoint', icon: Layout, description: 'Presentation slides' }
]

interface DesignSettings {
  template: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  typography: {
    heading: string
    body: string
    size: number
  }
  spacing: {
    sections: number
    paragraphs: number
    elements: number
  }
  components: {
    showProgress: boolean
    showToc: boolean
    showComments: boolean
    showActivities: boolean
  }
  animations: {
    enabled: boolean
    duration: number
    easing: string
  }
  customCSS: string
}

export default function DesignStudioPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  // State management
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [deviceMode, setDeviceMode] = useState('desktop')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonTemplate, setComparisonTemplate] = useState<typeof TEMPLATES[0] | null>(null)
  
  const [designSettings, setDesignSettings] = useState<DesignSettings>({
    template: selectedTemplate.id,
    colors: {
      primary: '#7C3AED',
      secondary: '#F59E0B', 
      accent: '#06B6D4',
      background: '#FFFFFF',
      text: '#1F2937'
    },
    typography: {
      heading: 'Lexend',
      body: 'Plus Jakarta Sans',
      size: 16
    },
    spacing: {
      sections: 32,
      paragraphs: 16,
      elements: 8
    },
    components: {
      showProgress: true,
      showToc: true,
      showComments: false,
      showActivities: true
    },
    animations: {
      enabled: true,
      duration: 300,
      easing: 'ease-out'
    },
    customCSS: ''
  })

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let filtered = TEMPLATES

    if (activeCategory !== 'all') {
      filtered = filtered.filter(template => template.category === activeCategory)
    }

    if (searchQuery) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    return filtered
  }, [activeCategory, searchQuery])

  // Handlers
  const handleTemplateSelect = useCallback((template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template)
    setDesignSettings(prev => ({ ...prev, template: template.id }))
  }, [])

  const handleSettingChange = useCallback((section: keyof DesignSettings, key: string, value: any) => {
    setDesignSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, any>),
        [key]: value
      }
    }))
  }, [])

  const handleExport = useCallback(async (formats: string[]) => {
    // Implementation for export functionality
    console.log('Exporting in formats:', formats, 'with settings:', designSettings)
  }, [designSettings])

  const handleSavePreset = useCallback(() => {
    // Implementation for saving presets
    console.log('Saving preset:', designSettings)
  }, [designSettings])

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Course
          </Button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Design Studio</h1>
            <p className="text-sm text-gray-500">Customize your course appearance</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSavePreset}>
            <Save className="w-4 h-4 mr-2" />
            Save Preset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)}>
            <Eye className="w-4 h-4 mr-2" />
            {showComparison ? 'Hide' : 'Compare'}
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-amber-500">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Left Panel - Template Gallery & Settings */}
        <div className="w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <Tabs defaultValue="templates" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="customize" className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            {/* Template Gallery */}
            <TabsContent value="templates" className="flex-1 flex flex-col p-4 pt-0">
              {/* Search and Filters */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(category.id)}
                      className="flex items-center gap-2"
                    >
                      <category.icon className="w-3 h-3" />
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Template Grid */}
              <div className="flex-1 overflow-y-auto space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg group ${
                          selectedTemplate.id === template.id 
                            ? 'ring-2 ring-purple-500 shadow-lg' 
                            : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent className="p-4">
                          {/* Template Preview */}
                          <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg mb-3 overflow-hidden">
                            <div className="absolute inset-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                              <div className="p-2 space-y-1">
                                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                              </div>
                            </div>
                            
                            {/* Color indicators */}
                            <div className="absolute top-2 right-2 flex gap-1">
                              {template.colors.map((color, idx) => (
                                <div 
                                  key={idx}
                                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>

                            {/* Badges */}
                            <div className="absolute bottom-2 left-2 flex gap-1">
                              {template.isFavorite && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  <Heart className="w-2 h-2 mr-1 fill-current" />
                                  Fav
                                </Badge>
                              )}
                              {template.isRecent && (
                                <Badge className="text-xs px-1 py-0 bg-green-500">
                                  <Clock className="w-2 h-2 mr-1" />
                                  New
                                </Badge>
                              )}
                            </div>

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                              <Button 
                                variant="secondary" 
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsPreviewMode(true)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </Button>
                            </div>
                          </div>

                          {/* Template Info */}
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setComparisonTemplate(template)
                                }}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {template.rating}
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  {template.exports}
                                </div>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {template.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>

            {/* Customization Panel */}
            <TabsContent value="customize" className="flex-1 overflow-y-auto p-4 pt-0">
              <div className="space-y-6">
                {/* Colors */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Colors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(designSettings.colors).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm capitalize">{key}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => handleSettingChange('colors', key, e.target.value)}
                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                          />
                          <Input
                            value={value}
                            onChange={(e) => handleSettingChange('colors', key, e.target.value)}
                            className="w-20 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Typography */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Typography
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">Heading Font</Label>
                      <Select 
                        value={designSettings.typography.heading}
                        onValueChange={(value) => handleSettingChange('typography', 'heading', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lexend">Lexend</SelectItem>
                          <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Poppins">Poppins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Body Font</Label>
                      <Select 
                        value={designSettings.typography.body}
                        onValueChange={(value) => handleSettingChange('typography', 'body', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
                          <SelectItem value="Lexend">Lexend</SelectItem>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="System UI">System UI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Base Size: {designSettings.typography.size}px</Label>
                      <Slider
                        value={[designSettings.typography.size]}
                        onValueChange={([value]) => handleSettingChange('typography', 'size', value)}
                        min={12}
                        max={24}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Spacing */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      Spacing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(designSettings.spacing).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-sm capitalize">{key}: {value}px</Label>
                        <Slider
                          value={[value]}
                          onValueChange={([newValue]) => handleSettingChange('spacing', key, newValue)}
                          min={4}
                          max={64}
                          step={4}
                          className="mt-2"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Components */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Components
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(designSettings.components).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) => handleSettingChange('components', key, checked)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Advanced Options */}
            <TabsContent value="advanced" className="flex-1 overflow-y-auto p-4 pt-0">
              <div className="space-y-6">
                {/* Custom CSS */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      Custom CSS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="/* Add your custom CSS here */
.custom-heading {
  color: var(--primary-color);
  font-weight: 600;
}"
                      value={designSettings.customCSS}
                      onChange={(e) => setDesignSettings(prev => ({ ...prev, customCSS: e.target.value }))}
                      className="min-h-32 font-mono text-sm"
                    />
                  </CardContent>
                </Card>

                {/* Animations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Animations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable Animations</Label>
                      <Switch
                        checked={designSettings.animations.enabled}
                        onCheckedChange={(checked) => handleSettingChange('animations', 'enabled', checked)}
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Duration: {designSettings.animations.duration}ms</Label>
                      <Slider
                        value={[designSettings.animations.duration]}
                        onValueChange={([value]) => handleSettingChange('animations', 'duration', value)}
                        min={100}
                        max={1000}
                        step={50}
                        className="mt-2"
                        disabled={!designSettings.animations.enabled}
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Easing</Label>
                      <Select 
                        value={designSettings.animations.easing}
                        onValueChange={(value) => handleSettingChange('animations', 'easing', value)}
                        disabled={!designSettings.animations.enabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ease">Ease</SelectItem>
                          <SelectItem value="ease-in">Ease In</SelectItem>
                          <SelectItem value="ease-out">Ease Out</SelectItem>
                          <SelectItem value="ease-in-out">Ease In Out</SelectItem>
                          <SelectItem value="linear">Linear</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance & Accessibility */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Quality Checks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Run Accessibility Check
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Gauge className="w-4 h-4 mr-2" />
                      Analyze Performance
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview All Devices
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center Panel - Live Preview */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800">
          {/* Preview Controls */}
          <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {DEVICE_MODES.map((mode) => (
                  <Button
                    key={mode.id}
                    variant={deviceMode === mode.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDeviceMode(mode.id)}
                    className="flex items-center gap-2"
                  >
                    <mode.icon className="w-4 h-4" />
                    {mode.name}
                  </Button>
                ))}
              </div>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <Badge variant="outline" className="text-xs">
                {selectedTemplate.name}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share Preview
              </Button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="relative">
              <motion.div
                key={deviceMode}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden"
                style={{
                  width: DEVICE_MODES.find(m => m.id === deviceMode)?.width,
                  height: DEVICE_MODES.find(m => m.id === deviceMode)?.height
                }}
              >
                {/* Mock Course Content */}
                <div className="h-full p-6 overflow-y-auto">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h1 
                        className="text-2xl font-bold mb-2"
                        style={{ 
                          color: designSettings.colors.primary,
                          fontFamily: designSettings.typography.heading 
                        }}
                      >
                        Introduction to React Development
                      </h1>
                      <p 
                        className="text-gray-600 dark:text-gray-400"
                        style={{ fontFamily: designSettings.typography.body }}
                      >
                        Master modern React development with hooks, components, and best practices
                      </p>
                    </div>

                    {designSettings.components.showProgress && (
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Course Progress</span>
                          <span className="text-sm text-gray-500">3 of 8 sessions</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              backgroundColor: designSettings.colors.primary,
                              width: '37.5%' 
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <h3 
                          className="font-semibold mb-2"
                          style={{ color: designSettings.colors.secondary }}
                        >
                          Session 1: Getting Started
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Learn the fundamentals of React components and JSX syntax.
                        </p>
                        
                        {designSettings.components.showActivities && (
                          <div className="flex gap-2">
                            <Badge 
                              className="text-xs"
                              style={{ backgroundColor: designSettings.colors.accent }}
                            >
                              Activity
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              15 min
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-4 opacity-60">
                        <h3 className="font-semibold mb-2 text-gray-500">
                          Session 2: State Management
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                          Understand useState and useEffect hooks for managing component state.
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Locked
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Device Frame */}
              {deviceMode === 'mobile' && (
                <div className="absolute -inset-4 bg-gray-800 rounded-xl"></div>
              )}
              {deviceMode === 'tablet' && (
                <div className="absolute -inset-2 bg-gray-700 rounded-lg"></div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Export & Tools */}
        <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <Tabs defaultValue="export" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-4">
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            {/* Export Settings */}
            <TabsContent value="export" className="flex-1 p-4 pt-0">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Format Selection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {EXPORT_FORMATS.map((format) => (
                      <div key={format.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={format.id}
                          className="rounded border-gray-300"
                          defaultChecked={format.id === 'html'}
                        />
                        <label htmlFor={format.id} className="flex-1 flex items-center gap-3">
                          <format.icon className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="font-medium text-sm">{format.name}</div>
                            <div className="text-xs text-gray-500">{format.description}</div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quality & Size</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">Image Quality</Label>
                      <Select defaultValue="high">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (Fast)</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High (Best)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Optimize for Size</Label>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Include Source Files</Label>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Email When Ready</Label>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Auto-publish</Label>
                      <Switch />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-purple-600 to-amber-500">
                      <Download className="w-4 h-4 mr-2" />
                      Start Export
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tools */}
            <TabsContent value="tools" className="flex-1 p-4 pt-0">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview All Devices
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share with Team
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Star className="w-4 h-4 mr-2" />
                      Save as Favorite
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">A/B Testing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Compare Templates
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Split Test Setup
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Accessibility Score
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Gauge className="w-4 h-4 mr-2" />
                      Performance Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="w-4 h-4 mr-2" />
                      SEO Analysis
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Comparison Modal */}
      <AnimatePresence>
        {showComparison && comparisonTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowComparison(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Template Comparison</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Current Template */}
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Current: {selectedTemplate.name}
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg aspect-video mb-4"></div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Rating:</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {selectedTemplate.rating}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Exports:</span>
                      <span>{selectedTemplate.exports}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="capitalize">{selectedTemplate.category}</span>
                    </div>
                  </div>
                </div>

                {/* Comparison Template */}
                <div>
                  <h3 className="font-medium mb-4">Compare: {comparisonTemplate.name}</h3>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg aspect-video mb-4"></div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Rating:</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {comparisonTemplate.rating}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Exports:</span>
                      <span>{comparisonTemplate.exports}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="capitalize">{comparisonTemplate.category}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowComparison(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    handleTemplateSelect(comparisonTemplate)
                    setShowComparison(false)
                  }}
                >
                  Switch to {comparisonTemplate.name}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}