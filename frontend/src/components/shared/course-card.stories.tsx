import type { Meta, StoryObj } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { CourseCard } from './course-card'

const meta: Meta<typeof CourseCard> = {
  title: 'Shared/CourseCard',
  component: CourseCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An interactive course card component with hover effects, progress tracking, and action menus. Displays course metadata and provides quick actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    course: {
      description: 'Course data object',
    },
    onClick: {
      description: 'Handler for card click events',
    },
    onEdit: {
      description: 'Handler for edit action',
    },
    onDelete: {
      description: 'Handler for delete action',
    },
    onExport: {
      description: 'Handler for export action',
    },
    showProgress: {
      control: 'boolean',
      description: 'Whether to show progress indicator',
    },
    compact: {
      control: 'boolean',
      description: 'Whether to use compact layout',
    },
  },
  args: {
    onClick: action('course-clicked'),
    onEdit: action('course-edited'),
    onDelete: action('course-deleted'),
    onExport: action('course-exported'),
  },
}

export default meta
type Story = StoryObj<typeof meta>

const baseCourse = {
  id: 'course-123',
  title: 'JavaScript Fundamentals',
  description: 'Learn the core concepts of JavaScript programming including variables, functions, objects, and modern ES6+ features.',
  status: 'published' as const,
  difficulty: 'beginner' as const,
  estimatedDuration: 180,
  sessions: [
    { id: '1', title: 'Introduction', activities: [{ id: '1', title: 'Overview' }] },
    { id: '2', title: 'Variables', activities: [{ id: '2', title: 'Declaring Variables' }] },
    { id: '3', title: 'Functions', activities: [{ id: '3', title: 'Function Basics' }] },
  ],
  userId: 'user-123',
  metadata: {
    studentCount: 245,
    completionRate: 87,
    averageRating: 4.6,
    lastAccessed: new Date('2024-01-15').toISOString(),
  },
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-15').toISOString(),
}

export const Default: Story = {
  args: {
    course: baseCourse,
  },
}

export const Draft: Story = {
  args: {
    course: {
      ...baseCourse,
      title: 'React Advanced Patterns',
      status: 'draft' as const,
      difficulty: 'advanced' as const,
      metadata: {
        ...baseCourse.metadata,
        studentCount: 0,
        completionRate: 0,
        averageRating: 0,
      },
    },
  },
}

export const InProgress: Story = {
  args: {
    course: {
      ...baseCourse,
      title: 'Node.js Backend Development',
      status: 'generating' as const,
      difficulty: 'intermediate' as const,
      metadata: {
        ...baseCourse.metadata,
        generationProgress: 65,
      },
    },
    showProgress: true,
  },
}

export const Archived: Story = {
  args: {
    course: {
      ...baseCourse,
      title: 'Legacy PHP Course',
      status: 'archived' as const,
      metadata: {
        ...baseCourse.metadata,
        studentCount: 50,
        completionRate: 95,
        averageRating: 4.2,
        lastAccessed: new Date('2023-06-01').toISOString(),
      },
    },
  },
}

export const HighRated: Story = {
  args: {
    course: {
      ...baseCourse,
      title: 'Python Data Science Masterclass',
      difficulty: 'intermediate' as const,
      estimatedDuration: 420,
      metadata: {
        ...baseCourse.metadata,
        studentCount: 1250,
        completionRate: 92,
        averageRating: 4.9,
      },
    },
  },
}

export const LongTitle: Story = {
  args: {
    course: {
      ...baseCourse,
      title: 'Complete Full-Stack Web Development Bootcamp: From Zero to Production with React, Node.js, and Modern DevOps',
      description: 'An extremely comprehensive course covering everything you need to know about modern web development, including frontend frameworks, backend services, databases, deployment strategies, and much more.',
      estimatedDuration: 2400, // 40 hours
    },
  },
}

export const CompactLayout: Story = {
  args: {
    course: baseCourse,
    compact: true,
  },
}

export const WithProgress: Story = {
  args: {
    course: {
      ...baseCourse,
      status: 'generating' as const,
      metadata: {
        ...baseCourse.metadata,
        generationProgress: 45,
      },
    },
    showProgress: true,
  },
}

export const AllStatuses: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 max-w-7xl">
      <CourseCard
        course={{ ...baseCourse, status: 'draft' as const, title: 'Draft Course' }}
        onClick={action('draft-clicked')}
      />
      <CourseCard
        course={{ ...baseCourse, status: 'generating' as const, title: 'Generating Course', metadata: { ...baseCourse.metadata, generationProgress: 30 } }}
        onClick={action('generating-clicked')}
        showProgress={true}
      />
      <CourseCard
        course={{ ...baseCourse, status: 'published' as const, title: 'Published Course' }}
        onClick={action('published-clicked')}
      />
      <CourseCard
        course={{ ...baseCourse, status: 'archived' as const, title: 'Archived Course' }}
        onClick={action('archived-clicked')}
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'All available course statuses displayed in a grid layout.',
      },
    },
  },
}

export const DifficultyLevels: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-w-4xl">
      <CourseCard
        course={{ ...baseCourse, difficulty: 'beginner' as const, title: 'Beginner Course' }}
        onClick={action('beginner-clicked')}
      />
      <CourseCard
        course={{ ...baseCourse, difficulty: 'intermediate' as const, title: 'Intermediate Course' }}
        onClick={action('intermediate-clicked')}
      />
      <CourseCard
        course={{ ...baseCourse, difficulty: 'advanced' as const, title: 'Advanced Course' }}
        onClick={action('advanced-clicked')}
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Course cards showing all difficulty levels.',
      },
    },
  },
}

export const InteractiveDemo: Story = {
  render: () => (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Interactive Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <CourseCard
            course={baseCourse}
            onClick={action('card-clicked')}
            onEdit={action('edit-clicked')}
            onDelete={action('delete-clicked')}
            onExport={action('export-clicked')}
          />
          <CourseCard
            course={{
              ...baseCourse,
              title: 'Hover for Actions',
              description: 'Hover over this card to see the action menu appear.',
            }}
            onClick={action('hover-card-clicked')}
            onEdit={action('hover-edit-clicked')}
            onDelete={action('hover-delete-clicked')}
            onExport={action('hover-export-clicked')}
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Different States</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <CourseCard
            course={{
              ...baseCourse,
              status: 'generating' as const,
              title: 'Generating Course',
              metadata: {
                ...baseCourse.metadata,
                generationProgress: 75,
              },
            }}
            showProgress={true}
            onClick={action('generating-clicked')}
          />
          <CourseCard
            course={{
              ...baseCourse,
              title: 'Compact Layout',
              description: 'This card uses the compact layout option.',
            }}
            compact={true}
            onClick={action('compact-clicked')}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Demonstration of interactive features and different card states.',
      },
    },
  },
}

export const AccessibilityDemo: Story = {
  render: () => (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Keyboard Navigation</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use Tab to navigate between cards and action buttons. Press Enter or Space to activate.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <CourseCard
            course={{ ...baseCourse, title: 'Accessible Card 1' }}
            onClick={action('accessible-1-clicked')}
            onEdit={action('accessible-1-edited')}
          />
          <CourseCard
            course={{ ...baseCourse, title: 'Accessible Card 2', difficulty: 'advanced' as const }}
            onClick={action('accessible-2-clicked')}
            onEdit={action('accessible-2-edited')}
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Screen Reader Support</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Cards include proper ARIA labels and semantic markup for screen readers.
        </p>
        <CourseCard
          course={{
            ...baseCourse,
            title: 'Screen Reader Optimized',
            description: 'This card includes enhanced accessibility features.',
          }}
          onClick={action('accessible-clicked')}
          aria-label="JavaScript Fundamentals course card. Beginner level. 3 hours duration. 245 students enrolled."
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Demonstrates accessibility features including keyboard navigation and screen reader support.',
      },
    },
  },
}