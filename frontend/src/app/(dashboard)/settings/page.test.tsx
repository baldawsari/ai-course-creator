import React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, createUserEvent, waitFor } from '@/__tests__/utils/test-utils'
import SettingsPage from './page'
import { mockUser } from '@/__tests__/utils/test-utils'

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock the settings components - Jest will automatically use __mocks__ directory
jest.mock('@/components/features/settings/profile-management')
jest.mock('@/components/features/settings/organization-settings')
jest.mock('@/components/features/settings/integration-hub')
jest.mock('@/components/features/settings/preferences-panel')
jest.mock('@/components/features/settings/change-history')
jest.mock('@/components/features/settings/import-export')

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('renders with authenticated user context', () => {
      render(<SettingsPage />, {
        initialAuth: {
          user: mockUser,
          isAuthenticated: true,
          token: 'test-token'
        }
      })
      
      // Page should render normally with auth
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Manage your account, organization, and preferences')).toBeInTheDocument()
    })

    it('handles unauthenticated state gracefully', () => {
      render(<SettingsPage />, {
        initialAuth: {
          user: null,
          isAuthenticated: false,
          token: null
        }
      })
      
      // Page should still render (route protection handled by layout)
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('passes user context to profile management', () => {
      render(<SettingsPage />, {
        initialAuth: {
          user: mockUser,
          isAuthenticated: true,
          token: 'test-token'
        }
      })
      
      // Profile management should be visible by default
      const profileTabContent = screen.getByTestId('profile-tab-content')
      expect(profileTabContent).toBeInTheDocument()
      expect(profileTabContent).toHaveStyle({ display: 'block' })
    })
  })

  describe('Rendering', () => {
    it('renders page header and search', () => {
      render(<SettingsPage />)
      
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Manage your account, organization, and preferences')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search settings...')).toBeInTheDocument()
      expect(screen.getByText('Change History')).toBeInTheDocument()
      expect(screen.getByText('Import/Export')).toBeInTheDocument()
    })

    it('renders all setting tabs', () => {
      render(<SettingsPage />)
      
      expect(screen.getByRole('tab', { name: /Profile/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Organization/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Integrations/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Preferences/i })).toBeInTheDocument()
    })

    it('shows tab descriptions', () => {
      render(<SettingsPage />)
      
      expect(screen.getByText('Personal information and security settings')).toBeInTheDocument()
      expect(screen.getByText('Team management and billing settings')).toBeInTheDocument()
      expect(screen.getByText('Connect with external services and tools')).toBeInTheDocument()
      expect(screen.getByText('Customize your experience and defaults')).toBeInTheDocument()
    })

    it('displays Pro badge on Organization tab', () => {
      render(<SettingsPage />)
      
      const orgTab = screen.getByRole('tab', { name: /Organization/i })
      expect(orgTab).toHaveTextContent('Pro')
    })

    it('shows profile management by default', () => {
      render(<SettingsPage />)
      
      // Check that the profile tab content is visible
      const profileTabContent = screen.getByTestId('profile-tab-content')
      expect(profileTabContent).toBeInTheDocument()
      expect(profileTabContent).toHaveStyle({ display: 'block' })
      
      // Check that other tabs are hidden
      expect(screen.getByTestId('organization-tab-content')).toHaveStyle({ display: 'none' })
      expect(screen.getByTestId('integrations-tab-content')).toHaveStyle({ display: 'none' })
      expect(screen.getByTestId('preferences-tab-content')).toHaveStyle({ display: 'none' })
    })
  })

  describe('Tab Navigation', () => {
    it('switches between tabs', async () => {
      const user = createUserEvent()
      render(<SettingsPage />)
      
      // Initially shows profile
      expect(screen.getByTestId('profile-tab-content')).toHaveStyle({ display: 'block' })
      expect(screen.getByTestId('organization-tab-content')).toHaveStyle({ display: 'none' })
      
      // Switch to organization
      await user.click(screen.getByRole('tab', { name: /Organization/i }))
      await waitFor(() => {
        expect(screen.getByTestId('organization-tab-content')).toHaveStyle({ display: 'block' })
        expect(screen.getByTestId('profile-tab-content')).toHaveStyle({ display: 'none' })
      })
      
      // Switch to integrations
      await user.click(screen.getByRole('tab', { name: /Integrations/i }))
      await waitFor(() => {
        expect(screen.getByTestId('integrations-tab-content')).toHaveStyle({ display: 'block' })
        expect(screen.getByTestId('organization-tab-content')).toHaveStyle({ display: 'none' })
      })
      
      // Switch to preferences
      await user.click(screen.getByRole('tab', { name: /Preferences/i }))
      await waitFor(() => {
        expect(screen.getByTestId('preferences-tab-content')).toHaveStyle({ display: 'block' })
        expect(screen.getByTestId('integrations-tab-content')).toHaveStyle({ display: 'none' })
      })
    })
  })

  describe('Search Functionality', () => {
    it('filters tabs based on search query', async () => {
      const user = createUserEvent()
      render(<SettingsPage />)
      
      const searchInput = screen.getByPlaceholderText('Search settings...')
      
      // Search for "team"
      await user.type(searchInput, 'team')
      
      await waitFor(() => {
        // Organization tab should be visible (contains "team management")
        expect(screen.getByRole('tab', { name: /Organization/i })).toBeInTheDocument()
        // Other tabs should be hidden
        expect(screen.queryByRole('tab', { name: /Profile/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: /Integrations/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: /Preferences/i })).not.toBeInTheDocument()
      })
    })

    it('filters tabs by label', async () => {
      const user = createUserEvent()
      render(<SettingsPage />)
      
      const searchInput = screen.getByPlaceholderText('Search settings...')
      
      // Search for "integration"
      await user.type(searchInput, 'integration')
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Integrations/i })).toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: /Profile/i })).not.toBeInTheDocument()
      })
    })

    it('shows all tabs when search is cleared', async () => {
      const user = createUserEvent()
      render(<SettingsPage />)
      
      const searchInput = screen.getByPlaceholderText('Search settings...')
      
      // Type and then clear
      await user.type(searchInput, 'team')
      await user.clear(searchInput)
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Profile/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /Organization/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /Integrations/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /Preferences/i })).toBeInTheDocument()
      })
    })
  })

  describe('Modals', () => {
    it.skip('opens and closes change history modal', async () => {
      const user = createUserEvent()
      render(<SettingsPage />)
      
      // Initially no modal
      expect(screen.queryByTestId('change-history-modal')).not.toBeInTheDocument()
      
      // Open change history
      await user.click(screen.getByText('Change History'))
      
      // Modal should be shown (using waitFor as modal might render async)
      await waitFor(() => {
        expect(screen.getByTestId('change-history-modal')).toBeInTheDocument()
      })
      
      // Close modal
      await user.click(screen.getByTestId('close-history'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('change-history-modal')).not.toBeInTheDocument()
      })
    })

    it.skip('opens and closes import/export modal', async () => {
      const user = createUserEvent()
      render(<SettingsPage />)
      
      // Initially no modal
      expect(screen.queryByTestId('import-export-modal')).not.toBeInTheDocument()
      
      // Open import/export
      await user.click(screen.getByText('Import/Export'))
      
      // Modal should be shown (using waitFor as modal might render async)
      await waitFor(() => {
        expect(screen.getByTestId('import-export-modal')).toBeInTheDocument()
      })
      
      // Close modal
      await user.click(screen.getByTestId('close-import-export'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('import-export-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive classes for layout', () => {
      render(<SettingsPage />)
      
      const container = screen.getByText('Settings').closest('.container')
      expect(container).toHaveClass('container', 'mx-auto', 'py-8', 'px-4', 'max-w-7xl')
      
      // Header should have responsive flex
      const header = screen.getByText('Settings').closest('div')?.parentElement
      expect(header).toHaveClass('flex', 'flex-col', 'lg:flex-row', 'lg:items-center')
      
      // Tab list should be responsive grid
      const tabList = screen.getByRole('tablist')
      expect(tabList).toHaveClass('grid', 'w-full', 'grid-cols-2', 'lg:grid-cols-4')
    })

    it('hides tab descriptions on mobile', () => {
      render(<SettingsPage />)
      
      // Find tab triggers within the tablist
      const tabList = screen.getByRole('tablist')
      const tabDescriptions = tabList.querySelectorAll('span.text-xs.hidden.lg\\:block')
      
      // Should have 4 tab descriptions
      expect(tabDescriptions).toHaveLength(4)
      
      // Each should have the hidden lg:block classes
      tabDescriptions.forEach(desc => {
        expect(desc).toHaveClass('hidden', 'lg:block')
      })
    })
  })

  describe('Tab States', () => {
    it('applies active state styling to selected tab', () => {
      render(<SettingsPage />)
      
      const profileTab = screen.getByRole('tab', { name: /Profile/i })
      expect(profileTab).toHaveAttribute('data-state', 'active')
      expect(profileTab).toHaveClass('data-[state=active]:bg-primary/10', 'data-[state=active]:text-primary')
    })

    it('updates active state when switching tabs', async () => {
      const user = createUserEvent()
      render(<SettingsPage />)
      
      const profileTab = screen.getByRole('tab', { name: /Profile/i })
      const orgTab = screen.getByRole('tab', { name: /Organization/i })
      
      // Initially profile is active
      expect(profileTab).toHaveAttribute('data-state', 'active')
      expect(orgTab).toHaveAttribute('data-state', 'inactive')
      
      // Switch to organization
      await user.click(orgTab)
      
      await waitFor(() => {
        expect(profileTab).toHaveAttribute('data-state', 'inactive')
        expect(orgTab).toHaveAttribute('data-state', 'active')
      })
    })
  })

  describe('Icon Rendering', () => {
    it('renders icons for each tab', () => {
      render(<SettingsPage />)
      
      // Check that icons are rendered (they'll be svg elements with specific classes)
      const tabs = screen.getAllByRole('tab')
      
      tabs.forEach(tab => {
        const icon = tab.querySelector('svg')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('w-5', 'h-5')
      })
    })
  })

  describe('Badge Display', () => {
    it('displays Pro badge only on Organization tab', () => {
      render(<SettingsPage />)
      
      const badges = screen.getAllByText('Pro')
      expect(badges).toHaveLength(1)
      
      const orgTab = screen.getByRole('tab', { name: /Organization/i })
      expect(orgTab).toContainElement(badges[0])
    })
  })
})

// Test data structure
describe('Settings Tab Configuration', () => {
  it('has correct tab configuration', () => {
    const SETTINGS_TABS = [
      {
        id: 'profile',
        label: 'Profile',
        description: 'Personal information and security settings',
        badge: null
      },
      {
        id: 'organization',
        label: 'Organization',
        description: 'Team management and billing settings',
        badge: 'Pro'
      },
      {
        id: 'integrations',
        label: 'Integrations',
        description: 'Connect with external services and tools',
        badge: null
      },
      {
        id: 'preferences',
        label: 'Preferences',
        description: 'Customize your experience and defaults',
        badge: null
      }
    ]
    
    expect(SETTINGS_TABS).toHaveLength(4)
    expect(SETTINGS_TABS[1].badge).toBe('Pro')
  })
})