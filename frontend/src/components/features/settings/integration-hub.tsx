'use client'

import { useState } from 'react'
import { 
  Link, 
  Database, 
  BarChart3, 
  Webhook, 
  Shield, 
  Settings,
  Plus,
  Check,
  AlertTriangle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

const LMS_INTEGRATIONS = [
  {
    id: 'canvas',
    name: 'Canvas LMS',
    description: 'Direct integration with Canvas Learning Management System',
    logo: '/api/placeholder/40/40',
    status: 'connected',
    lastSync: '2 hours ago',
    features: ['Course Import', 'Grade Sync', 'Assignment Export'],
    setupRequired: false
  },
  {
    id: 'blackboard',
    name: 'Blackboard Learn',
    description: 'Connect with Blackboard Learn Ultra and Original',
    logo: '/api/placeholder/40/40',
    status: 'available',
    lastSync: null,
    features: ['Content Export', 'Roster Sync', 'Course Creation'],
    setupRequired: true
  },
  {
    id: 'moodle',
    name: 'Moodle',
    description: 'Integration with Moodle open-source platform',
    logo: '/api/placeholder/40/40',
    status: 'available',
    lastSync: null,
    features: ['SCORM Export', 'Course Backup', 'User Management'],
    setupRequired: true
  },
  {
    id: 'google-classroom',
    name: 'Google Classroom',
    description: 'Seamless integration with Google Workspace for Education',
    logo: '/api/placeholder/40/40',
    status: 'connected',
    lastSync: '1 day ago',
    features: ['Course Distribution', 'Assignment Creation', 'Grade Import'],
    setupRequired: false
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    description: 'Integrate with Teams for Education',
    logo: '/api/placeholder/40/40',
    status: 'error',
    lastSync: '3 days ago',
    features: ['Channel Integration', 'File Sharing', 'Meeting Links'],
    setupRequired: false,
    error: 'Authentication expired'
  }
]

const STORAGE_PROVIDERS = [
  {
    id: 'aws-s3',
    name: 'Amazon S3',
    description: 'Store exports and assets in AWS S3 buckets',
    logo: '/api/placeholder/40/40',
    status: 'connected',
    config: { bucket: 'ai-course-exports', region: 'us-west-2' }
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Sync files with Google Drive for easy sharing',
    logo: '/api/placeholder/40/40',
    status: 'available',
    config: null
  },
  {
    id: 'dropbox',
    name: 'Dropbox Business',
    description: 'Enterprise file storage and collaboration',
    logo: '/api/placeholder/40/40',
    status: 'available',
    config: null
  },
  {
    id: 'onedrive',
    name: 'OneDrive for Business',
    description: 'Microsoft cloud storage integration',
    logo: '/api/placeholder/40/40',
    status: 'connected',
    config: { tenant: 'company.onmicrosoft.com' }
  }
]

const ANALYTICS_TOOLS = [
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track course engagement and user behavior',
    logo: '/api/placeholder/40/40',
    status: 'connected',
    trackingId: 'GA-XXXXXXX-X'
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Advanced product analytics and user tracking',
    logo: '/api/placeholder/40/40',
    status: 'available',
    trackingId: null
  },
  {
    id: 'amplitude',
    name: 'Amplitude',
    description: 'Digital optimization platform',
    logo: '/api/placeholder/40/40',
    status: 'available',
    trackingId: null
  }
]

export function IntegrationHub() {
  const [activeTab, setActiveTab] = useState('lms')
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('https://your-app.com/webhook/ai-course-creator')

  const getStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case 'available':
        return <Badge variant="outline">Available</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Check className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Plus className="w-4 h-4 text-gray-400" />
    }
  }

  const handleTestWebhook = () => {
    toast({
      title: "Webhook Test Sent",
      description: "Check your endpoint for the test payload."
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to Clipboard",
      description: "The text has been copied to your clipboard."
    })
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="lms" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            LMS
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* LMS Connections */}
        <TabsContent value="lms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Learning Management Systems
              </CardTitle>
              <CardDescription>
                Connect with popular LMS platforms to distribute your courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {LMS_INTEGRATIONS.map((lms) => (
                  <div key={lms.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img src={lms.logo} alt={lms.name} className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{lms.name}</h4>
                          {getStatusBadge(lms.status, lms.error)}
                          {lms.status === 'connected' && (
                            <span className="text-sm text-muted-foreground">
                              Last sync: {lms.lastSync}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lms.description}
                        </p>
                        {lms.error && (
                          <p className="text-sm text-red-600 mt-1">
                            Error: {lms.error}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {lms.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lms.status === 'connected' ? (
                        <>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={lms.status !== 'connected' ? 'border-red-200 text-red-600' : ''}
                          >
                            {lms.status !== 'connected' ? 'Reconnect' : 'Disconnect'}
                          </Button>
                        </>
                      ) : (
                        <Button className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Providers */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Storage Providers
              </CardTitle>
              <CardDescription>
                Configure where your course exports and assets are stored
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {STORAGE_PROVIDERS.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img src={provider.logo} alt={provider.name} className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{provider.name}</h4>
                          {getStatusBadge(provider.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {provider.description}
                        </p>
                        {provider.config && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {provider.id === 'aws-s3' && (
                              <span>Bucket: {provider.config.bucket} | Region: {provider.config.region}</span>
                            )}
                            {provider.id === 'onedrive' && (
                              <span>Tenant: {provider.config.tenant}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.status === 'connected' ? (
                        <>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Storage Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Settings</CardTitle>
              <CardDescription>
                Configure automatic storage and retention policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-backup Exports</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically save exports to connected storage
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Retention Period</p>
                  <p className="text-sm text-muted-foreground">
                    How long to keep exported files
                  </p>
                </div>
                <Select defaultValue="90">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compress Exports</p>
                  <p className="text-sm text-muted-foreground">
                    Reduce file sizes for storage efficiency
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tools */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analytics & Tracking
              </CardTitle>
              <CardDescription>
                Connect analytics tools to track course performance and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {ANALYTICS_TOOLS.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img src={tool.logo} alt={tool.name} className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{tool.name}</h4>
                          {getStatusBadge(tool.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tool.description}
                        </p>
                        {tool.trackingId && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Tracking ID: {tool.trackingId}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.status === 'connected' ? (
                        <>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tracking Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking Configuration</CardTitle>
              <CardDescription>
                Configure what data to track and how to handle privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Course View Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Track when users view course content
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Download Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    Track when exports are downloaded
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Anonymous Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Use anonymous user IDs for privacy
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks & API */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure webhooks to receive real-time notifications about events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook-url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-app.com/webhook"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="webhook-secret">Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook-secret"
                      type={showWebhookSecret ? 'text' : 'password'}
                      value="whsec_1234567890abcdef"
                      readOnly
                    />
                    <Button 
                      variant="outline"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => copyToClipboard('whsec_1234567890abcdef')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use this secret to verify webhook authenticity
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleTestWebhook}
                    className="flex items-center gap-2"
                  >
                    <TestTube className="w-4 h-4" />
                    Test Webhook
                  </Button>
                  <Button variant="outline">
                    Regenerate Secret
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Events */}
          <Card>
            <CardHeader>
              <CardTitle>Event Subscriptions</CardTitle>
              <CardDescription>
                Choose which events to receive notifications for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">course.generated</p>
                    <p className="text-sm text-muted-foreground">
                      When a new course is successfully generated
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">course.failed</p>
                    <p className="text-sm text-muted-foreground">
                      When course generation fails
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">export.completed</p>
                    <p className="text-sm text-muted-foreground">
                      When an export job completes successfully
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">user.invited</p>
                    <p className="text-sm text-muted-foreground">
                      When a new team member is invited
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">billing.updated</p>
                    <p className="text-sm text-muted-foreground">
                      When billing or subscription changes
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Webhook Deliveries</CardTitle>
              <CardDescription>
                View recent webhook delivery attempts and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium">course.generated</p>
                      <p className="text-sm text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">200 OK</Badge>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="font-medium">export.completed</p>
                      <p className="text-sm text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800">500 Error</Badge>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium">course.generated</p>
                      <p className="text-sm text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">200 OK</Badge>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OAuth App Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                OAuth Applications
              </CardTitle>
              <CardDescription>
                Manage OAuth applications that have access to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">AI Course Creator Mobile App</p>
                    <p className="text-sm text-muted-foreground">
                      Official mobile application
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last used: 2 hours ago • Scopes: read, write
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Revoke
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Third-party Analytics Tool</p>
                    <p className="text-sm text-muted-foreground">
                      Custom analytics dashboard
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last used: 1 week ago • Scopes: read
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Revoke
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}