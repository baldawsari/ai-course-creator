'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { FileText, FileCode, FileImage, Download, CheckCircle } from 'lucide-react'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  onExport: (options: ExportOptions) => Promise<void>
}

interface ExportOptions {
  formats: string[]
  template: string
  includeToC: boolean
}

export function ExportModal({ open, onOpenChange, courseId, courseTitle, onExport }: ExportModalProps) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['html'])
  const [template, setTemplate] = useState('modern')
  const [includeToC, setIncludeToC] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportComplete, setExportComplete] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const formats = [
    { id: 'html', label: 'HTML', icon: FileCode },
    { id: 'pdf', label: 'PDF', icon: FileText },
    { id: 'pptx', label: 'PowerPoint', icon: FileImage }
  ]

  const handleFormatToggle = (formatId: string) => {
    setSelectedFormats(prev => 
      prev.includes(formatId) 
        ? prev.filter(f => f !== formatId)
        : [...prev, formatId]
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)
    setExportComplete(false)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      await onExport({
        formats: selectedFormats,
        template,
        includeToC
      })

      clearInterval(progressInterval)
      setExportProgress(100)
      setExportComplete(true)
      setDownloadUrl('/downloads/course-export.zip') // Mock download URL
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle>Export Course</DialogTitle>
          <DialogDescription>
            Export "{courseTitle}" to your preferred formats
          </DialogDescription>
        </DialogHeader>

        {!isExporting && !exportComplete && (
          <div className="space-y-4">
            {/* Format Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Export Formats</Label>
              <div className="space-y-2">
                {formats.map(format => (
                  <div key={format.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={format.id}
                      checked={selectedFormats.includes(format.id)}
                      onCheckedChange={() => handleFormatToggle(format.id)}
                      data-testid={`export-${format.id}-checkbox`}
                    />
                    <Label 
                      htmlFor={format.id} 
                      className="flex items-center cursor-pointer"
                    >
                      <format.icon className="h-4 w-4 mr-2" />
                      {format.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <Label htmlFor="template" className="text-sm font-medium mb-2 block">
                Template
              </Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger id="template" data-testid="template-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="toc"
                checked={includeToC}
                onCheckedChange={(checked) => setIncludeToC(checked as boolean)}
                data-testid="include-toc-checkbox"
              />
              <Label htmlFor="toc" className="cursor-pointer">
                Include Table of Contents
              </Label>
            </div>
          </div>
        )}

        {/* Export Progress */}
        {isExporting && !exportComplete && (
          <div className="space-y-4" data-testid="export-progress">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Exporting your course to {selectedFormats.length} format{selectedFormats.length > 1 ? 's' : ''}...
              </p>
              <Progress value={exportProgress} className="w-full" />
              <p className="text-xs text-gray-500 mt-2">{exportProgress}% complete</p>
            </div>
          </div>
        )}

        {/* Export Complete */}
        {exportComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-600">Export Complete!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your course has been exported successfully
              </p>
            </div>
            {downloadUrl && (
              <Button
                className="w-full"
                data-testid="download-button"
                onClick={() => window.location.href = downloadUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Export
              </Button>
            )}
          </motion.div>
        )}

        <DialogFooter>
          {!isExporting && !exportComplete && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={selectedFormats.length === 0}
                data-testid="start-export-button"
              >
                Start Export
              </Button>
            </>
          )}
          {exportComplete && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}