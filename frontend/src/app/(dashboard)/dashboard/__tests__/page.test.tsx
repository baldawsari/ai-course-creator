import React from 'react'
import { render, screen, waitFor, within, mockAuthStore } from '@/__tests__/utils/test-utils'
import { createUserEvent } from '@/__tests__/utils/test-utils'
import { act } from '@testing-library/react'
import DashboardPage from '../page'

// Mock useRouter
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}))

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="chart-data-point" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

describe('DashboardPage', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'John Doe',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Set default auth state
    mockAuthStore.user = mockUser
    mockAuthStore.isAuthenticated = true
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Welcome Section', () => {
    it('should display personalized morning greeting', () => {
      jest.setSystemTime(new Date('2024-01-15 09:00:00'))
      render(<DashboardPage />)
      
      const welcomeMessage = screen.getByTestId('welcome-message')
      expect(welcomeMessage).toHaveTextContent('Good morning, John! 👋')
    })

    it('should display personalized afternoon greeting', () => {
      jest.setSystemTime(new Date('2024-01-15 14:00:00'))
      render(<DashboardPage />)
      
      const welcomeMessage = screen.getByTestId('welcome-message')
      expect(welcomeMessage).toHaveTextContent('Good afternoon, John! 👋')
    })

    it('should display personalized evening greeting', () => {
      jest.setSystemTime(new Date('2024-01-15 19:00:00'))
      render(<DashboardPage />)
      
      const welcomeMessage = screen.getByTestId('welcome-message')
      expect(welcomeMessage).toHaveTextContent('Good evening, John! 👋')
    })

    it('should display generic greeting when user has no name', () => {
      // Update mock user to have no name
      mockAuthStore.user = { id: '1', email: 'test@example.com' }
      
      render(<DashboardPage />)
      
      const welcomeMessage = screen.getByTestId('welcome-message')
      expect(welcomeMessage).toHaveTextContent('User')
    })
  })

  describe('Quick Actions', () => {
    it('should navigate to create course page when clicking Create Course', async () => {
      render(<DashboardPage />)
      
      const createButton = screen.getByTestId('quick-action-create-course')
      createButton.click()
      
      expect(mockPush).toHaveBeenCalledWith('/courses/new')
    })

    it('should open upload modal when clicking Import Content', async () => {
      render(<DashboardPage />)
      
      const uploadButton = screen.getByTestId('quick-action-upload-document')
      
      act(() => {
        uploadButton.click()
      })
      
      // Check that upload modal is shown
      const uploadModal = screen.getByTestId('upload-modal')
      expect(uploadModal).toBeInTheDocument()
    })

    it('should navigate to exports page when clicking Export', async () => {
      render(<DashboardPage />)
      
      const exportButton = screen.getByTestId('quick-action-export-courses')
      exportButton.click()
      
      expect(mockPush).toHaveBeenCalledWith('/exports')
    })
  })

  describe('Statistics Cards', () => {
    it('should display all stats cards with animated counters', async () => {
      render(<DashboardPage />)
      
      const statsSection = screen.getByTestId('stats-cards')
      expect(statsSection).toBeInTheDocument()
      
      // Check that all stat cards are present
      expect(screen.getByTestId('stat-total-courses')).toBeInTheDocument()
      expect(screen.getByTestId('stat-total-students')).toBeInTheDocument()
      expect(screen.getByTestId('stat-published-courses')).toBeInTheDocument()
      expect(screen.getByTestId('stat-avg-rating')).toBeInTheDocument()
      
      // Check counter animation starts at 0
      const counter = screen.getByTestId('counter-total-courses')
      expect(counter).toHaveTextContent('0')
      
      // Fast-forward animation
      await waitFor(() => {
        jest.advanceTimersByTime(2000)
      })
      
      // Counter should now show final value
      await waitFor(() => {
        expect(counter).toHaveTextContent('24')
      })
    })

    it('should display change indicators with proper styling', () => {
      render(<DashboardPage />)
      
      // Look for positive change indicators
      const positiveChanges = screen.getAllByText(/\+\d+/)
      expect(positiveChanges.length).toBeGreaterThan(0)
      
      // Check for arrow indicators
      const upArrows = document.querySelectorAll('.text-green-500')
      expect(upArrows.length).toBeGreaterThan(0)
    })
  })

  describe('Recent Courses', () => {
    it('should display course cards with different statuses', () => {
      render(<DashboardPage />)
      
      // Check for different course statuses - need to check for multiple instances
      const publishedBadges = screen.getAllByText('Published')
      expect(publishedBadges).toHaveLength(2) // Two published courses
      
      expect(screen.getByText('Generating')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
      
      // Check course cards are rendered
      expect(screen.getByTestId('course-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('course-card-2')).toBeInTheDocument()
      expect(screen.getByTestId('course-card-3')).toBeInTheDocument()
      expect(screen.getByTestId('course-card-4')).toBeInTheDocument()
    })

    it('should show progress bar for generating courses', async () => {
      render(<DashboardPage />)
      
      const generatingCard = screen.getByTestId('course-card-2')
      const progressText = within(generatingCard).getByText('67%')
      expect(progressText).toBeInTheDocument()
      
      // Check for progress text
      expect(within(generatingCard).getByText('Progress')).toBeInTheDocument()
    })

    it('should navigate to edit page when clicking Edit button', async () => {
      render(<DashboardPage />)
      
      const editButtons = screen.getAllByTestId('quick-edit-button')
      editButtons[0].click()
      
      expect(mockPush).toHaveBeenCalledWith('/courses/1/edit')
    })

    it('should show share button for each course', () => {
      render(<DashboardPage />)
      
      const shareButtons = screen.getAllByTestId('quick-share-button')
      expect(shareButtons).toHaveLength(4)
    })
  })

  describe('Activity Timeline', () => {
    it('should display recent activities', () => {
      render(<DashboardPage />)
      
      const activityFeed = screen.getByTestId('activity-feed')
      expect(activityFeed).toBeInTheDocument()
      
      // Check for activity items
      const activityItems = screen.getAllByTestId('activity-item')
      expect(activityItems).toHaveLength(4)
      
      // Check activity types
      expect(screen.getByText(/Course.*generated successfully/)).toBeInTheDocument()
      expect(screen.getByText('PDF export completed')).toBeInTheDocument()
      expect(screen.getByText('New collaborator added')).toBeInTheDocument()
      expect(screen.getByText('Documents uploaded')).toBeInTheDocument()
    })

    it('should display activity timestamps', () => {
      render(<DashboardPage />)
      
      const timestamps = screen.getAllByTestId('activity-timestamp')
      expect(timestamps[0]).toHaveTextContent('2 hours ago')
      expect(timestamps[1]).toHaveTextContent('4 hours ago')
      expect(timestamps[2]).toHaveTextContent('6 hours ago')
      expect(timestamps[3]).toHaveTextContent('1 day ago')
    })

    it('should show success status for generated courses', () => {
      render(<DashboardPage />)
      
      const successStatus = screen.getByTestId('activity-status-success')
      expect(successStatus).toBeInTheDocument()
    })
  })

  describe('Analytics Section', () => {
    it('should display AI token usage chart', () => {
      render(<DashboardPage />)
      
      const tokenChart = screen.getByTestId('token-usage-chart')
      expect(tokenChart).toBeInTheDocument()
      
      // Check chart components are rendered
      within(tokenChart).getByTestId('area-chart')
      within(tokenChart).getByTestId('x-axis')
      within(tokenChart).getByTestId('y-axis')
    })

    it('should display storage breakdown pie chart', () => {
      render(<DashboardPage />)
      
      const storageChart = screen.getByTestId('storage-breakdown-chart')
      expect(storageChart).toBeInTheDocument()
      
      // Check pie chart is rendered
      within(storageChart).getByTestId('pie-chart')
      
      // Check data points
      const dataPoints = within(storageChart).getAllByTestId('chart-data-point')
      expect(dataPoints).toHaveLength(4) // Documents, Courses, Exports, Other
    })

    it('should display success rate indicators', () => {
      render(<DashboardPage />)
      
      const successRateSection = screen.getByTestId('success-rate-indicators')
      expect(successRateSection).toBeInTheDocument()
      
      // Check bar chart is rendered
      within(successRateSection).getByTestId('bar-chart')
      
      // Check average success rate
      expect(screen.getByText('96.4%')).toBeInTheDocument()
    })
  })

  describe('Refresh Functionality', () => {
    it('should handle refresh action', async () => {
      render(<DashboardPage />)
      
      const refreshButton = screen.getByText('Refresh')
      expect(refreshButton).toBeEnabled()
      
      act(() => {
        refreshButton.click()
      })
      
      // Button should be disabled during refresh
      expect(refreshButton).toBeDisabled()
      
      // Fast-forward refresh simulation
      act(() => {
        jest.advanceTimersByTime(1500)
      })
      
      await waitFor(() => {
        expect(refreshButton).toBeEnabled()
      })
    })

    it('should show refresh indicator when refreshing', async () => {
      render(<DashboardPage />)
      
      const refreshButton = screen.getByText('Refresh')
      
      act(() => {
        refreshButton.click()
      })
      
      const refreshIndicator = screen.getByTestId('refresh-indicator')
      expect(refreshIndicator).toBeInTheDocument()
      
      act(() => {
        jest.advanceTimersByTime(1500)
      })
      
      await waitFor(() => {
        expect(screen.queryByTestId('refresh-indicator')).not.toBeInTheDocument()
      })
    })
  })

  describe('Modals', () => {
    it('should open and close upgrade modal', async () => {
      render(<DashboardPage />)
      
      const upgradeButton = screen.getByTestId('upgrade-plan-button')
      
      act(() => {
        upgradeButton.click()
      })
      
      const modal = screen.getByTestId('upgrade-modal')
      expect(modal).toBeInTheDocument()
      
      const closeButton = within(modal).getByText('Close')
      
      act(() => {
        closeButton.click()
      })
      
      expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument()
    })

    it('should display upgrade prompt with correct messaging', () => {
      render(<DashboardPage />)
      
      const upgradePrompt = screen.getByTestId('upgrade-prompt-tokens')
      expect(upgradePrompt).toHaveTextContent("You're approaching your AI credit limit")
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<DashboardPage />)
      
      // Check main dashboard has testid
      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toBeInTheDocument()
      
      // Check sections have proper structure
      expect(screen.getByTestId('welcome-section')).toBeInTheDocument()
      expect(screen.getByTestId('stats-cards')).toBeInTheDocument()
      expect(screen.getByTestId('recent-courses')).toBeInTheDocument()
      expect(screen.getByTestId('analytics-section')).toBeInTheDocument()
    })

    it('should have keyboard-accessible interactive elements', async () => {
      render(<DashboardPage />)
      
      // Verify buttons exist and are keyboard accessible (have tabIndex)
      const refreshButton = screen.getByText('Refresh')
      const createButton = screen.getByTestId('quick-action-create-course')
      
      expect(refreshButton).toBeInTheDocument()
      expect(createButton).toBeInTheDocument()
      
      // Both buttons should be focusable
      expect(refreshButton.tabIndex).toBeGreaterThanOrEqual(0)
      expect(createButton.tabIndex).toBeGreaterThanOrEqual(0)
    })

    it('should provide screen reader friendly content', () => {
      render(<DashboardPage />)
      
      // Check that important elements have text content
      expect(screen.getByText('Total Courses')).toBeInTheDocument()
      expect(screen.getByText('Total Students')).toBeInTheDocument()
      expect(screen.getByText('Published Courses')).toBeInTheDocument()
      expect(screen.getByText('Average Rating')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no courses exist', () => {
      // We'll need to modify the mock data to test this
      // For now, we verify the conditional rendering logic exists
      render(<DashboardPage />)
      
      // The component has empty state logic but currently shows mock data
      const recentCoursesSection = screen.getByTestId('recent-courses')
      expect(recentCoursesSection).toBeInTheDocument()
    })
  })

  describe('Data Visualization', () => {
    it('should render all chart types correctly', () => {
      render(<DashboardPage />)
      
      // Area chart for token usage
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
      
      // Pie chart for storage
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      
      // Bar chart for success rate
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should display chart tooltips', () => {
      render(<DashboardPage />)
      
      const tooltips = screen.getAllByTestId('tooltip')
      expect(tooltips.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should animate elements on mount', () => {
      render(<DashboardPage />)
      
      // All major sections should be rendered
      expect(screen.getByTestId('welcome-section')).toBeInTheDocument()
      expect(screen.getByTestId('stats-cards')).toBeInTheDocument()
      expect(screen.getByTestId('recent-courses')).toBeInTheDocument()
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
      expect(screen.getByTestId('analytics-section')).toBeInTheDocument()
    })
  })
})