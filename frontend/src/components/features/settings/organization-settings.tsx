'use client'

import { useState } from 'react'
import { 
  Users, 
  Shield, 
  CreditCard, 
  BarChart3, 
  Key, 
  Plus, 
  Edit, 
  Trash2,
  Crown,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Download
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TEAM_MEMBERS = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Owner',
    avatar: '/api/placeholder/40/40',
    lastActive: '2 minutes ago',
    status: 'online',
    courses: 12,
    exports: 45
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    role: 'Admin',
    avatar: '/api/placeholder/40/40',
    lastActive: '1 hour ago',
    status: 'online',
    courses: 8,
    exports: 23
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
    role: 'Editor',
    avatar: '/api/placeholder/40/40',
    lastActive: '1 day ago',
    status: 'offline',
    courses: 5,
    exports: 12
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@company.com',
    role: 'Viewer',
    avatar: '/api/placeholder/40/40',
    lastActive: '3 days ago',
    status: 'offline',
    courses: 2,
    exports: 5
  }
]

const ROLE_PERMISSIONS = {
  Owner: {
    level: 'Full Access',
    permissions: ['Manage team', 'Billing', 'Create courses', 'Export', 'Delete courses', 'Admin settings'],
    color: 'bg-purple-100 text-purple-800'
  },
  Admin: {
    level: 'Administrative',
    permissions: ['Manage team', 'Create courses', 'Export', 'Delete courses'],
    color: 'bg-blue-100 text-blue-800'
  },
  Editor: {
    level: 'Content Creation',
    permissions: ['Create courses', 'Edit courses', 'Export'],
    color: 'bg-green-100 text-green-800'
  },
  Viewer: {
    level: 'Read Only',
    permissions: ['View courses', 'Export'],
    color: 'bg-gray-100 text-gray-800'
  }
}

export function OrganizationSettings() {
  const [activeTab, setActiveTab] = useState('team')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Viewer')

  const handleInviteMember = () => {
    console.log('Inviting member:', { email: inviteEmail, role: inviteRole })
    setInviteEmail('')
    setInviteRole('Viewer')
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Owner':
        return <Crown className="w-4 h-4" />
      case 'Admin':
        return <Shield className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Team Management */}
        <TabsContent value="team" className="space-y-6">
          {/* Team Overview */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">4</p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">27</p>
                    <p className="text-sm text-muted-foreground">Courses Created</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">85</p>
                    <p className="text-sm text-muted-foreground">Total Exports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invite New Member */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Invite Team Member
              </CardTitle>
              <CardDescription>
                Send an invitation to add a new member to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="w-48">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleInviteMember} className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Send Invite
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your team members and their access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TEAM_MEMBERS.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_PERMISSIONS[member.role as keyof typeof ROLE_PERMISSIONS].color}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            {member.role}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            member.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className="text-sm">{member.lastActive}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{member.courses} courses</p>
                          <p className="text-muted-foreground">{member.exports} exports</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {member.role !== 'Owner' && (
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role & Permission Matrix */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role & Permission Matrix
              </CardTitle>
              <CardDescription>
                Understand what each role can do in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                {Object.entries(ROLE_PERMISSIONS).map(([role, config]) => (
                  <Card key={role} className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        {role}
                        <Badge className={config.color}>
                          {config.level}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Permissions:</p>
                        <ul className="space-y-1">
                          {config.permissions.map((permission) => (
                            <li key={permission} className="text-sm flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                              {permission}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing & Subscription */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your current subscription and usage details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-purple-600" />
                      <span className="text-xl font-bold">Professional Plan</span>
                      <Badge className="bg-purple-100 text-purple-800">Active</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Advanced features for growing teams
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monthly Cost</span>
                      <span className="font-medium">$49/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Billing Date</span>
                      <span className="font-medium">March 15, 2024</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Method</span>
                      <span className="font-medium">•••• 4242</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Change Plan
                    </Button>
                    <Button variant="outline" size="sm">
                      Update Payment
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Plan Features</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Up to 10 team members
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Unlimited course generation
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      All export formats
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Priority support
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Advanced analytics
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>
                Track your monthly usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">AI Credits Used</span>
                      <span className="text-sm">7,500 / 10,000</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Team Members</span>
                      <span className="text-sm">4 / 10</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Storage Used</span>
                      <span className="text-sm">2.3 GB / 50 GB</span>
                    </div>
                    <Progress value={4.6} className="h-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">This Month</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Courses Generated</span>
                      <span className="text-sm font-medium">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Exports Created</span>
                      <span className="text-sm font-medium">34</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Team Collaborations</span>
                      <span className="text-sm font-medium">8</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View and download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Feb 15, 2024</TableCell>
                    <TableCell>Professional Plan - Monthly</TableCell>
                    <TableCell>$49.00</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Paid</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Jan 15, 2024</TableCell>
                    <TableCell>Professional Plan - Monthly</TableCell>
                    <TableCell>$49.00</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Paid</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics & Usage */}
        <TabsContent value="analytics" className="space-y-6">
          {/* API Key Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Manage API keys for integrations and programmatic access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Production API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Created on Jan 15, 2024 • Last used 2 hours ago
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                      sk-ai-course-creator-prod-••••••••••••4a3f
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Development API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Created on Feb 1, 2024 • Last used 1 week ago
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                      sk-ai-course-creator-dev-••••••••••••8b2e
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New API Key
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organization Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Organization Analytics
              </CardTitle>
              <CardDescription>
                Performance metrics and usage insights for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Course Generation Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Courses</span>
                      <span className="text-sm font-medium">47</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Success Rate</span>
                      <span className="text-sm font-medium">96.8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Generation Time</span>
                      <span className="text-sm font-medium">3.2 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Most Used Template</span>
                      <span className="text-sm font-medium">Modern</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Export Analytics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Exports</span>
                      <span className="text-sm font-medium">152</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Most Popular Format</span>
                      <span className="text-sm font-medium">PDF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bundle Exports</span>
                      <span className="text-sm font-medium">23</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. File Size</span>
                      <span className="text-sm font-medium">2.4 MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}