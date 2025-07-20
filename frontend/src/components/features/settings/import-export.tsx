'use client'

import { useState } from 'react'
import { 
  Download, 
  Upload, 
  FileText, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Info,
  X,
  Copy,
  Eye,
  Calendar,
  File,
  Zap
} from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'

interface ImportExportSettingsProps {
  onClose: () => void
}

const EXPORT_OPTIONS = [
  {
    id: 'profile',
    label: 'Profile Information',
    description: 'Personal details, preferences, and account settings',
    included: true,
    size: '2.3 KB'
  },
  {
    id: 'organization',
    label: 'Organization Settings',
    description: 'Team members, roles, and billing information',
    included: true,
    size: '15.7 KB'
  },
  {
    id: 'courses',
    label: 'Course Data',
    description: 'All courses, content, and metadata',
    included: false,
    size: '245.2 MB'
  },
  {
    id: 'integrations',
    label: 'Integration Configurations',
    description: 'Connected services and API configurations',
    included: true,
    size: '8.4 KB'
  },
  {
    id: 'preferences',
    label: 'User Preferences',
    description: 'UI settings, shortcuts, and customizations',
    included: true,
    size: '1.8 KB'
  },
  {
    id: 'analytics',
    label: 'Analytics Data',
    description: 'Usage statistics and performance metrics',
    included: false,
    size: '156.8 KB'
  }
]

const IMPORT_HISTORY = [
  {
    id: '1',
    filename: 'settings-backup-2024-01-10.json',
    timestamp: '2024-01-10T14:30:00Z',
    status: 'success',
    itemsImported: 127,
    warnings: 0,
    errors: 0
  },
  {
    id: '2',
    filename: 'preferences-export.json',
    timestamp: '2024-01-05T09:15:00Z',
    status: 'success',
    itemsImported: 45,
    warnings: 2,
    errors: 0
  },
  {
    id: '3',
    filename: 'full-backup-2023-12-20.json',
    timestamp: '2023-12-20T18:45:00Z',
    status: 'error',
    itemsImported: 0,
    warnings: 0,
    errors: 5
  }
]

const EXPORT_HISTORY = [
  {
    id: '1',
    filename: 'ai-course-creator-backup-2024-01-15.json',
    timestamp: '2024-01-15T16:20:00Z',
    status: 'completed',
    size: '267.8 MB',
    downloadUrl: '#'
  },
  {
    id: '2',
    filename: 'settings-only-2024-01-10.json',
    timestamp: '2024-01-10T11:30:00Z',
    status: 'completed',
    size: '28.2 KB',
    downloadUrl: '#'
  },
  {
    id: '3',
    filename: 'preferences-backup-2024-01-05.json',
    timestamp: '2024-01-05T14:15:00Z',
    status: 'expired',
    size: '1.8 KB',
    downloadUrl: null
  }
]

export function ImportExportSettings({ onClose }: ImportExportSettingsProps) {
  const [activeTab, setActiveTab] = useState('export')
  const [exportOptions, setExportOptions] = useState(EXPORT_OPTIONS)
  const [exportFormat, setExportFormat] = useState('json')
  const [includePasswords, setIncludePasswords] = useState(false)
  const [encryptExport, setEncryptExport] = useState(true)
  const [exportPassword, setExportPassword] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPassword, setImportPassword] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)

  const toggleExportOption = (id: string) => {
    setExportOptions(prev => 
      prev.map(option => 
        option.id === id 
          ? { ...option, included: !option.included }
          : option
      )
    )
  }

  const calculateTotalSize = () => {
    return exportOptions
      .filter(option => option.included)
      .reduce((total, option) => {
        const size = parseFloat(option.size)
        const unit = option.size.includes('MB') ? 1024 : 1
        return total + (size * unit)
      }, 0)
  }

  const formatSize = (sizeInKB: number) => {
    if (sizeInKB > 1024) {
      return `${(sizeInKB / 1024).toFixed(1)} MB`
    }
    return `${sizeInKB.toFixed(1)} KB`
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          toast({
            title: "Export Complete",
            description: "Your settings have been exported successfully."
          })
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import.",
        variant: "destructive"
      })
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    // Simulate import progress
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsImporting(false)
          toast({
            title: "Import Complete",
            description: "Your settings have been imported successfully."
          })
          return 100
        }
        return prev + 15
      })
    }, 300)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const downloadExport = (downloadUrl: string, filename: string) => {
    // Simulate download
    toast({
      title: "Download Started",
      description: `Downloading ${filename}`
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      success: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800'
    }
    return <Badge className={config[status as keyof typeof config] || 'bg-gray-100 text-gray-800'}>{status}</Badge>
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            <Upload className="w-5 h-5" />
            Import / Export Settings
          </DialogTitle>
          <DialogDescription>
            Backup your settings or import configurations from a backup file
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 overflow-y-auto space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Export Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What to Export</CardTitle>
                  <CardDescription>
                    Select the data you want to include in your export
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exportOptions.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={option.id}
                        checked={option.included}
                        onCheckedChange={() => toggleExportOption(option.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={option.id} className="font-medium cursor-pointer">
                            {option.label}
                          </Label>
                          <span className="text-sm text-muted-foreground">{option.size}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Total size:</span>
                    <span className="font-medium">{formatSize(calculateTotalSize())}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Export Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Settings</CardTitle>
                  <CardDescription>
                    Configure how your data should be exported
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON (Recommended)</SelectItem>
                        <SelectItem value="csv">CSV (Limited data)</SelectItem>
                        <SelectItem value="xml">XML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Include Passwords</p>
                        <p className="text-sm text-muted-foreground">
                          Export encrypted password hashes
                        </p>
                      </div>
                      <Switch 
                        checked={includePasswords}
                        onCheckedChange={setIncludePasswords}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Encrypt Export</p>
                        <p className="text-sm text-muted-foreground">
                          Password-protect the export file
                        </p>
                      </div>
                      <Switch 
                        checked={encryptExport}
                        onCheckedChange={setEncryptExport}
                      />
                    </div>

                    {encryptExport && (
                      <div className="space-y-2">
                        <Label>Export Password</Label>
                        <Input
                          type="password"
                          placeholder="Enter a strong password"
                          value={exportPassword}
                          onChange={(e) => setExportPassword(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                          Use a strong password to protect your exported data
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Progress */}
            {isExporting && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Exporting your data...</span>
                      <span className="text-sm text-muted-foreground">{exportProgress}%</span>
                    </div>
                    <Progress value={exportProgress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport}
                disabled={isExporting || exportOptions.filter(o => o.included).length === 0}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="flex-1 overflow-y-auto space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import File</CardTitle>
                  <CardDescription>
                    Select a backup file to import your settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Backup File</Label>
                    <Input
                      type="file"
                      accept=".json,.csv,.xml"
                      onChange={handleFileUpload}
                    />
                    {importFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <File className="w-4 h-4" />
                        <span>{importFile.name}</span>
                        <span>({(importFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Import Password (if encrypted)</Label>
                    <Input
                      type="password"
                      placeholder="Enter the export password"
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Import Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Options</CardTitle>
                  <CardDescription>
                    Configure how the import should be handled
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Overwrite Existing</p>
                      <p className="text-sm text-muted-foreground">
                        Replace current settings with imported ones
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Create Backup</p>
                      <p className="text-sm text-muted-foreground">
                        Backup current settings before import
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Validate Data</p>
                      <p className="text-sm text-muted-foreground">
                        Check data integrity before importing
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Skip Errors</p>
                      <p className="text-sm text-muted-foreground">
                        Continue import even if some items fail
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Import Progress */}
            {isImporting && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Importing your data...</span>
                      <span className="text-sm text-muted-foreground">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={isImporting || !importFile}
                className="flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 overflow-y-auto space-y-6">
            {/* Export History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export History
                </CardTitle>
                <CardDescription>
                  Download previous exports (available for 30 days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {EXPORT_HISTORY.map((export_item) => (
                    <div key={export_item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(export_item.status)}
                        <div>
                          <p className="font-medium">{export_item.filename}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(export_item.timestamp).toLocaleDateString()}
                            </span>
                            <span>{export_item.size}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(export_item.status)}
                        {export_item.downloadUrl && export_item.status === 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadExport(export_item.downloadUrl!, export_item.filename)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Import History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Import History
                </CardTitle>
                <CardDescription>
                  View previous import operations and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {IMPORT_HISTORY.map((import_item) => (
                    <div key={import_item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(import_item.status)}
                        <div>
                          <p className="font-medium">{import_item.filename}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(import_item.timestamp).toLocaleDateString()}
                            </span>
                            <span>{import_item.itemsImported} items imported</span>
                            {import_item.warnings > 0 && (
                              <span className="text-yellow-600">{import_item.warnings} warnings</span>
                            )}
                            {import_item.errors > 0 && (
                              <span className="text-red-600">{import_item.errors} errors</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(import_item.status)}
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}