'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Users, 
  Clock, 
  Zap, 
  Plus, 
  Upload, 
  Play, 
  Share2, 
  Edit3, 
  Eye,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Calendar,
  FileText,
  Download,
  UserPlus,
  Settings,
  Trophy,
  Target,
  Sparkles,
  BarChart3,
  Bell,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'

// Mock data for demonstrations
const mockStats = {
  coursesCreated: 24,
  coursesChange: 8,
  activeStudents: 1247,
  studentsChange: 156,
  hoursSaved: 342,
  hoursChange: 48,
  aiCredits: 2847,
  creditsChange: -127
}

const mockCourses = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    description: 'Comprehensive course covering ML fundamentals and practical applications',
    status: 'published' as const,
    progress: 100,
    thumbnail: 'gradient-to-br from-violet-500 to-purple-600',
    sessions: 8,
    students: 156,
    createdAt: '2024-01-10',
    lastActivity: '2 hours ago'
  },
  {
    id: '2',
    title: 'Advanced React Patterns',
    description: 'Deep dive into React hooks, context, and performance optimization',
    status: 'generating' as const,
    progress: 67,
    thumbnail: 'gradient-to-br from-sky-500 to-cyan-600',
    sessions: 12,
    students: 89,
    createdAt: '2024-01-08',
    lastActivity: '5 minutes ago'
  },
  {
    id: '3',
    title: 'Data Science Fundamentals',
    description: 'Statistical analysis and data visualization with Python',
    status: 'draft' as const,
    progress: 45,
    thumbnail: 'gradient-to-br from-emerald-500 to-green-600',
    sessions: 10,
    students: 234,
    createdAt: '2024-01-06',
    lastActivity: '1 day ago'
  },
  {
    id: '4',
    title: 'Cloud Architecture Patterns',
    description: 'Scalable cloud solutions and microservices architecture',
    status: 'published' as const,
    progress: 100,
    thumbnail: 'gradient-to-br from-amber-500 to-orange-600',
    sessions: 15,
    students: 98,
    createdAt: '2024-01-04',
    lastActivity: '3 hours ago'
  }
]

const mockActivity = [
  {
    id: '1',
    type: 'course_generated',
    title: 'Course "Introduction to Machine Learning" generated successfully',
    description: 'Generated 8 sessions with 24 activities',
    time: '2 hours ago',
    icon: BookOpen,
    color: 'text-emerald-500'
  },
  {
    id: '2',
    type: 'export',
    title: 'PDF export completed',
    description: 'Advanced React Patterns exported to PDF format',
    time: '4 hours ago',
    icon: Download,
    color: 'text-sky-500'
  },
  {
    id: '3',
    type: 'collaboration',
    title: 'New collaborator added',
    description: 'Sarah Johnson joined "Data Science Fundamentals"',
    time: '6 hours ago',
    icon: UserPlus,
    color: 'text-violet-500'
  },
  {
    id: '4',
    type: 'upload',
    title: 'Documents uploaded',
    description: '5 new documents processed for course generation',
    time: '1 day ago',
    icon: Upload,
    color: 'text-amber-500'
  }
]

const tokenUsageData = [
  { month: 'Jul', tokens: 12000, efficiency: 85 },
  { month: 'Aug', tokens: 15000, efficiency: 88 },
  { month: 'Sep', tokens: 18000, efficiency: 92 },
  { month: 'Oct', tokens: 22000, efficiency: 87 },
  { month: 'Nov', tokens: 28000, efficiency: 90 },
  { month: 'Dec', tokens: 25000, efficiency: 94 },
  { month: 'Jan', tokens: 32000, efficiency: 96 }
]

const storageData = [
  { name: 'Documents', value: 45, color: '#7C3AED' },
  { name: 'Courses', value: 30, color: '#06B6D4' },
  { name: 'Exports', value: 20, color: '#F59E0B' },
  { name: 'Other', value: 5, color: '#10B981' }
]

const successRateData = [
  { day: 'Mon', success: 95, failed: 5 },
  { day: 'Tue', success: 98, failed: 2 },
  { day: 'Wed', success: 92, failed: 8 },
  { day: 'Thu', success: 97, failed: 3 },
  { day: 'Fri', success: 94, failed: 6 },
  { day: 'Sat', success: 96, failed: 4 },
  { day: 'Sun', success: 99, failed: 1 }
]

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      setCount(Math.floor(progress * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span>{count.toLocaleString()}</span>
}

// Time-based greeting
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Status badge component
function StatusBadge({ status }: { status: 'draft' | 'generating' | 'published' }) {
  const variants = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    generating: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    published: 'bg-green-100 text-green-700 border-green-200'
  }

  const icons = {
    draft: Edit3,
    generating: Clock,
    published: Eye
  }

  const Icon = icons[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${variants[status]}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false)
  const [courses, setCourses] = useState(mockCourses)
  const [activities, setActivities] = useState(mockActivity)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showNotificationDetails, setShowNotificationDetails] = useState(false)
  const router = useRouter()
  const { user } = useAuthStore()

  // Pull-to-refresh simulation
  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setRefreshing(false)
  }

  // Simulated empty states
  const hasNoCourses = courses.length === 0
  const hasNoActivity = activities.length === 0

  return (
    <div className="space-y-8 pb-8" data-testid="dashboard">
      {/* Refresh Zone for Pull-to-Refresh */}
      <div data-testid="refresh-zone" className="absolute inset-0 pointer-events-none">
        {refreshing && (
          <div className="flex justify-center mt-4" data-testid="refresh-indicator">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
        data-testid="welcome-section"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-heading" data-testid="welcome-message">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-muted-foreground">
              Ready to create amazing learning experiences?
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="outline">
              {refreshing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Refresh
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 light-burst" 
              data-testid="quick-action-create-course"
              onClick={() => router.push('/courses/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
            <Button 
              variant="outline" 
              data-testid="quick-action-upload-document"
              onClick={() => document.querySelector('[data-testid="upload-modal"]')?.classList.remove('hidden')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Content
            </Button>
            <Button 
              variant="outline" 
              data-testid="quick-action-export-courses"
              onClick={() => router.push('/exports')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative"
        data-testid="stats-cards"
      >
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-courses">
              <span data-testid="counter-total-courses" className="animate-counter"><AnimatedCounter value={mockStats.coursesCreated} /></span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUp className="w-3 h-3 text-green-500 mr-1" />
              +{mockStats.coursesChange} from last month
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-students">
              <AnimatedCounter value={mockStats.activeStudents} />
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUp className="w-3 h-3 text-green-500 mr-1" />
              +{mockStats.studentsChange} new this week
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Courses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-published-courses">
              <AnimatedCounter value={12} />
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUp className="w-3 h-3 text-green-500 mr-1" />
              +{mockStats.hoursChange} this month
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-transparent" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-rating">
              <AnimatedCounter value={4.7} />
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowDown className="w-3 h-3 text-amber-500 mr-1" />
              {Math.abs(mockStats.creditsChange)} used this week
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent" />
        </Card>
      </motion.div>

      {/* Recent Courses Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        data-testid="recent-courses"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground font-heading">Recent Courses</h2>
            <p className="text-muted-foreground">Your latest course generation activities</p>
          </div>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View All
          </Button>
        </div>

        {hasNoCourses ? (
          <div className="text-center py-12" data-testid="no-recent-courses">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">Create your first course to get started</p>
            <Button data-testid="create-first-course-button" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create First Course
            </Button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group" data-testid={`course-card-${course.id}`}>
                  <div className={`h-32 bg-${course.thumbnail} rounded-t-lg relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={course.status} />
                    </div>
                    <div className="absolute bottom-3 left-3 text-white">
                      <div className="text-xs opacity-90">{course.sessions} sessions</div>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.students} students
                      </span>
                      <span>{course.lastActivity}</span>
                    </div>
                    
                    {course.status === 'generating' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{course.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <motion.div
                            className="bg-primary h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${course.progress}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 light-burst" 
                        data-testid="quick-edit-button"
                        onClick={() => router.push(`/courses/${course.id}/edit`)}
                      >
                        <Edit3 className="w-3 h-3 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-2" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline" data-testid="quick-share-button">
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}
      </motion.div>

      {/* Activity Timeline & Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>Recent generations, exports, and collaborations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4" data-testid="activity-feed">
              {hasNoActivity ? (
                <div className="text-center py-8" data-testid="no-activity">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              ) : (
              <>
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid="activity-item"
                >
                  <div className={`p-2 rounded-full bg-muted ${activity.color}`}>
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="activity-timestamp">{activity.time}</p>
                    {activity.type === 'course_generated' && <span data-testid="activity-status-success" className="hidden" />}
                  </div>
                </motion.div>
              ))}
              </>
              )}
              
              <div className="pt-2 border-t">
                <Button variant="ghost" size="sm" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Activity Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resource Usage Charts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-6"
          data-testid="analytics-section"
        >
          {/* AI Token Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                AI Token Usage
              </CardTitle>
              <CardDescription>Monthly token consumption and efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div data-testid="token-usage-chart">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={tokenUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="#7C3AED" 
                    fill="#7C3AED" 
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">This month</span>
                  <span className="text-sm text-muted-foreground">32,000 tokens used</span>
                </div>
                <div className="text-xs text-emerald-600 mt-1">
                  96% efficiency rate • +6% from last month
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Storage Usage
              </CardTitle>
              <CardDescription>Breakdown by content type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center" data-testid="storage-breakdown-chart">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={storageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {storageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} data-testid="chart-data-point" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {storageData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generation Success Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Success Rate
              </CardTitle>
              <CardDescription>Course generation success over the week</CardDescription>
            </CardHeader>
            <CardContent>
              <div data-testid="success-rate-indicators">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="success" stackId="a" fill="#10B981" />
                  <Bar dataKey="failed" stackId="a" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Average success rate</span>
                <span className="font-bold text-success">96.4%</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upgrade Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-violet-500/5 via-sky-500/5 to-amber-500/5 border-violet-500/20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-violet-500/10">
                  <Sparkles className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground" data-testid="upgrade-prompt-tokens">You're approaching your AI credit limit</h3>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Pro for unlimited AI generations and advanced features
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Plan
                </Button>
                <Button 
                  className="bg-violet-500 hover:bg-violet-600 light-burst" 
                  size="sm"
                  data-testid="upgrade-plan-button"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="upgrade-modal">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>
            <p className="text-muted-foreground mb-6">Choose a plan that fits your needs</p>
            <div className="space-y-4">
              <Button className="w-full" variant="outline">Basic - $9/month</Button>
              <Button className="w-full" variant="outline">Pro - $29/month</Button>
              <Button className="w-full" variant="outline">Enterprise - Contact Sales</Button>
            </div>
            <Button 
              className="w-full mt-6" 
              variant="ghost"
              onClick={() => setShowUpgradeModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Notification Details Modal */}
      {showNotificationDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="notification-details">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Notification Details</h2>
            <p className="text-muted-foreground">Your course generation is complete!</p>
            <Button 
              className="w-full mt-6" 
              onClick={() => setShowNotificationDetails(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="upload-modal">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Upload Documents</h2>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Drag and drop files here or click to browse</p>
              <Button>Select Files</Button>
            </div>
            <Button 
              className="w-full mt-6" 
              variant="ghost"
              onClick={() => setShowUploadModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}