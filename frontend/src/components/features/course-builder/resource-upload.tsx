'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  Link, 
  X, 
  Eye, 
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  GripVertical,
  Plus
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FileResource {
  id: string
  name: string
  type: 'file' | 'url'
  size?: number
  url?: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress?: number
  preview?: string
  metadata?: {
    pages?: number
    words?: number
    language?: string
  }
  error?: string
}

interface ResourceUploadProps {
  courseId: string
  resources: FileResource[]
  onUpload: (files: File[] | string[]) => Promise<void>
  onUpdate: (resources: FileResource[]) => Promise<void>
}

const fileIcons: Record<string, React.ComponentType<any>> = {
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'text/plain': FileText,
  'image/*': Image,
  'url': Link,
  'default': File
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function ResourceUpload({ 
  courseId, 
  resources, 
  onUpload, 
  onUpdate 
}: ResourceUploadProps) {
  const [urlInput, setUrlInput] = useState('')
  const [isAddingUrl, setIsAddingUrl] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await onUpload(acceptedFiles)
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return
    
    try {
      setIsAddingUrl(true)
      await onUpload([urlInput])
      setUrlInput('')
    } catch (error) {
      console.error('Error adding URL:', error)
    } finally {
      setIsAddingUrl(false)
    }
  }

  const handleRemoveResource = async (resourceId: string) => {
    const updatedResources = resources.filter(r => r.id !== resourceId)
    await onUpdate(updatedResources)
  }

  const handleRetryResource = async (resource: FileResource) => {
    if (resource.type === 'url' && resource.url) {
      await onUpload([resource.url])
    }
    // For files, we'd need to re-upload, which requires keeping the original file
  }

  const getFileIcon = (type: string, mimeType?: string) => {
    if (type === 'url') return fileIcons.url
    if (mimeType && fileIcons[mimeType]) return fileIcons[mimeType]
    if (mimeType?.startsWith('image/')) return fileIcons['image/*']
    return fileIcons.default
  }

  const handleDragStart = (resourceId: string) => {
    setDraggedItem(resourceId)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const draggedIndex = resources.findIndex(r => r.id === draggedItem)
    const targetIndex = resources.findIndex(r => r.id === targetId)
    
    if (draggedIndex === -1 || targetIndex === -1) return

    const newResources = [...resources]
    const [draggedResource] = newResources.splice(draggedIndex, 1)
    newResources.splice(targetIndex, 0, draggedResource)
    
    await onUpdate(newResources)
    setDraggedItem(null)
  }

  return (
    <div className="space-y-6" data-testid="resource-upload mobile-course-builder">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Resources</h2>
        <p className="text-gray-600">
          Add documents, PDFs, and URLs that will be used to generate your course content.
        </p>
      </div>

      {/* Upload Zone */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors">
        <div
          {...getRootProps()}
          data-testid="file-upload-input mobile-upload-button"
          className={`p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'bg-purple-50 border-purple-400' : 'hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} data-testid="mobile-file-input" />
          <div className="flex flex-col items-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDragActive ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Upload className="h-8 w-8" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {isDragActive ? 'Drop files here' : 'Upload course materials'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop files here, or click to browse
              </p>
              
              <Button variant="outline" className="mb-4">
                Choose Files
              </Button>
              
              <div className="text-xs text-gray-400 space-y-1">
                <p>Supported formats: PDF, DOCX, TXT, MD</p>
                <p>Maximum file size: 10MB per file</p>
                <p>Recommended: 3-10 source documents</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* URL Input */}
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <Label htmlFor="url-input" className="text-sm font-medium text-gray-700 mb-2 block">
              Add URL Resource
            </Label>
            <Input
              id="url-input"
              type="url"
              placeholder="https://example.com/article"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || isAddingUrl}
            className="mt-6"
          >
            {isAddingUrl ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add URL
          </Button>
        </div>
      </Card>

      {/* Resources List */}
      {resources.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Uploaded Resources ({resources.length})
            </h3>
            <div className="text-sm text-gray-500">
              {resources.filter(r => r.status === 'completed').length} processed
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {resources.map((resource, index) => {
                const Icon = getFileIcon(resource.type, resource.name?.split('.').pop())
                
                return (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`${draggedItem === resource.id ? 'opacity-50' : ''}`}
                  >
                    <Card 
                      className="p-4 hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={() => handleDragStart(resource.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, resource.id)}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Drag Handle */}
                        <div className="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        {/* File Icon & Status */}
                        <div className="flex-shrink-0 relative">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            resource.status === 'completed' ? 'bg-green-100 text-green-600' :
                            resource.status === 'error' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          
                          {/* Status Indicator */}
                          <div className="absolute -top-1 -right-1">
                            {resource.status === 'uploading' && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            {resource.status === 'processing' && (
                              <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                            )}
                            {resource.status === 'completed' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {resource.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {resource.type === 'url' ? resource.url : resource.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              {resource.size && (
                                <span>{formatFileSize(resource.size)}</span>
                              )}
                              {resource.metadata?.pages && (
                                <span>{resource.metadata.pages} pages</span>
                              )}
                              {resource.metadata?.words && (
                                <span>{resource.metadata.words} words</span>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {(resource.status === 'uploading' || resource.status === 'processing') && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2" data-testid="mobile-upload-progress">
                              <motion.div
                                className="bg-blue-500 h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${resource.progress || 0}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}

                          {/* Status Text */}
                          <div className="text-xs text-gray-500">
                            {resource.status === 'uploading' && 'Uploading...'}
                            {resource.status === 'processing' && 'Processing content...'}
                            {resource.status === 'completed' && (
                              <span className="text-green-600">Ready for course generation</span>
                            )}
                            {resource.status === 'error' && (
                              <span className="text-red-600">{resource.error || 'Processing failed'}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {resource.status === 'completed' && resource.preview && (
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {resource.status === 'error' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRetryResource(resource)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {resource.type === 'url' && (
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveResource(resource.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upload Guidelines */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Tips for Better Course Generation</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload comprehensive materials that cover your topic thoroughly</li>
          <li>• Include a variety of sources: textbooks, articles, documentation</li>
          <li>• Ensure content is well-structured with clear headings and sections</li>
          <li>• Add supplementary materials like case studies or examples</li>
          <li>• Consider including both beginner and advanced content</li>
        </ul>
      </Card>

      {/* Next Step Button */}
      <div className="flex justify-end mt-6">
        <Button
          size="lg"
          disabled={resources.length === 0 || resources.some(r => r.status === 'uploading' || r.status === 'processing')}
          data-testid="next-step-button"
          className="bg-purple-600 hover:bg-purple-700"
        >
          Next Step
        </Button>
      </div>
    </div>
  )
}