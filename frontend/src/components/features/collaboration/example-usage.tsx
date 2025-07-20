/**
 * Example Usage Component
 * Demonstrates how to integrate real-time collaboration features
 */

'use client'

import React, { useState } from 'react'
import { 
  CollaborationProvider, 
  CollaborativeEditor, 
  NotificationCenter,
  ActivityFeed,
  useCollaboration
} from './index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, MessageSquare, Activity, Settings } from 'lucide-react'

// Example course editor with collaboration
function CourseEditorExample() {
  const [content, setContent] = useState('')
  const { users, isConnected, pendingChanges, conflicts } = useCollaboration()

  return (
    <div className="space-y-6">
      {/* Header with collaboration status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Course Content Editor</CardTitle>
            <div className="flex items-center gap-4">
              {/* Connection status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Active users */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">{users.length} online</span>
              </div>

              {/* Pending changes */}
              {pendingChanges > 0 && (
                <Badge variant="outline">
                  {pendingChanges} pending
                </Badge>
              )}

              {/* Conflicts */}
              {conflicts > 0 && (
                <Badge variant="destructive">
                  {conflicts} conflicts
                </Badge>
              )}

              {/* Notifications */}
              <NotificationCenter />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Collaborative editor */}
          <CollaborativeEditor
            courseId="example-course-id"
            sessionId="example-session-id"
            activityId="example-activity-id"
            content={content}
            onChange={setContent}
            placeholder="Start typing your course content..."
            showPresence
            showConflicts
            className="min-h-[300px]"
          />
        </CardContent>
      </Card>

      {/* Collaboration panels */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ActivityFeed
              courseId="example-course-id"
              maxItems={10}
              compact
              showHeader={false}
              className="border-0 shadow-none"
            />
          </CardContent>
        </Card>

        {/* Collaboration tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Collaboration Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users" className="space-y-3">
                {users.length > 0 ? (
                  users.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {user.name.slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No other users online
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-3">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Comments will appear here when added
                </p>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Live cursors</span>
                    <Button size="sm" variant="outline">On</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sound notifications</span>
                    <Button size="sm" variant="outline">On</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Desktop notifications</span>
                    <Button size="sm" variant="outline">Off</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main example component
export function CollaborationExample() {
  return (
    <CollaborationProvider
      courseId="example-course-id"
      showStatusBar
      showNotifications
      showActivityFeed={false}
      autoSync
    >
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Real-time Collaboration Demo</h1>
          <p className="text-muted-foreground mt-2">
            This demonstrates the AI Course Creator's real-time collaboration features including 
            live editing, user presence, notifications, and activity tracking.
          </p>
        </div>

        <CourseEditorExample />

        {/* Feature showcase */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Collaboration Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Live Presence</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  See who's online and what they're working on
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Real-time Editing</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Collaborative editing with live cursors and conflict resolution
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Activity Feed</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Track all course changes and user activities
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Offline Support</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Work offline and sync when connection returns
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CollaborationProvider>
  )
}

export default CollaborationExample