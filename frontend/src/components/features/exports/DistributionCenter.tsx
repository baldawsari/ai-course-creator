'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Share2, 
  Mail, 
  Link, 
  QrCode, 
  Code, 
  Globe, 
  Users, 
  Settings,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Download,
  Calendar,
  Clock,
  Shield,
  Zap,
  BookOpen,
  Laptop,
  Smartphone,
  Send,
  Plus,
  X,
  Edit,
  Trash2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'

// Types
interface ShareLink {
  id: string
  title: string
  url: string
  accessType: 'public' | 'password' | 'private'
  password?: string
  expiresAt?: Date
  downloadLimit?: number
  downloads: number
  views: number
  createdAt: Date
  isActive: boolean
}

interface EmailDistribution {
  id: string
  name: string
  emails: string[]
  subject: string
  message: string
  scheduled?: Date
  sent: boolean
  opens: number
  clicks: number
  createdAt: Date
}

interface LMSIntegration {
  id: string
  platform: 'canvas' | 'blackboard' | 'moodle' | 'google-classroom' | 'microsoft-teams'
  name: string
  isConnected: boolean
  apiKey?: string
  courseMappings: Array<{
    localCourseId: string
    remoteCourseId: string
    lastSync?: Date
  }>
}

interface EmbedCode {
  id: string
  title: string
  type: 'iframe' | 'widget' | 'api'
  code: string
  width: number
  height: number
  responsive: boolean
  settings: any
}

export function DistributionCenter() {
  const [activeTab, setActiveTab] = useState('sharing')
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [emailLists, setEmailLists] = useState<EmailDistribution[]>([])
  const [lmsIntegrations, setLmsIntegrations] = useState<LMSIntegration[]>([])
  const [embedCodes, setEmbedCodes] = useState<EmbedCode[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  // Mock data
  const mockShareLinks: ShareLink[] = [
    {
      id: 'link_1',
      title: 'React Course - Public Access',
      url: 'https://courses.example.com/share/abc123',
      accessType: 'public',
      downloads: 45,
      views: 234,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isActive: true
    },
    {
      id: 'link_2',
      title: 'Advanced JS - Password Protected',
      url: 'https://courses.example.com/share/def456',
      accessType: 'password',
      password: 'secret123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      downloads: 12,
      views: 67,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  ]

  const mockEmailLists: EmailDistribution[] = [
    {
      id: 'email_1',
      name: 'React Developers',
      emails: ['dev1@example.com', 'dev2@example.com', 'dev3@example.com'],
      subject: 'New React Course Available',
      message: 'Check out our latest React development course...',
      sent: true,
      opens: 8,
      clicks: 5,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'email_2',
      name: 'Beta Testers',
      emails: ['beta1@example.com', 'beta2@example.com'],
      subject: 'Advanced JavaScript Course - Beta',
      message: 'You\'re invited to preview our new course...',
      scheduled: new Date(Date.now() + 2 * 60 * 60 * 1000),
      sent: false,
      opens: 0,
      clicks: 0,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }
  ]

  const mockLMSIntegrations: LMSIntegration[] = [
    {
      id: 'lms_1',
      platform: 'canvas',
      name: 'University Canvas',
      isConnected: true,
      courseMappings: [
        { localCourseId: 'course_1', remoteCourseId: 'canvas_123', lastSync: new Date() }
      ]
    },
    {
      id: 'lms_2',
      platform: 'google-classroom',
      name: 'Google Classroom',
      isConnected: false,
      courseMappings: []
    }
  ]

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }, [])

  // Generate share link
  const generateShareLink = useCallback(() => {
    const newLink: ShareLink = {
      id: `link_${Date.now()}`,
      title: 'New Share Link',
      url: `https://courses.example.com/share/${Math.random().toString(36).substr(2, 9)}`,
      accessType: 'public',
      downloads: 0,
      views: 0,
      createdAt: new Date(),
      isActive: true
    }
    setShareLinks(prev => [...prev, newLink])
  }, [])

  // Generate QR Code
  const generateQRCode = useCallback((url: string) => {
    // In a real implementation, this would generate an actual QR code
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  }, [])

  // Generate embed code
  const generateEmbedCode = useCallback((type: 'iframe' | 'widget' | 'api', courseId: string) => {
    const baseUrl = 'https://courses.example.com'
    
    switch (type) {
      case 'iframe':
        return `<iframe src="${baseUrl}/embed/${courseId}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`
      case 'widget':
        return `<div id="course-widget-${courseId}"></div>
<script src="${baseUrl}/widget.js"></script>
<script>
  CourseWidget.init({
    element: '#course-widget-${courseId}',
    courseId: '${courseId}',
    theme: 'default'
  });
</script>`
      case 'api':
        return `fetch('${baseUrl}/api/courses/${courseId}')
  .then(response => response.json())
  .then(data => console.log(data));`
      default:
        return ''
    }
  }, [])

  // Get LMS platform icon
  const getLMSIcon = (platform: string) => {
    switch (platform) {
      case 'canvas': return BookOpen
      case 'blackboard': return Laptop
      case 'moodle': return Globe
      case 'google-classroom': return Users
      case 'microsoft-teams': return Users
      default: return Globe
    }
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Initialize with mock data
  React.useEffect(() => {
    setShareLinks(mockShareLinks)
    setEmailLists(mockEmailLists)
    setLmsIntegrations(mockLMSIntegrations)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Distribution Center</h2>
          <p className="text-gray-500">Share and distribute your course exports</p>
        </div>
        
        <Button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-amber-500">
          <Share2 className="w-4 h-4" />
          Quick Share
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sharing" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Share Links
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Lists
          </TabsTrigger>
          <TabsTrigger value="lms" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            LMS Integration
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Embed Codes
          </TabsTrigger>
        </TabsList>

        {/* Share Links Tab */}
        <TabsContent value="sharing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Share Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Share Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="link-title">Link Title</Label>
                  <Input id="link-title" placeholder="e.g., React Course - Public Access" />
                </div>
                
                <div>
                  <Label htmlFor="access-type">Access Type</Label>
                  <Select defaultValue="public">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public - Anyone with link</SelectItem>
                      <SelectItem value="password">Password Protected</SelectItem>
                      <SelectItem value="private">Private - Specific users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expires">Expires</Label>
                    <Input id="expires" type="datetime-local" />
                  </div>
                  <div>
                    <Label htmlFor="download-limit">Download Limit</Label>
                    <Input id="download-limit" type="number" placeholder="Unlimited" />
                  </div>
                </div>
                
                <Button onClick={generateShareLink} className="w-full">
                  <Link className="w-4 h-4 mr-2" />
                  Generate Link
                </Button>
              </CardContent>
            </Card>

            {/* QR Code Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="qr-url">URL to Generate QR Code</Label>
                  <Input 
                    id="qr-url" 
                    placeholder="https://courses.example.com/share/abc123"
                    defaultValue={shareLinks[0]?.url || ''}
                  />
                </div>
                
                <div className="text-center p-4 border rounded-lg bg-gray-50">
                  <div className="w-32 h-32 mx-auto bg-white border rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">QR Code will appear here</p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download SVG
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Existing Share Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Active Share Links</span>
                <Badge variant="outline">{shareLinks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shareLinks.map((link) => (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Link className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{link.title}</h3>
                          <p className="text-sm text-gray-500">{link.url}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={link.accessType === 'public' ? 'default' : 'secondary'}
                        >
                          {link.accessType}
                        </Badge>
                        <Switch checked={link.isActive} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{link.views} views</span>
                        <span>{link.downloads} downloads</span>
                        <span>Created {formatDate(link.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(link.url, link.id)}
                        >
                          {copied === link.id ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <QrCode className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {shareLinks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No share links created yet</p>
                    <Button variant="outline" className="mt-2" onClick={generateShareLink}>
                      Create Your First Link
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Lists Tab */}
        <TabsContent value="email" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Email Campaign */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Create Email Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input id="campaign-name" placeholder="e.g., React Developers List" />
                </div>
                
                <div>
                  <Label htmlFor="email-addresses">Email Addresses</Label>
                  <Textarea 
                    id="email-addresses" 
                    placeholder="Enter email addresses separated by commas or new lines"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email-subject">Subject Line</Label>
                  <Input id="email-subject" placeholder="New Course Available: React Development" />
                </div>
                
                <div>
                  <Label htmlFor="email-message">Message</Label>
                  <Textarea 
                    id="email-message" 
                    placeholder="Write your email message here..."
                    rows={4}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch id="schedule-send" />
                  <Label htmlFor="schedule-send">Schedule for later</Label>
                </div>
                
                <Button className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Campaign
                </Button>
              </CardContent>
            </Card>

            {/* Email Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Course Launch', description: 'Announce new course availability' },
                  { name: 'Update Notification', description: 'Notify about course updates' },
                  { name: 'Invitation', description: 'Invite users to preview content' },
                  { name: 'Reminder', description: 'Remind about course access' }
                ].map((template) => (
                  <div key={template.name} className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-500">{template.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Email Campaign History */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailLists.map((campaign) => (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Mail className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{campaign.name}</h3>
                          <p className="text-sm text-gray-500">{campaign.subject}</p>
                        </div>
                      </div>
                      
                      <Badge variant={campaign.sent ? 'default' : 'secondary'}>
                        {campaign.sent ? 'Sent' : campaign.scheduled ? 'Scheduled' : 'Draft'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{campaign.emails.length} recipients</span>
                        {campaign.sent && (
                          <>
                            <span>{campaign.opens} opens</span>
                            <span>{campaign.clicks} clicks</span>
                          </>
                        )}
                        <span>
                          {campaign.sent ? 'Sent' : campaign.scheduled ? 'Scheduled for' : 'Created'} {' '}
                          {formatDate(campaign.scheduled || campaign.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LMS Integration Tab */}
        <TabsContent value="lms" className="space-y-6">
          {/* Available Integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { platform: 'canvas', name: 'Canvas LMS', description: 'Integrate with Canvas Learning Management System' },
              { platform: 'blackboard', name: 'Blackboard Learn', description: 'Connect with Blackboard learning platform' },
              { platform: 'moodle', name: 'Moodle', description: 'Sync with Moodle course platform' },
              { platform: 'google-classroom', name: 'Google Classroom', description: 'Share with Google Classroom' },
              { platform: 'microsoft-teams', name: 'Microsoft Teams', description: 'Distribute via Microsoft Teams' }
            ].map((platform) => {
              const IconComponent = getLMSIcon(platform.platform)
              const integration = lmsIntegrations.find(i => i.platform === platform.platform)
              const isConnected = integration?.isConnected || false
              
              return (
                <Card key={platform.platform}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <IconComponent className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{platform.name}</h3>
                        <p className="text-sm text-gray-500">{platform.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant={isConnected ? 'default' : 'outline'}>
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                      
                      <Button 
                        variant={isConnected ? 'outline' : 'default'} 
                        size="sm"
                      >
                        {isConnected ? 'Manage' : 'Connect'}
                      </Button>
                    </div>
                    
                    {isConnected && integration && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          {integration.courseMappings.length} course{integration.courseMappings.length === 1 ? '' : 's'} mapped
                        </div>
                        {integration.courseMappings.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            Last sync: {formatDate(integration.courseMappings[0].lastSync || new Date())}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Integration Settings */}
          {lmsIntegrations.some(i => i.isConnected) && (
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Auto-sync on export</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Send notifications</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Maintain version history</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Include analytics</Label>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Embed Codes Tab */}
        <TabsContent value="embed" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Embed Code Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Generate Embed Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="embed-type">Embed Type</Label>
                  <Select defaultValue="iframe">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iframe">iFrame Embed</SelectItem>
                      <SelectItem value="widget">JavaScript Widget</SelectItem>
                      <SelectItem value="api">API Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="embed-width">Width</Label>
                    <Input id="embed-width" type="number" defaultValue="800" />
                  </div>
                  <div>
                    <Label htmlFor="embed-height">Height</Label>
                    <Input id="embed-height" type="number" defaultValue="600" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch id="responsive" defaultChecked />
                  <Label htmlFor="responsive">Responsive</Label>
                </div>
                
                <Button className="w-full">
                  <Code className="w-4 h-4 mr-2" />
                  Generate Code
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50 min-h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Embed preview will appear here</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Desktop</span>
                    <Button variant="outline" size="sm">
                      <Laptop className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mobile</span>
                    <Button variant="outline" size="sm">
                      <Smartphone className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generated Embed Codes */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Embed Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: 'iframe', title: 'React Course iFrame', code: generateEmbedCode('iframe', 'course_123') },
                  { type: 'widget', title: 'JavaScript Widget', code: generateEmbedCode('widget', 'course_123') },
                  { type: 'api', title: 'API Integration', code: generateEmbedCode('api', 'course_123') }
                ].map((embed, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">{embed.title}</span>
                        <Badge variant="outline">{embed.type.toUpperCase()}</Badge>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(embed.code, `embed_${index}`)}
                      >
                        {copied === `embed_${index}` ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-3 text-sm text-gray-300 font-mono overflow-x-auto">
                      <pre>{embed.code}</pre>
                    </div>
                  </div>
                ))}
                
                {embedCodes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No embed codes generated yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}