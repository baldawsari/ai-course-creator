'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Copy,
  Link,
  Mail,
  Users,
  Calendar,
  Shield,
  CheckCircle,
  Loader2,
  QrCode,
  Twitter,
  Linkedin,
  Facebook,
} from 'lucide-react'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exportId: string
  exportTitle: string
  exportFormat: string
}

export function ShareModal({
  open,
  onOpenChange,
  exportId,
  exportTitle,
  exportFormat,
}: ShareModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('link')
  const [isGenerating, setIsGenerating] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [accessCount, setAccessCount] = useState(0)
  
  // Email sharing state
  const [emailRecipients, setEmailRecipients] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  
  // Settings
  const [expiryDays, setExpiryDays] = useState('7')
  const [requireAuth, setRequireAuth] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)

  const handleGenerateLink = async () => {
    setIsGenerating(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock response
      const mockShareUrl = `https://app.example.com/shared/${exportId}-${Math.random().toString(36).substr(2, 9)}`
      const mockExpiry = new Date()
      mockExpiry.setDate(mockExpiry.getDate() + parseInt(expiryDays))
      
      setShareLink(mockShareUrl)
      setExpiresAt(mockExpiry.toISOString())
      setAccessCount(0)
      
      toast({
        title: 'Share link generated',
        description: 'Your share link is ready to use',
      })
    } catch (error) {
      toast({
        title: 'Error generating link',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareLink) return
    
    try {
      await navigator.clipboard.writeText(shareLink)
      toast({
        title: 'Link copied to clipboard',
        description: 'You can now paste the link anywhere',
      })
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      })
    }
  }

  const handleSendEmail = async () => {
    if (!emailRecipients.trim()) {
      toast({
        title: 'Recipients required',
        description: 'Please enter at least one email address',
        variant: 'destructive',
      })
      return
    }
    
    setIsSendingEmail(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: 'Email sent successfully',
        description: `Share link sent to ${emailRecipients.split(',').length} recipient(s)`,
      })
      
      // Reset form
      setEmailRecipients('')
      setEmailMessage('')
    } catch (error) {
      toast({
        title: 'Failed to send email',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="share-modal">
        <DialogHeader>
          <DialogTitle>Share Export</DialogTitle>
          <DialogDescription>
            Share "{exportTitle}" ({exportFormat.toUpperCase()}) with others
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="email" data-testid="email-share-tab">Email</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          {/* Link Sharing */}
          <TabsContent value="link" className="space-y-4">
            {!shareLink ? (
              <>
                {/* Settings */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expiry">Link expiry</Label>
                    <select
                      id="expiry"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    >
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={requireAuth}
                        onChange={(e) => setRequireAuth(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Require authentication</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={(e) => setAllowDownload(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Allow download</span>
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full"
                  data-testid="generate-share-link"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Generate Share Link
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Generated Link */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="share-link">Share Link</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="share-link"
                        value={shareLink}
                        readOnly
                        data-testid="share-link"
                      />
                      <Button
                        variant="outline"
                        onClick={handleCopyLink}
                        data-testid="copy-link-button"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Expires: {formatExpiryDate(expiresAt!)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>Access count: {accessCount}</span>
                    </div>
                    {requireAuth && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <span>Authentication required</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShareLink(null)
                        setExpiresAt(null)
                      }}
                      className="flex-1"
                    >
                      Generate New Link
                    </Button>
                    <Button variant="outline" className="px-3">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Email Sharing */}
          <TabsContent value="email" className="space-y-4">
            <div>
              <Label htmlFor="recipients">Recipients</Label>
              <Input
                id="recipients"
                placeholder="Enter email addresses, separated by commas"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                data-testid="email-recipients"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple emails with commas
              </p>
            </div>

            <div>
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={3}
                data-testid="email-message"
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Recipients will receive a secure link to access the export.
                The link will expire in {expiryDays} days.
              </p>
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailRecipients.trim()}
              className="w-full"
              data-testid="send-email-button"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </TabsContent>

          {/* Social Sharing */}
          <TabsContent value="social" className="space-y-4">
            <p className="text-sm text-gray-600">
              Share your export on social media platforms
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" style={{ color: '#1DA1F2' }} />
                Twitter
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" style={{ color: '#0077B5' }} />
                LinkedIn
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" style={{ color: '#1877F2' }} />
                Facebook
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                Social sharing will create a public link that anyone can access.
                Make sure your export doesn't contain sensitive information.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}