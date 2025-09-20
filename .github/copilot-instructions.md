# React Timeline Library - AI Coding Assistant Instructions

## Project Overview

This is a React TypeScript library for building video editing timelines with multi-track support, drag & drop, virtualization, and event-driven architecture. The library emphasizes performance, accessibility, and developer experience.

## Architecture Overview

### Core Components
- **Timeline**: Main component with complex state management and event handling
- **TrackContainer/Track**: Manages track rendering and virtualization
- **Clip**: Individual media clips with drag/resize functionality
- **EventBus**: Loose coupling system for external communication
- **ThemeProvider**: Customizable theming system

### State Management
- Redux-like pattern using `useReducer` with `timelineReducer`
- Undo/redo with history tracking (`TimelineStateWithHistory`)
- State validation and serialization for persistence
- Event-driven updates via EventBus integration

### Key Patterns

#### Event Bus Communication
```typescript
// External control via EventBus (preferred over callbacks)
const eventBus = useEventBus();
eventBus.emit('timeline:addClip', { clip: newClip });

// Listen to timeline events
useEventListener('timeline:clipClick', (payload) => {
  console.log(`Clip ${payload.clipId} clicked at ${payload.time}s`);
});
```

#### Component Structure
```typescript
// Functional components with hooks, memoized for performance
const TimelineInternal = memo(function TimelineInternal(props) {
  const theme = useTheme();
  const eventBus = useEventBus();
  // Complex event handling with debouncing
  const debouncedSetZoom = useCallback((newZoom: number) => {
    // 16ms throttling for ~60fps
  }, []);
});
```

#### Type Safety
```typescript
// Comprehensive interfaces with JSDoc
export interface Clip {
  id: string;
  trackId: string;
  start: number;
  duration: number;
  type: 'video' | 'audio' | 'text' | 'overlay';
  metadata?: { /* extensive typing */ };
}
```

## Development Workflows

### Build & Development
- `npm run dev` - Watch mode development build
- `npm run build` - Production build (Rollup generates CJS/ESM + types)
- `npm run build:dev` - Development build
- `npm run type-check` - TypeScript validation
- `npm run analyze` - Bundle analysis
- `npm run size` - Bundle size check (100kb limit)

### Testing
- `npm test` - Jest with jsdom, 80% coverage required
- `npm run test:watch` - Watch mode testing
- `npm run test:coverage` - Coverage report
- Tests include accessibility (jest-axe) and performance scenarios

### Code Quality
- `npm run lint` - ESLint with TypeScript and React rules
- `npm run lint:fix` - Auto-fix linting issues
- Strict TypeScript configuration with comprehensive types

## Project Conventions

### Component Patterns
- **Functional components** with hooks (no classes)
- **React.memo** for performance optimization
- **Error boundaries** for resilience (`TimelineErrorBoundary`)
- **Accessibility-first**: ARIA labels, keyboard navigation, screen reader support
- **Touch gestures** enabled by default (configurable)

### State & Data Flow
- **EventBus over callbacks** for external communication
- **Validation functions** for all data mutations (`validateClip`, `validateTimelineState`)
- **Serialization** for state persistence (`serializeTimelineState`)
- **Debounced events** for scroll/zoom performance
- **Undo/redo** with history tracking

### Performance Optimizations
- **Virtualization** for 100+ clips (`VirtualizationWrapper`)
- **Responsive utilities** (`useScreenSize`, `getResponsivePixelsPerSecond`)
- **Memory monitoring** (`measureMemoryUsage`)
- **Bundle size limits** enforced in CI

### Theming & Styling
```typescript
// Deep partial theme customization
const customTheme: DeepPartial<TimelineTheme> = {
  primaryColor: '#ff6b6b',
  clipColors: { video: '#4ecdc4' }
};
```

## Key Files & Directories

### Core Architecture
- `src/index.ts` - Main exports and API surface
- `src/components/Timeline.tsx` - Main component (600+ lines, complex event handling)
- `src/types/index.ts` - Comprehensive type definitions (740+ lines)
- `src/state/reducer.ts` - State management logic
- `src/state/hooks.ts` - State management hooks (undo/redo, serialization)

### Communication & Integration
- `src/eventBus/EventBus.ts` - Event bus implementation
- `src/eventBus/EventBusProvider.tsx` - React context provider
- `src/theme/` - Theme system with provider and defaults

### Utilities & Features
- `src/utils/accessibility.ts` - A11y helpers and ARIA utilities
- `src/utils/responsive.ts` - Screen size and responsive logic
- `src/utils/testDataGenerator.ts` - Mock data and performance testing
- `src/components/VirtualizationWrapper.tsx` - Performance optimization

## Common Patterns & Gotchas

### Event Handling
- Use `useEventListener` hook for subscribing to timeline events
- Emit events via `useEventBus().emit()` for external control
- Events are namespaced (default: 'timeline:') to avoid conflicts

### State Updates
- Always use action creators from `timelineActions`
- State changes automatically trigger event emissions
- Validation runs on all state mutations

### Performance
- Enable virtualization for large datasets: `enableVirtualization={true}`
- Use responsive utilities for mobile optimization
- Debounce scroll/zoom events to prevent excessive re-renders

### Accessibility
- All components include ARIA labels and keyboard navigation
- Use `announceToScreenReader()` for dynamic announcements
- Test with `jest-axe` for accessibility compliance

### Error Handling
- Components wrapped in `TimelineErrorBoundary`
- Validation errors use custom `ValidationError` class
- Event bus errors include event context

## Testing Patterns

### Component Testing
```typescript
describe('Timeline Component', () => {
  it('should handle clip selection', () => {
    render(<Timeline tracks={mockTracks} />);
    const clip = screen.getByRole('button', { name: /clip/i });
    fireEvent.click(clip);
    expect(clip).toHaveAttribute('aria-selected', 'true');
  });
});
```

### Accessibility Testing
```typescript
it('should be accessible', async () => {
  const { container } = render(<Timeline {...props} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Performance Testing
```typescript
it('should handle large datasets', () => {
  const largeTracks = generateMockTracks(1000);
  const { rerender } = render(<Timeline tracks={largeTracks} />);
  // Performance assertions
});
```

## Integration Examples

### External Timeline Control
```typescript
function TimelineControls() {
  const eventBus = useEventBus();
  
  return (
    <div>
      <button onClick={() => eventBus.emit('timeline:addClip', { clip })}>
        Add Clip
      </button>
      <button onClick={() => eventBus.emit('timeline:undo')}>
        Undo
      </button>
    </div>
  );
}
```

### Custom Clip Renderer
```typescript
const CustomClip = ({ clip, isSelected, onSelect }: ClipRendererProps) => (
  <div 
    onClick={() => onSelect(clip.id)}
    style={{ background: isSelected ? 'blue' : 'gray' }}
  >
    {clip.metadata?.name}
  </div>
);

<Timeline renderClip={CustomClip} />
```

### State Persistence
```typescript
const { exportState, importState } = useStateSerialization();

// Save
const saveProject = () => {
  const state = exportState();
  localStorage.setItem('timeline', state);
};

// Load
const loadProject = () => {
  const saved = localStorage.getItem('timeline');
  if (saved) importState(saved);
};
```

## Quality Standards

- **TypeScript strict mode** - no `any` types, comprehensive interfaces
- **80% test coverage** - unit, integration, accessibility tests
- **Bundle size limits** - 100kb max for both CJS and ESM builds
- **Accessibility compliance** - WCAG guidelines, keyboard navigation
- **Performance benchmarks** - virtualization for large datasets
- **Documentation** - JSDoc comments, usage examples, README updates

## Development Tips

- Start with `src/types/index.ts` to understand data structures
- Use the EventBus for any external timeline interactions
- Enable virtualization early when working with multiple clips
- Test accessibility changes with screen reader tools
- Run `npm run analyze` to monitor bundle impact
- Use `generateMockClips()` for development and testing</content>
<parameter name="filePath">c:\Users\Admin\Projects\timeline-studio-lib\.github\copilot-instructions.md