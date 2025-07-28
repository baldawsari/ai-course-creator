'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Plus, 
  BookOpen, 
  Clock, 
  Users, 
  Play, 
  MoreHorizontal,
  Search,
  Filter,
  Grid,
  List,
  Trash2,
  Edit,
  Copy,
  CheckCircle2
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

// Mock data - Can be overridden for testing
let mockCourses = [
  {
    id: 'test-course-1',
    title: 'Introduction to Machine Learning',
    description: 'Learn the fundamentals of ML algorithms and applications',
    duration: 8,
    students: 145,
    status: 'published',
    difficulty: 'intermediate',
    createdAt: '2024-01-15',
    thumbnail: null
  },
  {
    id: 'test-course-2', 
    title: 'React Advanced Patterns',
    description: 'Master advanced React concepts and design patterns',
    duration: 12,
    students: 89,
    status: 'draft',
    difficulty: 'advanced',
    createdAt: '2024-01-12',
    thumbnail: null
  },
  {
    id: 'test-course-3',
    title: 'JavaScript Fundamentals',
    description: 'Start your programming journey with JavaScript basics',
    duration: 6,
    students: 234,
    status: 'published',
    difficulty: 'beginner',
    createdAt: '2024-01-10',
    thumbnail: null
  }
]

interface CoursesPageProps {
  courses?: typeof mockCourses
}

export default function CoursesPage({ courses = mockCourses }: CoursesPageProps = {}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<typeof mockCourses[0] | null>(null)

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(course.status)
    const matchesDifficulty = difficultyFilter.length === 0 || difficultyFilter.includes(course.difficulty)
    
    return matchesSearch && matchesStatus && matchesDifficulty
  })

  const handleSelectCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourses)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      newSelected.add(courseId)
    }
    setSelectedCourses(newSelected)
  }

  const handleDeleteCourse = (course: typeof mockCourses[0]) => {
    setCourseToDelete(course)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (courseToDelete) {
      toast({
        title: "Course deleted successfully",
        description: `${courseToDelete.title} has been deleted.`,
      })
      setDeleteDialogOpen(false)
      setCourseToDelete(null)
    }
  }

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true)
  }

  const confirmBulkDelete = () => {
    toast({
      title: `${selectedCourses.size} courses deleted successfully`,
      description: "The selected courses have been deleted.",
    })
    setBulkDeleteDialogOpen(false)
    setSelectedCourses(new Set())
  }

  return (
    <div className="space-y-6" data-testid="courses-page mobile-courses-layout">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-600 mt-1">
            Create and manage your courses
          </p>
        </div>
        
        <Link href="/courses/new">
          <Button className="bg-purple-600 hover:bg-purple-700" data-testid="create-course-button">
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="filter-dropdown">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">Status</div>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('published')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setStatusFilter([...statusFilter, 'published'])
                    } else {
                      setStatusFilter(statusFilter.filter(s => s !== 'published'))
                    }
                  }}
                  data-testid="filter-status-published"
                >
                  Published
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('draft')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setStatusFilter([...statusFilter, 'draft'])
                    } else {
                      setStatusFilter(statusFilter.filter(s => s !== 'draft'))
                    }
                  }}
                >
                  Draft
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm font-semibold">Difficulty</div>
                <DropdownMenuCheckboxItem
                  checked={difficultyFilter.includes('beginner')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDifficultyFilter([...difficultyFilter, 'beginner'])
                    } else {
                      setDifficultyFilter(difficultyFilter.filter(d => d !== 'beginner'))
                    }
                  }}
                  data-testid="filter-difficulty-beginner"
                >
                  Beginner
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={difficultyFilter.includes('intermediate')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDifficultyFilter([...difficultyFilter, 'intermediate'])
                    } else {
                      setDifficultyFilter(difficultyFilter.filter(d => d !== 'intermediate'))
                    }
                  }}
                >
                  Intermediate
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={difficultyFilter.includes('advanced')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDifficultyFilter([...difficultyFilter, 'advanced'])
                    } else {
                      setDifficultyFilter(difficultyFilter.filter(d => d !== 'advanced'))
                    }
                  }}
                >
                  Advanced
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedCourses.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="p-4" data-testid="bulk-actions-bar">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium" data-testid="selected-count">
                  {selectedCourses.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCourses(new Set())}
                >
                  Clear selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  data-testid="bulk-delete-button"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete selected
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Courses Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="courses-grid">
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group relative" data-testid={`course-card-${course.id}`}>
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedCourses.has(course.id)}
                    onCheckedChange={() => handleSelectCourse(course.id)}
                    data-testid={`select-course-${course.id}`}
                  />
                </div>
                <div className="p-6">
                  {/* Course Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mb-4 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-purple-600" />
                  </div>

                  {/* Course Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 group-hover:text-purple-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {course.duration}h
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {course.students}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        course.status === 'published' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {course.status}
                      </span>

                      <div className="flex items-center gap-2">
                        <Link href={`/courses/${course.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              data-testid={`course-menu-button-${course.id}`}
                              className="data-[state=open]:bg-gray-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/courses/${course.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteCourse(course)}
                              data-testid="delete-course-option"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-4">
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {course.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {course.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {course.duration}h
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {course.students} students
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            course.status === 'published' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {course.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCourses.has(course.id)}
                        onCheckedChange={() => handleSelectCourse(course.id)}
                        data-testid={`select-course-${course.id}`}
                      />
                      <Link href={`/courses/${course.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid="course-menu-button"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/courses/${course.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteCourse(course)}
                            data-testid="delete-course-option"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No courses found' : 'No courses yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Create your first course to get started'
            }
          </p>
          {!searchTerm && (
            <Link href="/courses/new">
              <Button className="bg-purple-600 hover:bg-purple-700" data-testid="create-course-button">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Course
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="delete-confirmation-dialog">
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium" data-testid="course-title-text">
                {courseToDelete?.title}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              data-testid="confirm-delete-button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent data-testid="bulk-delete-confirmation">
          <DialogHeader>
            <DialogTitle>Delete Multiple Courses</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCourses.size} courses? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              data-testid="confirm-bulk-delete-button"
            >
              Delete {selectedCourses.size} courses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile FAB */}
      <Button 
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg md:hidden"
        data-testid="mobile-fab-create-course"
        onClick={() => window.location.href = '/courses/new'}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}