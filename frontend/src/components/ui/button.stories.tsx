import type { Meta, StoryObj } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { Button } from './button'
import { Heart, Download, Plus, Settings } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and states. Built with Radix UI primitives for accessibility and keyboard navigation.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'electric'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'select', 
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    asChild: {
      control: 'boolean',
      description: 'Render as a child component',
    },
  },
  args: {
    onClick: action('clicked'),
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Basic variants
export const Default: Story = {
  args: {
    children: 'Default Button',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Course',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Cancel',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Action',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link Button',
  },
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Save Changes',
  },
}

export const Electric: Story = {
  args: {
    variant: 'electric',
    children: 'Generate Course',
  },
}

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
}

export const Icon: Story = {
  args: {
    size: 'icon',
    children: <Settings className="h-4 w-4" />,
  },
}

// With icons
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Download className="mr-2 h-4 w-4" />
        Download Course
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: <Heart className="h-4 w-4" />,
    'aria-label': 'Like course',
  },
}

// States
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
}

export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Generating...
      </>
    ),
  },
}

// Interactive examples
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="success">Success</Button>
      <Button variant="electric">Electric</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants displayed together for comparison.',
      },
    },
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button sizes displayed together for comparison.',
      },
    },
  },
}

export const CourseActions: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <Button variant="electric" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Create New Course
      </Button>
      <Button variant="default" className="w-full">
        <Download className="mr-2 h-4 w-4" />
        Export Course
      </Button>
      <Button variant="outline" className="w-full">
        <Settings className="mr-2 h-4 w-4" />
        Course Settings
      </Button>
      <Button variant="destructive" className="w-full">
        Delete Course
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Common course management actions showing real-world usage patterns.',
      },
    },
  },
}

// Accessibility demonstration
export const AccessibilityDemo: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Keyboard Navigation</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Use Tab to navigate between buttons, Space or Enter to activate.
        </p>
        <div className="flex gap-2">
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Screen Reader Support</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Buttons include proper ARIA labels and descriptions.
        </p>
        <div className="flex gap-2">
          <Button aria-label="Save current course progress">
            Save
          </Button>
          <Button 
            aria-label="Delete course permanently" 
            aria-describedby="delete-help"
            variant="destructive"
          >
            Delete
          </Button>
          <div id="delete-help" className="sr-only">
            This action cannot be undone
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper accessibility features including keyboard navigation and screen reader support.',
      },
    },
  },
}