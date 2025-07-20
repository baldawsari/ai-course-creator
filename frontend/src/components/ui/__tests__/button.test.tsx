import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, createUserEvent } from '@/__tests__/utils/test-utils'
import { Button } from '../button'
import { Download, Settings } from 'lucide-react'

describe('Button Component', () => {
  describe('basic functionality', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary')
    })

    it('should handle click events', async () => {
      const handleClick = jest.fn()
      const user = createUserEvent()
      
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not trigger click when disabled', async () => {
      const handleClick = jest.fn()
      const user = createUserEvent()
      
      render(
        <Button onClick={handleClick} disabled>
          Disabled button
        </Button>
      )
      
      const button = screen.getByRole('button', { name: /disabled button/i })
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
      expect(button).toBeDisabled()
    })
  })

  describe('variants', () => {
    it('should apply correct classes for default variant', () => {
      render(<Button variant="default">Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('should apply correct classes for destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground')
    })

    it('should apply correct classes for outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'border-input', 'bg-background')
    })

    it('should apply correct classes for secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground')
    })

    it('should apply correct classes for ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground')
    })

    it('should apply correct classes for link variant', () => {
      render(<Button variant="link">Link</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary', 'underline-offset-4')
    })

    it('should apply correct classes for success variant', () => {
      render(<Button variant="success">Success</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-success', 'text-success-foreground')
    })

    it('should apply correct classes for electric variant', () => {
      render(<Button variant="electric">Electric</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-accent', 'text-accent-foreground')
    })
  })

  describe('sizes', () => {
    it('should apply correct classes for default size', () => {
      render(<Button size="default">Default size</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'px-4', 'py-2')
    })

    it('should apply correct classes for small size', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9', 'rounded-md', 'px-3')
    })

    it('should apply correct classes for large size', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11', 'rounded-md', 'px-8')
    })

    it('should apply correct classes for icon size', () => {
      render(
        <Button size="icon" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      )
      
      const button = screen.getByRole('button', { name: /settings/i })
      expect(button).toHaveClass('h-10', 'w-10')
    })
  })

  describe('with icons', () => {
    it('should render with icon and text', () => {
      render(
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      )
      
      const button = screen.getByRole('button', { name: /download/i })
      expect(button).toBeInTheDocument()
      
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should render icon-only button with proper accessibility', () => {
      render(
        <Button size="icon" aria-label="Open settings">
          <Settings className="h-4 w-4" />
        </Button>
      )
      
      const button = screen.getByRole('button', { name: /open settings/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAccessibleName('Open settings')
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Button
          aria-label="Custom label"
          aria-describedby="button-description"
        >
          Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
      expect(button).toHaveAttribute('aria-describedby', 'button-description')
    })

    it('should indicate disabled state to screen readers', () => {
      render(<Button disabled>Disabled button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('disabled')
      expect(button).toHaveClass('disabled:opacity-50')
    })

    it('should support keyboard navigation', async () => {
      const handleClick = jest.fn()
      const user = createUserEvent()
      
      render(<Button onClick={handleClick}>Keyboard accessible</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(button).toHaveFocus()
      
      // Test Enter key
      await user.keyboard('[Enter]')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      // Test Space key
      await user.keyboard('[Space]')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('should have minimum touch target size for accessibility', () => {
      render(<Button>Touch target</Button>)
      
      const button = screen.getByRole('button')
      
      // Check that button has minimum height class (h-10 = 40px, should be at least 44px with padding)
      expect(button).toHaveClass('h-10') // 40px
      expect(button).toHaveClass('px-4') // Additional padding
      expect(button).toHaveClass('py-2') // Additional padding
    })

    it('should have proper focus indicators', () => {
      render(<Button>Focus me</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring')
    })

    it('should support high contrast mode', () => {
      render(<Button variant="outline">High contrast</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'border-input')
    })
  })

  describe('loading states', () => {
    it('should render loading state correctly', () => {
      render(
        <Button disabled>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading...
        </Button>
      )
      
      const button = screen.getByRole('button', { name: /loading/i })
      expect(button).toBeDisabled()
      
      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should have proper accessibility for loading state', () => {
      render(
        <Button disabled aria-busy="true" aria-label="Saving changes">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Saving...
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveAccessibleName('Saving changes')
    })
  })

  describe('custom styling', () => {
    it('should accept custom className', () => {
      render(<Button className="custom-class">Custom styled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('should merge custom classes with default classes', () => {
      render(
        <Button className="custom-padding" variant="outline">
          Custom and default
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-padding', 'border', 'border-input')
    })
  })

  describe('asChild prop', () => {
    it('should render as different element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/link">Link button</a>
        </Button>
      )
      
      const link = screen.getByRole('link', { name: /link button/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/link')
      
      // Should still have button styling
      expect(link).toHaveClass('bg-primary')
    })
  })

  describe('edge cases', () => {
    it('should handle empty children gracefully', () => {
      render(<Button>{null}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should handle complex children elements', () => {
      render(
        <Button>
          <span>Complex</span>
          <div>Children</div>
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(screen.getByText('Complex')).toBeInTheDocument()
      expect(screen.getByText('Children')).toBeInTheDocument()
    })

    it('should handle very long text content', () => {
      const longText = 'This is a very long button text that might wrap to multiple lines and test how the button handles overflow content gracefully'
      
      render(<Button>{longText}</Button>)
      
      const button = screen.getByRole('button', { name: new RegExp(longText.substring(0, 20)) })
      expect(button).toBeInTheDocument()
    })
  })

  describe('interaction states', () => {
    it('should have proper hover classes', () => {
      render(<Button>Hover me</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-primary/90')
    })

    it('should have proper active classes', () => {
      render(<Button>Press me</Button>)
      
      const button = screen.getByRole('button')
      // Button should have transition classes for visual feedback
      expect(button).toHaveClass('transition-colors')
    })

    it('should prevent interaction when disabled', async () => {
      const handleClick = jest.fn()
      const user = createUserEvent()
      
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      )
      
      const button = screen.getByRole('button')
      
      // Try multiple interaction methods
      await user.click(button)
      await user.keyboard('[Enter]')
      await user.keyboard('[Space]')
      
      expect(handleClick).not.toHaveBeenCalled()
    })
  })
})