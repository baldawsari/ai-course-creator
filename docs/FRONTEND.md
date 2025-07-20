# FRONTEND.md

Frontend architecture, components, state management, and UI design system for the AI Course Creator Next.js 14 application.

## Frontend Architecture

### Technology Stack

**Core Framework:**
- **Next.js 14** with App Router and React 18
- **TypeScript** for type safety
- **Tailwind CSS** with custom design system

**State Management:**
- **Zustand** for client-side state (auth, courses, UI)
- **TanStack Query** for server state and caching
- **React Hook Form** with **Zod** validation

**UI Components:**
- **Radix UI** primitives for accessibility
- **Shadcn/ui** component library
- **Framer Motion** for animations
- **Lucide React** for icons

## Project Structure

```
frontend/src/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Auth pages (login, register, forgot-password)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── dashboard/     # Main dashboard
│   │   ├── settings/      # Settings interface
│   │   ├── exports/       # Export management
│   │   └── courses/       # Course management
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Shadcn/ui base components
│   ├── layout/            # Layout components (headers, sidebars)
│   ├── features/          # Feature-specific components
│   ├── shared/            # Reusable components
│   └── mobile/            # Mobile-optimized components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
│   ├── api/              # API client and hooks
│   ├── stores/           # Zustand stores
│   ├── utils/            # Utility functions
│   └── pwa/              # PWA-related code
└── types/                # TypeScript type definitions
```

## Key Design Patterns

### State Management

**Zustand Stores:**
- **Auth Store**: Session management, user profile, activity tracking
- **Course Store**: Course CRUD operations with Immer integration
- **UI Store**: Theme, modals, notifications, layout state
- **Generation Store**: Real-time job tracking with WebSocket integration

**TanStack Query:**
- Automatic caching with 5-minute stale time
- Background refetching and optimistic updates
- Custom hooks for all API endpoints

### Component Architecture

**Component Categories:**
1. **UI Components**: Base Shadcn/ui components with custom theming
2. **Layout Components**: Dashboard layouts, navigation, headers
3. **Feature Components**: Business logic components (course builder, editor, etc.)
4. **Shared Components**: Reusable components like cards, modals, file uploaders
5. **Mobile Components**: Touch-optimized components with gesture support

### Custom Design System

**Brand Colors:**
- Royal Purple: `#7C3AED` (primary brand color)
- Golden Amber: `#F59E0B` (accents and highlights)
- Sky Blue: `#06B6D4` (secondary actions)
- Dark theme support with CSS variables

**Typography:**
- System font stack for performance
- Responsive sizing with Tailwind classes
- Consistent heading hierarchy

## Key Features

### Course Builder (`/courses/[id]/builder`)
Multi-step course creation wizard with:
- Resource upload and management
- Course configuration forms
- AI generation controls
- Live preview panel

### Content Editor (`/courses/[id]/edit`)
Professional course editing interface with:
- Kanban-style session management
- Block-based rich content editor
- AI enhancement suggestions
- Real-time collaboration
- Version history

### Settings Interface (`/settings`)
Comprehensive settings management:
- Profile and security settings
- Organization management
- Integration hub (LMS, storage, analytics)
- UI preferences and shortcuts

### Export Management (`/exports`)
Export hub with:
- Multi-format export (HTML, PDF, PowerPoint)
- Progress tracking
- Distribution tools
- Analytics dashboard

## Development Guidelines

### Performance Optimization
- Lazy loading with dynamic imports
- Image optimization with Next.js Image
- Bundle splitting by route
- Memoization for expensive operations

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Mobile Optimization
- Responsive design with mobile-first approach
- Touch-optimized interactions
- PWA capabilities with service worker
- Offline support with IndexedDB

### Testing Strategy
- Unit tests with Jest and React Testing Library
- E2E tests with Playwright
- Component documentation with Storybook
- Visual regression testing

## API Integration

### API Client
Enterprise-grade Axios client with:
- Automatic token management
- Request/response interceptors
- Exponential backoff retry logic
- Progress tracking for uploads

### WebSocket Integration
Real-time features using Socket.io:
- Live collaboration
- Progress tracking
- Notifications
- Activity feeds

## Deployment Considerations

### Environment Variables
Required frontend environment variables:
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_WEBSOCKET_URL`
- `NEXT_PUBLIC_GA_ID` (optional)

### Build Optimization
- Static generation where possible
- API route caching
- CDN integration for assets
- Service worker for offline support

---

For detailed component documentation, refer to the component files directly or use Storybook for interactive documentation.