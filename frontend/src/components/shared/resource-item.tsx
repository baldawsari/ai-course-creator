'use client'

import { motion } from 'framer-motion'
import { 
  FileText, 
  Image, 
  Link, 
  Download, 
  Eye, 
  Trash2, 
  Copy,
  MoreVertical,
  Clock,
  FileIcon,
  Globe
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ResourceItemProps {
  id: string
  name: string
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'image' | 'url' | 'video' | 'audio'
  size?: number // in bytes
  url?: string
  uploadedAt?: Date
  status?: 'uploading' | 'processing' | 'ready' | 'error'
  progress?: number // 0-100 for upload/processing
  pages?: number
  words?: number
  language?: string
  thumbnail?: string
  className?: string
  onView?: () => void
  onDownload?: () => void
  onCopy?: () => void
  onDelete?: () => void
}

const typeConfig = {
  pdf: {
    icon: FileText,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    label: 'PDF'
  },
  docx: {
    icon: FileText,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    label: 'Word'
  },
  txt: {
    icon: FileIcon,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    label: 'Text'
  },
  md: {
    icon: FileText,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    label: 'Markdown'
  },
  image: {
    icon: Image,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    label: 'Image'
  },
  url: {
    icon: Globe,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    label: 'Web'
  },
  video: {
    icon: FileIcon,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
    label: 'Video'
  },
  audio: {
    icon: FileIcon,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    label: 'Audio'
  }
}

const statusConfig = {
  uploading: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    label: 'Uploading'
  },
  processing: {
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    label: 'Processing'
  },
  ready: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    label: 'Ready'
  },
  error: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    label: 'Error'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function ResourceItem({
  id,
  name,
  type,
  size,
  url,
  uploadedAt,
  status = 'ready',
  progress = 0,
  pages,
  words,
  language,
  thumbnail,
  className,
  onView,
  onDownload,
  onCopy,
  onDelete
}: ResourceItemProps) {
  const TypeIcon = typeConfig[type].icon
  const isProcessing = status === 'uploading' || status === 'processing'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      className={cn("group", className)}
    >
      <Card className="border border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:shadow-md transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* File Icon/Thumbnail */}
            <div className="flex-shrink-0">
              {thumbnail ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={thumbnail} 
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  typeConfig[type].color
                )}>
                  <TypeIcon className="h-6 w-6" />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {name}
                </h4>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", typeConfig[type].color)}
                >
                  {typeConfig[type].label}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", statusConfig[status].color)}
                >
                  {statusConfig[status].label}
                </Badge>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {size && (
                  <span>{formatFileSize(size)}</span>
                )}
                {pages && (
                  <span>{pages} pages</span>
                )}
                {words && (
                  <span>{words.toLocaleString()} words</span>
                )}
                {language && (
                  <span>{language}</span>
                )}
                {uploadedAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{uploadedAt.toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      {status === 'uploading' ? 'Uploading...' : 'Processing...'}
                    </span>
                    <span className="text-primary font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Quick Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {onView && status === 'ready' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onView}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                
                {onDownload && status === 'ready' && type !== 'url' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownload}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}

                {onCopy && url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCopy}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* More Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && status === 'ready' && (
                    <DropdownMenuItem onClick={onView} className="cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                  )}
                  
                  {onDownload && status === 'ready' && type !== 'url' && (
                    <DropdownMenuItem onClick={onDownload} className="cursor-pointer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                  )}

                  {onCopy && url && (
                    <DropdownMenuItem onClick={onCopy} className="cursor-pointer">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                  )}

                  {type === 'url' && url && (
                    <DropdownMenuItem 
                      onClick={() => window.open(url, '_blank')} 
                      className="cursor-pointer"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Open URL
                    </DropdownMenuItem>
                  )}

                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={onDelete} 
                      className="cursor-pointer text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}