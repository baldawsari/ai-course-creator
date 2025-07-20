'use client'

import { useState } from 'react'
import { 
  Palette, 
  Keyboard, 
  FileText, 
  Download, 
  Bot,
  Monitor,
  Moon,
  Sun,
  Zap,
  Eye,
  Volume2,
  Gamepad2,
  Save,
  RotateCcw
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from '@/hooks/use-toast'

const KEYBOARD_SHORTCUTS = [
  { action: 'Save', shortcut: ['Cmd', 'S'], category: 'General', editable: true },
  { action: 'Undo', shortcut: ['Cmd', 'Z'], category: 'General', editable: true },
  { action: 'Redo', shortcut: ['Cmd', 'Shift', 'Z'], category: 'General', editable: true },
  { action: 'Command Palette', shortcut: ['Cmd', 'K'], category: 'Navigation', editable: true },
  { action: 'Focus Mode', shortcut: ['F'], category: 'Navigation', editable: true },
  { action: 'Toggle Sidebar', shortcut: ['Cmd', '\\'], category: 'Navigation', editable: true },
  { action: 'New Course', shortcut: ['Cmd', 'N'], category: 'Courses', editable: true },
  { action: 'Export Course', shortcut: ['Cmd', 'E'], category: 'Courses', editable: true },
  { action: 'Bold Text', shortcut: ['Cmd', 'B'], category: 'Editor', editable: false },
  { action: 'Italic Text', shortcut: ['Cmd', 'I'], category: 'Editor', editable: false },
  { action: 'Add Link', shortcut: ['Cmd', 'L'], category: 'Editor', editable: false },
  { action: 'Insert Code', shortcut: ['Cmd', '`'], category: 'Editor', editable: false }
]

const DEFAULT_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Academic',
    description: 'Traditional academic style with formal layout',
    preview: '/api/placeholder/200/120',
    category: 'Academic'
  },
  {
    id: 'modern',
    name: 'Modern Professional',
    description: 'Clean, contemporary design for business training',
    preview: '/api/placeholder/200/120',
    category: 'Professional'
  },
  {
    id: 'minimal',
    name: 'Minimal Focus',
    description: 'Distraction-free design emphasizing content',
    preview: '/api/placeholder/200/120',
    category: 'Minimal'
  },
  {
    id: 'interactive',
    name: 'Interactive Learning',
    description: 'Engaging design with interactive elements',
    preview: '/api/placeholder/200/120',
    category: 'Interactive'
  }
]

const EXPORT_PRESETS = [
  {
    id: 'standard',
    name: 'Standard Quality',
    description: 'Good balance of quality and file size',
    formats: ['HTML', 'PDF'],
    settings: { quality: 'standard', compression: true }
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'Maximum quality for professional use',
    formats: ['HTML', 'PDF', 'PowerPoint'],
    settings: { quality: 'high', compression: false }
  },
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    description: 'Optimized for online sharing and viewing',
    formats: ['HTML'],
    settings: { quality: 'standard', compression: true, responsive: true }
  },
  {
    id: 'print-ready',
    name: 'Print Ready',
    description: 'High resolution for printing',
    formats: ['PDF'],
    settings: { quality: 'high', dpi: 300, compression: false }
  }
]

export function PreferencesPanel() {
  const [activeTab, setActiveTab] = useState('ui')
  const [theme, setTheme] = useState('system')
  const [animationSpeed, setAnimationSpeed] = useState([1])
  const [fontSize, setFontSize] = useState([16])
  const [defaultTemplate, setDefaultTemplate] = useState('modern')
  const [defaultExportPreset, setDefaultExportPreset] = useState('standard')
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)

  const handleSavePreferences = () => {
    toast({
      title: "Preferences Saved",
      description: "Your preferences have been updated successfully."
    })
  }

  const handleResetToDefaults = () => {
    setTheme('system')
    setAnimationSpeed([1])
    setFontSize([16])
    setDefaultTemplate('modern')
    setDefaultExportPreset('standard')
    toast({
      title: "Reset to Defaults",
      description: "All preferences have been reset to default values."
    })
  }

  const renderShortcutBadge = (shortcut: string[]) => {
    return (
      <div className="flex gap-1">
        {shortcut.map((key, index) => (
          <kbd key={index} className="px-2 py-1 text-xs bg-gray-100 border rounded">
            {key}
          </kbd>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="ui" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            UI
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Shortcuts
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Behavior
          </TabsTrigger>
        </TabsList>

        {/* UI Customization */}
        <TabsContent value="ui" className="space-y-6">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Theme & Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Theme Preference</Label>
                <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                      <Sun className="w-4 h-4" />
                      Light
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                      <Moon className="w-4 h-4" />
                      Dark
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                      <Monitor className="w-4 h-4" />
                      System
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>Animation Speed</Label>
                  <div className="space-y-2">
                    <Slider
                      value={animationSpeed}
                      onValueChange={setAnimationSpeed}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Slow</span>
                      <span>Normal ({animationSpeed[0]}x)</span>
                      <span>Fast</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <div className="space-y-2">
                    <Slider
                      value={fontSize}
                      onValueChange={setFontSize}
                      min={12}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Small</span>
                      <span>Current ({fontSize[0]}px)</span>
                      <span>Large</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Reduce Motion</p>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations for better accessibility
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">High Contrast</p>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sound Effects</p>
                    <p className="text-sm text-muted-foreground">
                      Play sounds for notifications and actions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Display Preferences
              </CardTitle>
              <CardDescription>
                Configure how content is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Show more content in less space
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Line Numbers</p>
                  <p className="text-sm text-muted-foreground">
                    Display line numbers in code blocks
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-save Indicator</p>
                  <p className="text-sm text-muted-foreground">
                    Show save status in the interface
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Preview on Hover</p>
                  <p className="text-sm text-muted-foreground">
                    Show content previews when hovering
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keyboard Shortcuts */}
        <TabsContent value="shortcuts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Customize keyboard shortcuts for faster navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['General', 'Navigation', 'Courses', 'Editor'].map((category) => (
                  <div key={category} className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4" />
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {KEYBOARD_SHORTCUTS.filter(shortcut => shortcut.category === category).map((shortcut) => (
                        <div key={shortcut.action} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{shortcut.action}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {renderShortcutBadge(shortcut.shortcut)}
                            {shortcut.editable && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingShortcut(shortcut.action)}
                              >
                                Edit
                              </Button>
                            )}
                            {!shortcut.editable && (
                              <Badge variant="secondary">System</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Templates */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Default Templates
              </CardTitle>
              <CardDescription>
                Choose your preferred templates for new courses and exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Default Course Template</Label>
                <div className="grid gap-4 lg:grid-cols-2">
                  {DEFAULT_TEMPLATES.map((template) => (
                    <div 
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        defaultTemplate === template.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setDefaultTemplate(template.id)}
                    >
                      <div className="flex gap-4">
                        <img 
                          src={template.preview} 
                          alt={template.name}
                          className="w-16 h-10 object-cover rounded border"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <Badge variant="secondary">{template.category}</Badge>
                            {defaultTemplate === template.id && (
                              <Badge className="bg-primary/10 text-primary">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Default Export Preset</Label>
                <div className="grid gap-4">
                  {EXPORT_PRESETS.map((preset) => (
                    <div 
                      key={preset.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        defaultExportPreset === preset.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setDefaultExportPreset(preset.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{preset.name}</h4>
                            {defaultExportPreset === preset.id && (
                              <Badge className="bg-primary/10 text-primary">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {preset.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {preset.formats.map((format) => (
                              <Badge key={format} variant="outline" className="text-xs">
                                {format}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Download className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Behavior Settings */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI Behavior Settings
              </CardTitle>
              <CardDescription>
                Configure how AI assists you in course creation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Default AI Model</Label>
                  <Select defaultValue="claude-3-sonnet">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku (Fast & Economical)</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</SelectItem>
                      <SelectItem value="claude-3-opus">Claude 3 Opus (Most Capable)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose the AI model that best fits your needs and budget
                  </p>
                </div>

                <div>
                  <Label>Content Generation Style</Label>
                  <Select defaultValue="professional">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic & Formal</SelectItem>
                      <SelectItem value="professional">Professional & Clear</SelectItem>
                      <SelectItem value="conversational">Conversational & Engaging</SelectItem>
                      <SelectItem value="technical">Technical & Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Creativity Level</Label>
                  <div className="space-y-2">
                    <Slider
                      defaultValue={[70]}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Conservative</span>
                      <span>Balanced (70%)</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-suggestions</p>
                    <p className="text-sm text-muted-foreground">
                      Show AI suggestions while editing content
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Smart Formatting</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically format content for better readability
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Content Enhancement</p>
                    <p className="text-sm text-muted-foreground">
                      Suggest improvements to existing content
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Activity Generation</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate interactive activities
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Custom Instructions</Label>
                <div className="space-y-2">
                  <Input 
                    placeholder="Add custom instructions for AI behavior..."
                    defaultValue="Always include practical examples and real-world applications"
                  />
                  <p className="text-sm text-muted-foreground">
                    These instructions will be applied to all AI-generated content
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Usage Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Usage Analytics
              </CardTitle>
              <CardDescription>
                Track your AI usage and optimize your workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">This Month's Usage</span>
                    <span className="text-sm font-medium">7,500 credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average per Course</span>
                    <span className="text-sm font-medium">625 credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Most Used Model</span>
                    <span className="text-sm font-medium">Claude 3 Sonnet</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-sm font-medium">96.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg. Generation Time</span>
                    <span className="text-sm font-medium">3.2 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cost Efficiency</span>
                    <span className="text-sm font-medium">$0.32/course</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={handleResetToDefaults}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
        <Button 
          onClick={handleSavePreferences}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Preferences
        </Button>
      </div>
    </div>
  )
}