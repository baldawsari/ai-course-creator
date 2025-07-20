'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  File, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onFilesAccepted: (files: File[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedFileTypes?: string[]
  multiple?: boolean
  disabled?: boolean
  showPreview?: boolean
  className?: string
}

interface UploadFile {
  file: File
  id: string
  preview?: string
  progress?: number
  status?: 'uploading' | 'success' | 'error'
  error?: string
}

const defaultAcceptedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (isNaN(bytes)) return 'Unknown size'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] || 'B'}`
}

function getFileIcon(file: File) {
  if (!file?.type) return File
  if (file.type.startsWith('image/')) return Image
  if (file.type === 'application/pdf') return FileText
  if (file.type.includes('document')) return FileText
  return File
}

function getFileTypeLabel(file: File): string {
  if (!file?.type) return 'File'
  if (file.type === 'application/pdf') return 'PDF'
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word'
  if (file.type === 'text/plain') return 'Text'
  if (file.type === 'text/markdown') return 'Markdown'
  if (file.type.startsWith('image/')) return 'Image'
  return file.type.split('/')[1]?.toUpperCase() || 'File'
}

export function FileUploader({
  onFilesAccepted,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = defaultAcceptedTypes,
  multiple = true,
  disabled = false,
  showPreview = true,
  className
}: FileUploaderProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        console.error(`File ${file.name} rejected:`, errors)
      })
    }

    // Process accepted files
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      preview: file.type?.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'uploading' as const,
      progress: 0
    }))

    setUploadFiles(prev => [...prev, ...newFiles])

    // Simulate upload progress
    newFiles.forEach(file => {
      simulateUpload(file.id)
    })

    onFilesAccepted(acceptedFiles)
  }, [onFilesAccepted])

  const simulateUpload = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setUploadFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: 100, status: Math.random() > 0.1 ? 'success' : 'error' as const }
            : f
        ))
      } else {
        setUploadFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress } : f
        ))
      }
    }, 200)
  }

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => {
      const uploadFile = prev.find(f => f.id === fileId)
      if (uploadFile?.preview) {
        URL.revokeObjectURL(uploadFile.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    isDragAccept
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    maxFiles: multiple ? maxFiles : 1,
    maxSize,
    multiple,
    disabled
  })

  const borderColor = isDragAccept 
    ? 'border-green-300 dark:border-green-600' 
    : isDragReject 
    ? 'border-red-300 dark:border-red-600'
    : isDragActive 
    ? 'border-primary' 
    : 'border-gray-300 dark:border-gray-700'

  const bgColor = isDragAccept
    ? 'bg-green-50 dark:bg-green-900/20'
    : isDragReject
    ? 'bg-red-50 dark:bg-red-900/20'
    : isDragActive
    ? 'bg-primary/5'
    : 'bg-gray-50 dark:bg-gray-900/50'

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <motion.div
        {...getRootProps()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300",
          borderColor,
          bgColor,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className={cn(
              "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
              isDragAccept ? "bg-green-100 dark:bg-green-900/30" :
              isDragReject ? "bg-red-100 dark:bg-red-900/30" :
              "bg-primary/10"
            )}
          >
            <Upload className={cn(
              "h-8 w-8",
              isDragAccept ? "text-green-600 dark:text-green-400" :
              isDragReject ? "text-red-600 dark:text-red-400" :
              "text-primary"
            )} />
          </motion.div>

          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {isDragActive 
                ? isDragAccept 
                  ? "Drop files here"
                  : isDragReject
                    ? "File type not supported"
                    : "Drop files here"
                : "Drop files here or click to browse"
              }
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Support for {acceptedFileTypes.length} file types. 
              Max {formatFileSize(maxSize)} per file.
              {multiple && ` Up to ${maxFiles} files.`}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['PDF', 'Word', 'Text', 'Images'].map(type => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* File Preview */}
      {showPreview && uploadFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Uploaded Files ({uploadFiles.length})
          </h4>
          
          <AnimatePresence mode="popLayout">
            {uploadFiles.map(uploadFile => {
              const FileIcon = getFileIcon(uploadFile.file)
              
              return (
                <motion.div
                  key={uploadFile.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  layout
                >
                  <Card className="border border-gray-200 dark:border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* File Icon/Preview */}
                        <div className="flex-shrink-0">
                          {uploadFile.preview ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img 
                                src={uploadFile.preview} 
                                alt={uploadFile.file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <FileIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {uploadFile.file.name}
                            </h5>
                            <Badge variant="outline" className="text-xs">
                              {getFileTypeLabel(uploadFile.file)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatFileSize(uploadFile.file.size)}
                          </p>

                          {/* Progress */}
                          {uploadFile.status === 'uploading' && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Uploading...
                                </span>
                                <span className="text-primary font-medium">
                                  {Math.round(uploadFile.progress || 0)}%
                                </span>
                              </div>
                              <Progress value={uploadFile.progress || 0} className="h-1.5" />
                            </div>
                          )}
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-2">
                          {uploadFile.status === 'uploading' && (
                            <Loader2 className="h-5 w-5 text-primary animate-spin" data-testid="loader-icon" />
                          )}
                          
                          {uploadFile.status === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" data-testid="check-circle-icon" />
                          )}
                          
                          {uploadFile.status === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" data-testid="alert-circle-icon" />
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}