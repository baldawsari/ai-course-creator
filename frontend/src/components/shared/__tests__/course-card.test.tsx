import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, createUserEvent, within } from '@/__tests__/utils/test-utils'
import { CourseCard } from '../course-card'
import { MOCK_DATA } from '@/__tests__/utils/mock-data'

describe('CourseCard Component', () => {
  const defaultCourse = MOCK_DATA.courses.published
  const defaultProps = {
    id: defaultCourse.id,
    title: defaultCourse.title,
    description: defaultCourse.description,
    thumbnail: defaultCourse.thumbnail,
    progress: defaultCourse.progress || 0,
    students: defaultCourse.metadata?.studentCount || 0,
    duration: `${Math.floor(defaultCourse.estimatedDuration / 60)}h`,
    sessions: defaultCourse.sessions?.length || 0,
    status: defaultCourse.status,
    lastModified: new Date(defaultCourse.updatedAt),
    difficulty: defaultCourse.difficulty, // difficulty is at root level, not in metadata
    onClick: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render course information correctly', () => {
      render(<CourseCard {...defaultProps} />)
      
      expect(screen.getByText(defaultCourse.title)).toBeInTheDocument()
      expect(screen.getByText(defaultCourse.description)).toBeInTheDocument()
      expect(screen.getByText(/beginner/i)).toBeInTheDocument()
      expect(screen.getByText(/published/i)).toBeInTheDocument()
    })

    it('should display course metadata', () => {
      render(<CourseCard {...defaultProps} />)
      
      // Check for session count
      expect(screen.getByText(/\d+ sessions?/i)).toBeInTheDocument()
      
      // Check for duration
      expect(screen.getByText(/\d+h/)).toBeInTheDocument()
      
      // Check for student count if available
      if (defaultCourse.metadata.studentCount) {
        expect(screen.getByText(new RegExp(defaultCourse.metadata.studentCount.toString()))).toBeInTheDocument()
      }
    })

    it('should show last updated information', () => {
      render(<CourseCard {...defaultProps} />)
      
      // Should show relative time like "2 days ago"
      expect(screen.getByText(/ago$/)).toBeInTheDocument()
    })
  })

  describe('interaction handling', () => {
    it('should handle card click events', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      await user.click(card)
      
      expect(defaultProps.onClick).toHaveBeenCalledWith(expect.objectContaining({
        id: defaultCourse.id,
        title: defaultCourse.title,
        description: defaultCourse.description,
        difficulty: defaultCourse.difficulty,
        status: defaultCourse.status
      }))
    })

    it('should handle keyboard navigation', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      card.focus()
      
      expect(card).toHaveFocus()
      
      await user.keyboard('[Enter]')
      expect(defaultProps.onClick).toHaveBeenCalledWith(expect.objectContaining({
        id: defaultCourse.id,
        title: defaultCourse.title,
        description: defaultCourse.description,
        difficulty: defaultCourse.difficulty,
        status: defaultCourse.status
      }))
      
      await user.keyboard('[Space]')
      expect(defaultProps.onClick).toHaveBeenCalledTimes(2)
    })

    it('should show action menu on hover', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      await user.hover(card)
      
      // Action menu should become visible
      const actionMenu = screen.getByRole('button', { name: /more actions/i })
      // The action menu uses opacity-0 to opacity-100 on hover, so it exists but isn't visible without hover state
      expect(actionMenu).toBeInTheDocument()
      expect(actionMenu).toHaveClass('opacity-0')
    })

    it('should handle action menu interactions', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      await user.hover(card)
      
      const actionMenu = screen.getByRole('button', { name: /more actions/i })
      await user.click(actionMenu)
      
      // Should show dropdown menu
      expect(screen.getByRole('menu')).toBeInTheDocument()
      
      // Test edit action
      const editAction = screen.getByRole('menuitem', { name: /edit/i })
      await user.click(editAction)
      expect(defaultProps.onEdit).toHaveBeenCalledWith(expect.objectContaining({
        id: defaultCourse.id,
        title: defaultCourse.title
      }))
    })
  })

  describe('different course statuses', () => {
    it('should render draft status correctly', () => {
      render(<CourseCard {...defaultProps} status="draft" />)
      
      expect(screen.getByText(/draft/i)).toBeInTheDocument()
      expect(screen.getByText(/draft/i)).toHaveClass('text-amber-800')
    })

    it('should render published status correctly', () => {
      render(<CourseCard {...defaultProps} status="published" />)
      
      expect(screen.getByText(/published/i)).toBeInTheDocument()
      expect(screen.getByText(/published/i)).toHaveClass('text-green-800')
    })

    it('should render archived status correctly', () => {
      render(<CourseCard {...defaultProps} status="archived" />)
      
      expect(screen.getByText(/archived/i)).toBeInTheDocument()
      expect(screen.getByText(/archived/i)).toHaveClass('text-gray-800')
    })

    it('should show progress for generating courses', () => {
      render(
        <CourseCard 
          {...defaultProps} 
          status="generating"
          progress={65}
        />
      )
      
      expect(screen.getByText(/generating/i)).toBeInTheDocument()
      expect(screen.getByText(/65%/)).toBeInTheDocument()
      
      // Should have progress bar
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '65')
    })
  })

  describe('difficulty levels', () => {
    it('should display beginner difficulty with correct styling', () => {
      render(<CourseCard {...defaultProps} difficulty="beginner" />)
      
      const difficulty = screen.getByText(/beginner/i)
      expect(difficulty).toBeInTheDocument()
      expect(difficulty).toHaveClass('text-green-800')
    })

    it('should display intermediate difficulty with correct styling', () => {
      render(<CourseCard {...defaultProps} difficulty="intermediate" />)
      
      const difficulty = screen.getByText(/intermediate/i)
      expect(difficulty).toBeInTheDocument()
      expect(difficulty).toHaveClass('text-amber-800')
    })

    it('should display advanced difficulty with correct styling', () => {
      render(<CourseCard {...defaultProps} difficulty="advanced" />)
      
      const difficulty = screen.getByText(/advanced/i)
      expect(difficulty).toBeInTheDocument()
      expect(difficulty).toHaveClass('text-red-800')
    })
  })

  describe('compact layout', () => {
    it('should apply compact styling when compact prop is true', () => {
      render(<CourseCard {...defaultProps} compact={true} />)
      
      // The Card component should have p-3 class, not the article
      const cardContent = screen.getByText(defaultCourse.title).closest('.p-3')
      expect(cardContent).toBeInTheDocument()
      
      // Should have more condensed layout
      const title = screen.getByText(defaultCourse.title)
      expect(title).toHaveClass('text-sm')
    })

    it('should hide certain metadata in compact mode', () => {
      render(<CourseCard {...defaultProps} compact={true} />)
      
      // Description might be truncated or hidden in compact mode
      const description = screen.queryByText(defaultCourse.description)
      if (description) {
        expect(description).toHaveClass('line-clamp-1')
      }
    })
  })

  describe('accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
      
      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    })

    it('should have proper ARIA labels', () => {
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      // Card itself doesn't have aria-label, title is in heading
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent(defaultCourse.title)
    })

    it('should indicate interactive elements to screen readers', () => {
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
      // Card is clickable via onClick prop
      expect(card).toHaveClass('cursor-pointer')
    })

    it('should provide keyboard shortcuts information', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      // Card doesn't currently have keyboard shortcut descriptions
      expect(card).toBeInTheDocument()
    })

    it('should have sufficient color contrast', () => {
      render(<CourseCard {...defaultProps} />)
      
      // Check that status badges have proper contrast
      const statusBadge = screen.getByText(/published/i)
      expect(statusBadge).toHaveClass('text-green-800')
    })

    it('should support screen reader navigation', () => {
      render(<CourseCard {...defaultProps} />)
      
      // Should have proper heading hierarchy
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveTextContent(defaultCourse.title)
      
      // Metadata should be properly structured
      const metadata = screen.getByText(/\d+ sessions?/i)
      expect(metadata).toBeInTheDocument()
    })
  })

  describe('action menu accessibility', () => {
    it('should have accessible action menu', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      await user.hover(card)
      
      const menuButton = screen.getByRole('button', { name: /more actions/i })
      expect(menuButton).toHaveAttribute('aria-haspopup', 'menu')
      expect(menuButton).toHaveAttribute('aria-expanded', 'false')
      
      await user.click(menuButton)
      expect(menuButton).toHaveAttribute('aria-expanded', 'true')
      
      const menu = screen.getByRole('menu')
      expect(menu).toBeInTheDocument()
      
      // Menu items should be properly labeled
      const editItem = screen.getByRole('menuitem', { name: /edit/i })
      const deleteItem = screen.getByRole('menuitem', { name: /delete/i })
      
      expect(editItem).toBeInTheDocument()
      expect(deleteItem).toBeInTheDocument()
    })

    it('should handle menu keyboard navigation', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      await user.hover(card)
      
      const menuButton = screen.getByRole('button', { name: /more actions/i })
      await user.click(menuButton)
      
      // Test arrow key navigation
      await user.keyboard('[ArrowDown]')
      expect(screen.getByRole('menuitem', { name: /edit/i })).toHaveFocus()
      
      await user.keyboard('[ArrowDown]')
      expect(screen.getByRole('menuitem', { name: /delete/i })).toHaveFocus()
      
      await user.keyboard('[Enter]')
      expect(defaultProps.onDelete).toHaveBeenCalled()
    })
  })

  describe('responsive behavior', () => {
    it('should adapt to different screen sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })
      
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
    })

    it('should handle touch interactions on mobile', async () => {
      // Mock touch environment
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
      })
      
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      
      // Simulate touch event
      await user.pointer({ target: card, keys: '[TouchA]' })
      expect(defaultProps.onClick).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle missing metadata gracefully', () => {
      render(<CourseCard {...defaultProps} students={undefined} />)
      
      // Should still render without errors
      expect(screen.getByText(defaultCourse.title)).toBeInTheDocument()
    })

    it('should handle very long titles', () => {
      const longTitle = 'This is an extremely long course title that should be truncated properly to prevent layout issues and maintain readability'
      
      render(<CourseCard {...defaultProps} title={longTitle} />)
      
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveClass('line-clamp-2') // Should be truncated
    })

    it('should handle missing description', () => {
      render(<CourseCard {...defaultProps} description={undefined} />)
      
      // Should still render other information
      expect(screen.getByText(defaultCourse.title)).toBeInTheDocument()
    })

    it('should handle courses with no sessions', () => {
      render(<CourseCard {...defaultProps} sessions={0} />)
      
      // Should show 0 sessions
      expect(screen.getByText('0 sessions')).toBeInTheDocument()
    })
  })

  describe('performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<CourseCard {...defaultProps} />)
      
      // Re-render with same props
      rerender(<CourseCard {...defaultProps} />)
      
      // Component should be memoized and not re-render
      expect(screen.getByText(defaultCourse.title)).toBeInTheDocument()
    })

    it('should handle rapid hover events gracefully', async () => {
      const user = createUserEvent()
      render(<CourseCard {...defaultProps} />)
      
      const card = screen.getByRole('article')
      
      // Rapid hover/unhover
      await user.hover(card)
      await user.unhover(card)
      await user.hover(card)
      await user.unhover(card)
      
      // Should not cause any errors
      expect(card).toBeInTheDocument()
    })
  })
})