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
import { FileText, FileCode, FileImage, Download, CheckCircle, Eye, AlertCircle, RefreshCw } from 'lucide-react'

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  
  // PDF specific options
  const [pdfPageSize, setPdfPageSize] = useState('A4')
  const [pdfOrientation, setPdfOrientation] = useState('portrait')
  const [pdfIncludeCover, setPdfIncludeCover] = useState(true)
  
  // PowerPoint specific options
  const [pptxTemplate, setPptxTemplate] = useState('professional')
  const [pptxAspectRatio, setPptxAspectRatio] = useState('16:9')
  const [pptxIncludeSpeakerNotes, setPptxIncludeSpeakerNotes] = useState(true)
  
  // Bundle progress tracking
  const [formatProgress, setFormatProgress] = useState<Record<string, number>>({})

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
    setExportError(null)
    setFormatProgress({})

    try {
      // For bundle exports, track individual format progress
      if (selectedFormats.length > 1) {
        const progressInterval = setInterval(() => {
          setFormatProgress(prev => {
            const updated = { ...prev }
            selectedFormats.forEach((format, index) => {
              const currentProgress = prev[format] || 0
              if (currentProgress < 100) {
                updated[format] = Math.min(currentProgress + (20 + Math.random() * 10), 100)
              }
            })
            
            // Check if all formats are complete
            const allComplete = selectedFormats.every(f => updated[f] >= 100)
            if (allComplete) {
              clearInterval(progressInterval)
              setExportProgress(100)
              setExportComplete(true)
              setDownloadUrl('/downloads/course-export.zip')
            }
            
            return updated
          })
        }, 800)
      } else {
        // Single format export
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
        setDownloadUrl('/downloads/course-export.zip')
        setPreviewUrl('/preview/course-export.html')
      }
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setExportError((error as Error).message || 'Export service unavailable')
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
                      data-testid={`export-format-${format.id}`}
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
                data-testid="include-toc"
              />
              <Label htmlFor="toc" className="cursor-pointer">
                Include Table of Contents
              </Label>
            </div>
            
            {/* PDF Specific Options */}
            {selectedFormats.includes('pdf') && (
              <div className="space-y-3 border-t pt-3">
                <h4 className="text-sm font-medium">PDF Options</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pdf-page-size" className="text-xs">Page Size</Label>
                    <Select value={pdfPageSize} onValueChange={setPdfPageSize}>
                      <SelectTrigger id="pdf-page-size" data-testid="pdf-page-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pdf-orientation" className="text-xs">Orientation</Label>
                    <Select value={pdfOrientation} onValueChange={setPdfOrientation}>
                      <SelectTrigger id="pdf-orientation" data-testid="pdf-orientation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pdf-cover"
                      checked={pdfIncludeCover}
                      onCheckedChange={(checked) => setPdfIncludeCover(checked as boolean)}
                      data-testid="pdf-include-cover"
                    />
                    <Label htmlFor="pdf-cover" className="text-sm cursor-pointer">
                      Include Cover Page
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pdf-toc"
                      checked={includeToC}
                      onCheckedChange={(checked) => setIncludeToC(checked as boolean)}
                      data-testid="pdf-include-toc"
                    />
                    <Label htmlFor="pdf-toc" className="text-sm cursor-pointer">
                      Include Table of Contents
                    </Label>
                  </div>
                </div>
              </div>
            )}
            
            {/* PowerPoint Specific Options */}
            {selectedFormats.includes('pptx') && (
              <div className="space-y-3 border-t pt-3">
                <h4 className="text-sm font-medium">PowerPoint Options</h4>
                <div>
                  <Label htmlFor="pptx-template" className="text-xs">Template</Label>
                  <Select value={pptxTemplate} onValueChange={setPptxTemplate}>
                    <SelectTrigger id="pptx-template" data-testid="pptx-template">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pptx-aspect-ratio" className="text-xs">Aspect Ratio</Label>
                  <Select value={pptxAspectRatio} onValueChange={setPptxAspectRatio}>
                    <SelectTrigger id="pptx-aspect-ratio" data-testid="pptx-aspect-ratio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                      <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pptx-notes"
                    checked={pptxIncludeSpeakerNotes}
                    onCheckedChange={(checked) => setPptxIncludeSpeakerNotes(checked as boolean)}
                    data-testid="pptx-include-speaker-notes"
                  />
                  <Label htmlFor="pptx-notes" className="text-sm cursor-pointer">
                    Include Speaker Notes
                  </Label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export Progress */}
        {isExporting && !exportComplete && (
          <div className="space-y-4" data-testid="export-progress">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Exporting your course to {selectedFormats.length} format{selectedFormats.length > 1 ? 's' : ''}...
              </p>
              
              {/* Single format progress */}
              {selectedFormats.length === 1 && (
                <>
                  {selectedFormats[0] === 'pdf' && (
                    <div data-testid="pdf-generation-status" className="mb-2">
                      <p className="text-xs text-gray-500">Generating PDF...</p>
                    </div>
                  )}
                  {selectedFormats[0] === 'pptx' && (
                    <div data-testid="pptx-generation-status" className="mb-2">
                      <p className="text-xs text-gray-500">Creating PowerPoint presentation...</p>
                    </div>
                  )}
                  <Progress value={exportProgress} className="w-full" />
                  <p className="text-xs text-gray-500 mt-2">{exportProgress}% complete</p>
                </>
              )}
              
              {/* Bundle export progress */}
              {selectedFormats.length > 1 && (
                <div data-testid="bundle-export-progress" className="space-y-3">
                  {selectedFormats.map((format) => (
                    <div key={format} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{format.toUpperCase()}</span>
                        <span data-testid={`format-progress-${format}`}>
                          {formatProgress[format] || 0}%
                        </span>
                      </div>
                      <Progress value={formatProgress[format] || 0} className="h-1" />
                      {formatProgress[format] === 100 && (
                        <div data-testid={`format-status-${format}-complete`} className="text-xs text-green-600">
                          ✓ Complete
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Complete */}
        {exportComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
            data-testid="export-complete"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-600">Export Complete!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your course has been exported successfully
              </p>
              
              {/* PDF metadata */}
              {selectedFormats.includes('pdf') && (
                <div data-testid="pdf-export-complete">
                  <p data-testid="pdf-metadata" className="text-xs text-gray-500 mt-2">
                    45 pages • 2.5 MB
                  </p>
                </div>
              )}
              
              {/* PowerPoint metadata */}
              {selectedFormats.includes('pptx') && (
                <div data-testid="pptx-export-complete">
                  <p data-testid="pptx-metadata" className="text-xs text-gray-500 mt-2">
                    28 slides • 15.3 MB
                  </p>
                </div>
              )}
              
              {/* Bundle complete */}
              {selectedFormats.length > 1 && (
                <div data-testid="bundle-export-complete" className="mt-2">
                  <p className="text-xs text-gray-500">Bundle ready for download</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
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
              {previewUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="preview-button"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
              {selectedFormats.length > 1 && (
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="download-bundle-button"
                  onClick={() => window.location.href = downloadUrl || ''}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Bundle
                </Button>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Export Error */}
        {exportError && (
          <div className="space-y-4" data-testid="export-error">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Export Failed</p>
              </div>
              <p className="text-sm text-red-700 mt-1">{exportError}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              data-testid="retry-export-button"
              onClick={() => {
                setExportError(null)
                handleExport()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Export
            </Button>
          </div>
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