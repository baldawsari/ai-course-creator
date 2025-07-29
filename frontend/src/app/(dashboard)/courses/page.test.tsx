import React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { 
  render, 
  screen, 
  createUserEvent, 
  waitFor,
  waitForDialog,
  openDialog,
  waitForAsync,
  createEnhancedUser
} from '@/__tests__/utils/test-utils'
import CoursesPage from './page'
import { mockUser, mockCourse } from '@/__tests__/utils/test-utils'

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock use-toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

describe('CoursesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('renders with authenticated user context', () => {
      render(<CoursesPage />, {
        initialAuth: {
          user: mockUser,
          isAuthenticated: true,
          token: 'test-token'
        }
      })
      
      // Page should render normally with auth
      const coursesPage = screen.getByTestId('courses-page mobile-courses-layout')
      expect(coursesPage).toBeInTheDocument()
      expect(screen.getByText('Courses')).toBeInTheDocument()
    })

    it('handles unauthenticated state gracefully', () => {
      render(<CoursesPage />, {
        initialAuth: {
          user: null,
          isAuthenticated: false,
          token: null
        }
      })
      
      // Page should still render (route protection handled by layout)
      const coursesPage = screen.getByTestId('courses-page mobile-courses-layout')
      expect(coursesPage).toBeInTheDocument()
    })
  })

  describe('Rendering', () => {
    it('renders page with header and filters', () => {
      render(<CoursesPage />)
      
      expect(screen.getByTestId('courses-page mobile-courses-layout')).toBeInTheDocument()
      expect(screen.getByText('Courses')).toBeInTheDocument()
      expect(screen.getByText('Create and manage your courses')).toBeInTheDocument()
      expect(screen.getByTestId('create-course-button')).toBeInTheDocument()
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument()
    })

    it('renders course grid by default', () => {
      render(<CoursesPage />)
      
      expect(screen.getByTestId('courses-grid')).toBeInTheDocument()
      expect(screen.getByTestId('course-card-test-course-1')).toBeInTheDocument()
      expect(screen.getByTestId('course-card-test-course-2')).toBeInTheDocument()
      expect(screen.getByTestId('course-card-test-course-3')).toBeInTheDocument()
    })

    it('renders mobile FAB on mobile', () => {
      render(<CoursesPage />)
      
      expect(screen.getByTestId('mobile-fab-create-course')).toBeInTheDocument()
    })
  })

  describe('Search functionality', () => {
    it('filters courses by search term', async () => {
      const user = createEnhancedUser()
      render(<CoursesPage />)
      
      const searchInput = await screen.findByTestId('search-input')
      await user.type(searchInput, 'machine learning')
      
      // Use improved async helper
      await waitForAsync(() => {
        expect(screen.getByTestId('course-card-test-course-1')).toBeInTheDocument()
        expect(screen.queryByTestId('course-card-test-course-2')).not.toBeInTheDocument()
        expect(screen.queryByTestId('course-card-test-course-3')).not.toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('shows empty state when no courses match search', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'nonexistent course')
      
      await waitFor(() => {
        expect(screen.getByText('No courses found')).toBeInTheDocument()
        expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument()
      })
    })
  })

  describe('Filter functionality', () => {
    it('opens filter dropdown and shows filter options', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('filter-dropdown'))
      
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Published')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Difficulty')).toBeInTheDocument()
      expect(screen.getByText('Beginner')).toBeInTheDocument()
      expect(screen.getByText('Intermediate')).toBeInTheDocument()
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    it('filters courses by status', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('filter-dropdown'))
      await user.click(screen.getByTestId('filter-status-published'))
      
      await waitFor(() => {
        expect(screen.getByTestId('course-card-test-course-1')).toBeInTheDocument()
        expect(screen.queryByTestId('course-card-test-course-2')).not.toBeInTheDocument()
        expect(screen.getByTestId('course-card-test-course-3')).toBeInTheDocument()
      })
    })

    it('filters courses by difficulty', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('filter-dropdown'))
      await user.click(screen.getByTestId('filter-difficulty-beginner'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('course-card-test-course-1')).not.toBeInTheDocument()
        expect(screen.queryByTestId('course-card-test-course-2')).not.toBeInTheDocument()
        expect(screen.getByTestId('course-card-test-course-3')).toBeInTheDocument()
      })
    })
  })

  describe('View mode switching', () => {
    it('switches between grid and list view', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      // Should start in grid view
      expect(screen.getByTestId('courses-grid')).toBeInTheDocument()
      
      // Switch to list view
      await user.click(screen.getByRole('button', { name: /list/i }))
      
      await waitFor(() => {
        expect(screen.queryByTestId('courses-grid')).not.toBeInTheDocument()
        // List view should show cards in a different layout
        expect(screen.getByText('Introduction to Machine Learning')).toBeInTheDocument()
      })
      
      // Switch back to grid view
      await user.click(screen.getByRole('button', { name: /grid/i }))
      
      await waitFor(() => {
        expect(screen.getByTestId('courses-grid')).toBeInTheDocument()
      })
    })
  })

  describe('Course selection', () => {
    it('allows selecting individual courses', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      const checkbox = screen.getByTestId('select-course-test-course-1')
      await user.click(checkbox)
      
      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument()
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1 selected')
      })
    })

    it('allows selecting multiple courses', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('select-course-test-course-1'))
      await user.click(screen.getByTestId('select-course-test-course-2'))
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('2 selected')
      })
    })

    it('clears selection when clear button is clicked', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('select-course-test-course-1'))
      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Clear selection'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('bulk-actions-bar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Course actions', () => {
    it('opens course menu on more button click', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('course-menu-button-test-course-1'))
      
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getAllByTestId('delete-course-option')[0]).toBeInTheDocument()
    })

    it('opens delete confirmation dialog for individual course', async () => {
      const user = createEnhancedUser()
      render(<CoursesPage />)
      
      // Open course menu
      const menuButton = await screen.findByTestId('course-menu-button-test-course-1')
      await user.click(menuButton)
      
      // Click delete option
      const deleteOption = await screen.findByTestId('delete-course-option')
      await user.click(deleteOption)
      
      // Wait for dialog with improved helper
      const dialog = await waitForDialog('delete-confirmation-dialog', { debug: false })
      expect(dialog).toBeInTheDocument()
      
      // Verify dialog content
      expect(screen.getByText('Delete Course')).toBeInTheDocument()
      expect(screen.getByTestId('course-title-text')).toHaveTextContent('Introduction to Machine Learning')
    })

    it.skip('confirms and deletes individual course', async () => {
      const user = createUserEvent()
      
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('course-menu-button-test-course-1'))
      await user.click(screen.getAllByTestId('delete-course-option')[0])
      await user.click(screen.getByTestId('confirm-delete-button'))
      
      const { toast } = require('@/hooks/use-toast')
      expect(toast).toHaveBeenCalledWith({
        title: "Course deleted successfully",
        description: "Introduction to Machine Learning has been deleted.",
      })
    })
  })

  describe('Bulk actions', () => {
    it('shows bulk delete button when courses are selected', async () => {
      const user = createUserEvent()
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('select-course-test-course-1'))
      
      expect(screen.getByTestId('bulk-delete-button')).toBeInTheDocument()
    })

    it('opens bulk delete confirmation dialog', async () => {
      const user = createEnhancedUser()
      render(<CoursesPage />)
      
      // Select multiple courses
      await user.click(await screen.findByTestId('select-course-test-course-1'))
      await user.click(await screen.findByTestId('select-course-test-course-2'))
      
      // Click bulk delete
      const bulkDeleteButton = await screen.findByTestId('bulk-delete-button')
      await user.click(bulkDeleteButton)
      
      // Wait for dialog with improved helper
      const dialog = await waitForDialog('bulk-delete-confirmation', { debug: false })
      expect(dialog).toBeInTheDocument()
      
      // Verify dialog content
      expect(screen.getByText('Delete Multiple Courses')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete 2 courses? This action cannot be undone.')).toBeInTheDocument()
    })

    it.skip('confirms and deletes multiple courses', async () => {
      const user = createUserEvent()
      
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('select-course-test-course-1'))
      await user.click(screen.getByTestId('select-course-test-course-2'))
      await user.click(screen.getByTestId('bulk-delete-button'))
      await user.click(screen.getByTestId('confirm-bulk-delete-button'))
      
      const { toast } = require('@/hooks/use-toast')
      expect(toast).toHaveBeenCalledWith({
        title: "2 courses deleted successfully",
        description: "The selected courses have been deleted.",
      })
    })
  })

  describe('Empty state', () => {
    it('shows empty state when no courses exist', () => {
      render(<CoursesPage courses={[]} />)
      
      expect(screen.getByText('No courses yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first course to get started')).toBeInTheDocument()
      expect(screen.getByText('Create Your First Course')).toBeInTheDocument()
    })
  })

  describe('Mobile functionality', () => {
    it('renders mobile layout classes', () => {
      render(<CoursesPage />)
      
      const coursesPage = screen.getByTestId('courses-page mobile-courses-layout')
      expect(coursesPage).toHaveClass('space-y-6')
    })

    it('handles mobile FAB click', async () => {
      const user = createUserEvent()
      const originalLocation = window.location
      
      // Mock window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as any
      
      render(<CoursesPage />)
      
      await user.click(screen.getByTestId('mobile-fab-create-course'))
      
      expect(window.location.href).toBe('/courses/new')
      
      // Restore original location
      window.location = originalLocation
    })
  })
})

// Mock courses data that's imported in the component
const mockCourses = [
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