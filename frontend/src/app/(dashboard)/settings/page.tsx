'use client'

import { useState } from 'react'
import { Search, Settings, User, Users, Link, Palette, History, Download, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Import settings components
import { ProfileManagement } from '@/components/features/settings/profile-management'
import { OrganizationSettings } from '@/components/features/settings/organization-settings'
import { IntegrationHub } from '@/components/features/settings/integration-hub'
import { PreferencesPanel } from '@/components/features/settings/preferences-panel'
import { ChangeHistory } from '@/components/features/settings/change-history'
import { ImportExportSettings } from '@/components/features/settings/import-export'

const SETTINGS_TABS = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Personal information and security settings',
    badge: null
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Users,
    description: 'Team management and billing settings',
    badge: 'Pro'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Link,
    description: 'Connect with external services and tools',
    badge: null
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Palette,
    description: 'Customize your experience and defaults',
    badge: null
  }
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)

  // Filter tabs based on search query
  const filteredTabs = SETTINGS_TABS.filter(tab =>
    tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account, organization, and preferences
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Change History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportExport(true)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <Upload className="w-4 h-4" />
            Import/Export
          </Button>
        </div>
      </div>

      {/* Search within Settings */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-0 bg-transparent">
            {filteredTabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                    {tab.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground text-center hidden lg:block">
                    {tab.description}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          <TabsContent value="profile" className="m-0">
            <ProfileManagement />
          </TabsContent>

          <TabsContent value="organization" className="m-0">
            <OrganizationSettings />
          </TabsContent>

          <TabsContent value="integrations" className="m-0">
            <IntegrationHub />
          </TabsContent>

          <TabsContent value="preferences" className="m-0">
            <PreferencesPanel />
          </TabsContent>
        </div>
      </Tabs>

      {/* Change History Modal */}
      {showHistory && (
        <ChangeHistory onClose={() => setShowHistory(false)} />
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <ImportExportSettings onClose={() => setShowImportExport(false)} />
      )}
    </div>
  )
}