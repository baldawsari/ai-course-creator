# Collaboration System Dependencies

## Required NPM Packages

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "socket.io-client": "^4.7.4",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-alert-dialog": "^1.0.5"
  }
}
```

## Installation Command

```bash
cd frontend
npm install socket.io-client @radix-ui/react-progress @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-alert-dialog
```

## Already Available Dependencies

The following packages are already available in the AI Course Creator frontend:

- `framer-motion` - For animations and transitions
- `lucide-react` - For icons
- `clsx` and `tailwind-merge` - For conditional styling
- `@radix-ui/react-*` - Most Radix UI components are already included
- `date-fns` - For date formatting utilities

## Backend Requirements

The collaboration system requires WebSocket support on the backend. You'll need to install and configure:

```bash
# Backend dependencies (in backend/package.json)
npm install socket.io cors
```

## Environment Variables

Add to your `.env.local` file:

```env
# WebSocket server URL
NEXT_PUBLIC_WS_URL=http://localhost:3001

# Enable collaboration features
NEXT_PUBLIC_ENABLE_COLLABORATION=true

# Enable desktop notifications
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

## Browser Permissions

The collaboration system requests the following browser permissions:

1. **Notifications** - For desktop notifications
2. **Online/Offline Detection** - For offline mode support

## Features Overview

### ✅ Completed Features

1. **WebSocket Integration**
   - Socket.io client with auto-reconnection
   - Event handling and state synchronization
   - Connection monitoring and error handling

2. **Collaborative Editing**
   - Live cursor tracking with user colors
   - User presence indicators
   - Real-time content synchronization
   - Conflict detection and resolution

3. **Real-time Notifications**
   - Toast notifications with multiple variants
   - Bell icon with unread count badges
   - Desktop notifications (with permission)
   - Sound alerts (optional)
   - Notification center with filtering

4. **Activity Feed**
   - Live activity stream with real-time updates
   - Activity type filtering and categorization
   - User filtering and time range selection
   - Time-grouped display with expandable sections

5. **Offline Support**
   - Offline change tracking and queueing
   - Automatic sync when connection restored
   - Conflict resolution with multiple strategies
   - Performance optimization with batching

6. **Performance Optimizations**
   - Debounced cursor updates
   - Throttled content changes
   - Batched network requests
   - Memory management for old data

### 🎯 Key Components

1. **CollaborationProvider** - Main context provider
2. **CollaborativeEditor** - Real-time text editor with live cursors
3. **NotificationCenter** - Dropdown notification system
4. **ActivityFeed** - Live activity timeline
5. **WebSocketClient** - Core WebSocket management
6. **OfflineManager** - Offline support and sync

### 🔧 Integration Guide

1. **Wrap your app with CollaborationProvider:**

```tsx
import { CollaborationProvider } from '@/components/features/collaboration'

function App() {
  return (
    <CollaborationProvider
      courseId="your-course-id"
      showStatusBar
      showNotifications
      autoSync
    >
      <YourAppContent />
    </CollaborationProvider>
  )
}
```

2. **Use collaborative editing:**

```tsx
import { CollaborativeEditor } from '@/components/features/collaboration'

function Editor() {
  const [content, setContent] = useState('')
  
  return (
    <CollaborativeEditor
      courseId="course-id"
      sessionId="session-id"
      content={content}
      onChange={setContent}
      showPresence
      showConflicts
    />
  )
}
```

3. **Add notifications:**

```tsx
import { NotificationCenter } from '@/components/features/collaboration'

function Header() {
  return (
    <div className="flex items-center gap-4">
      <NotificationCenter />
      {/* Other header content */}
    </div>
  )
}
```

4. **Include activity feed:**

```tsx
import { ActivityFeed } from '@/components/features/collaboration'

function Sidebar() {
  return (
    <ActivityFeed
      courseId="course-id"
      compact
      maxItems={20}
      showFilters
    />
  )
}
```

### 🚀 Advanced Usage

For advanced customization, you can use individual hooks:

```tsx
import { 
  useWebSocket,
  useCourseCollaboration,
  useCollaborativeEditor,
  useRealtimeNotifications,
  useActivityFeed
} from '@/components/features/collaboration'

function CustomComponent() {
  const { isConnected, client } = useWebSocket()
  const { users, userPresence } = useCourseCollaboration('course-id')
  const { notifications, unreadCount } = useRealtimeNotifications()
  
  // Custom collaboration logic
}
```

## TypeScript Support

All components and hooks include full TypeScript support with comprehensive type definitions for:

- WebSocket events and data structures
- Collaboration user and presence types
- Content change and conflict resolution types
- Activity event types and metadata
- Notification types and configurations

## Accessibility

The collaboration system includes:

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Reduced motion preferences

## Performance Considerations

- Debounced updates reduce network traffic
- Memory management prevents memory leaks
- Automatic cleanup on component unmount
- Optimized rendering with React.memo and useMemo
- Batched operations for efficiency

## Security Features

- Authentication token management
- Secure WebSocket connections
- Input validation and sanitization
- XSS protection for user-generated content
- Rate limiting for API calls

This collaboration system provides enterprise-grade real-time features with excellent performance, accessibility, and user experience.