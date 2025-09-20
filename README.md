# React Timeline Library

A comprehensive, reusable React video editing timeline library with multi-track support, drag & drop functionality, virtualization, and event-driven architecture. Built with TypeScript for full type safety and designed for performance with large datasets.

## ✨ Features

- **Multi-track Support**: Video, audio, text, and overlay tracks
- **Drag & Drop**: Intuitive clip manipulation with constraints
- **Event Bus Architecture**: Loose coupling for external communication
- **TypeScript First**: Full type safety with comprehensive interfaces
- **Virtualization**: Handle 1000+ clips with smooth performance
- **Customizable**: Themes, custom clip renderers, and styling
- **Undo/Redo**: Complete history management with keyboard shortcuts
- **Responsive**: Touch gestures and mobile-friendly design
- **Accessible**: WCAG compliant with keyboard navigation and screen reader support
- **Performance Optimized**: React.memo, virtualization, and debouncing

## 📦 Installation

```bash
npm install timeline-studio-lib
```

```bash
yarn add timeline-studio-lib
```

```bash
pnpm add timeline-studio-lib
```

## 🚀 Quick Start

```tsx
import React from 'react';
import { Timeline, TimelineProps, Clip, Track } from 'timeline-studio-lib';

const App = () => {
  const tracks: Track[] = [
    {
      id: 'video-track',
      type: 'video',
      name: 'Video Track',
      height: 80,
      isVisible: true,
      clips: [
        {
          id: 'clip-1',
          trackId: 'video-track',
          start: 0,
          duration: 5,
          type: 'video',
          metadata: {
            name: 'Intro Video',
            thumbnailUrl: 'https://example.com/thumb1.jpg'
          }
        },
        {
          id: 'clip-2',
          trackId: 'video-track',
          start: 6,
          duration: 3,
          type: 'video',
          metadata: {
            name: 'Main Content',
            thumbnailUrl: 'https://example.com/thumb2.jpg'
          }
        }
      ]
    },
    {
      id: 'audio-track',
      type: 'audio',
      name: 'Background Music',
      height: 60,
      isVisible: true,
      clips: [
        {
          id: 'audio-1',
          trackId: 'audio-track',
          start: 0,
          duration: 10,
          type: 'audio',
          metadata: {
            name: 'Background Music',
            waveform: [0.2, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7]
          }
        }
      ]
    }
  ];

  const handleClipClick = (payload: { clipId: string; time: number }) => {
    console.log('Clip clicked:', payload);
  };

  const handleStateChange = (state: TimelineState) => {
    console.log('Timeline state changed:', state);
  };

  return (
    <Timeline
      tracks={tracks}
      duration={30}
      currentTime={0}
      zoom={1}
      onClipClick={handleClipClick}
      onStateChange={handleStateChange}
    />
  );
};

export default App;
```

## 📚 Core Concepts

### Clips and Tracks

```tsx
import { Clip, Track } from 'timeline-studio-lib';

// Define different types of clips
const videoClip: Clip = {
  id: 'video-1',
  trackId: 'track-1',
  start: 0,
  duration: 5,
  type: 'video',
  metadata: {
    name: 'Video Clip',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    speed: 1.0
  }
};

const audioClip: Clip = {
  id: 'audio-1',
  trackId: 'track-2',
  start: 2,
  duration: 8,
  type: 'audio',
  metadata: {
    name: 'Background Music',
    waveform: [0.1, 0.3, 0.7, 0.5, 0.9, 0.2]
  }
};

const textClip: Clip = {
  id: 'text-1',
  trackId: 'track-3',
  start: 1,
  duration: 3,
  type: 'text',
  metadata: {
    name: 'Title Text',
    text: 'Welcome to our video!',
    style: { fontSize: '24px', color: '#ffffff' }
  }
};
```

## 🎨 Theming and Customization

### Custom Theme

```tsx
import { Timeline, ThemeProvider, TimelineTheme } from 'timeline-studio-lib';

const customTheme: TimelineTheme = {
  primaryColor: '#ff6b6b',
  backgroundColor: '#1a1a1a',
  trackBackgroundColor: '#2d2d2d',
  clipBorderRadius: '8px',
  clipColors: {
    video: '#4ecdc4',
    audio: '#45b7d1',
    text: '#f9ca24',
    overlay: '#6c5ce7'
  },
  fonts: {
    primary: 'Inter, sans-serif',
    monospace: 'JetBrains Mono, monospace'
  }
};

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <Timeline {...timelineProps} />
    </ThemeProvider>
  );
}
```

### Custom Clip Renderer

```tsx
import { Timeline, ClipRendererProps } from 'timeline-studio-lib';

const CustomClipRenderer = ({ clip, isSelected, onSelect }: ClipRendererProps) => {
  return (
    <div
      className={`custom-clip ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(clip.id)}
      style={{
        background: `linear-gradient(45deg, #ff6b6b, #4ecdc4)`,
        borderRadius: '12px',
        padding: '8px',
        color: 'white',
        fontWeight: 'bold'
      }}
    >
      <div>{clip.metadata?.name || clip.id}</div>
      <div style={{ fontSize: '12px', opacity: 0.8 }}>
        {clip.duration.toFixed(1)}s
      </div>
    </div>
  );
};

function App() {
  return (
    <Timeline
      {...timelineProps}
      renderClip={CustomClipRenderer}
    />
  );
}
```

## 🔄 Event Bus Communication

### Using Event Bus for External Control

```tsx
import { 
  Timeline, 
  EventBusProvider, 
  useEventBus,
  TimelineEventPayloads 
} from 'timeline-studio-lib';

function TimelineControls() {
  const eventBus = useEventBus();

  const addClip = () => {
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      trackId: 'video-track',
      start: 5,
      duration: 2,
      type: 'video',
      metadata: { name: 'New Clip' }
    };

    eventBus.emit('timeline:addClip', { clip: newClip });
  };

  const scrollToTime = (time: number) => {
    eventBus.emit('timeline:scrollTo', { time });
  };

  const undo = () => {
    eventBus.emit('timeline:undo');
  };

  const redo = () => {
    eventBus.emit('timeline:redo');
  };

  return (
    <div>
      <button onClick={addClip}>Add Clip</button>
      <button onClick={() => scrollToTime(10)}>Go to 10s</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}

function App() {
  return (
    <EventBusProvider namespace="my-timeline">
      <Timeline {...timelineProps} />
      <TimelineControls />
    </EventBusProvider>
  );
}
```

### Listening to Timeline Events

```tsx
import { useEventListener } from 'timeline-studio-lib';

function TimelineMonitor() {
  useEventListener('timeline:clipClick', (payload) => {
    console.log('Clip clicked:', payload.clipId, 'at time:', payload.time);
  });

  useEventListener('timeline:scroll', (payload) => {
    console.log('Timeline scrolled to:', payload.currentTime);
  });

  useEventListener('timeline:stateChange', (payload) => {
    console.log('Timeline state updated:', payload);
  });

  return <div>Monitoring timeline events...</div>;
}
```

## ⚡ Performance Optimization

### Virtualization for Large Datasets

```tsx
import { Timeline, generateMockClips } from 'timeline-studio-lib';

function LargeTimelineExample() {
  // Generate 1000+ clips for testing
  const largeTracks = [
    {
      id: 'large-track',
      type: 'video' as const,
      name: 'Large Track',
      height: 80,
      isVisible: true,
      clips: generateMockClips(1000)
    }
  ];

  return (
    <Timeline
      tracks={largeTracks}
      duration={3600} // 1 hour
      enableVirtualization={true}
      estimatedItemSize={120}
      pixelsPerSecond={10}
    />
  );
}
```

### Performance Monitoring

```tsx
import { PerformanceMeasurer, measureMemoryUsage } from 'timeline-studio-lib';

function PerformanceExample() {
  const measurer = new PerformanceMeasurer();

  useEffect(() => {
    // Measure render performance
    measurer.startMeasurement('timeline-render');
    
    return () => {
      const metrics = measurer.endMeasurement('timeline-render');
      console.log('Render time:', metrics.duration);
      
      // Measure memory usage
      const memoryUsage = measureMemoryUsage();
      console.log('Memory usage:', memoryUsage);
    };
  }, []);

  return <Timeline {...props} />;
}
```

## ♿ Accessibility

The timeline is fully accessible with:

- **Keyboard Navigation**: Arrow keys, Tab, Space, Delete
- **Screen Reader Support**: ARIA labels and descriptions
- **Focus Management**: Clear focus indicators
- **High Contrast**: Respects system preferences

```tsx
// Keyboard shortcuts are automatically enabled
function AccessibleTimeline() {
  return (
    <Timeline
      {...timelineProps}
      // Accessibility features are enabled by default
      aria-label="Video editing timeline"
    />
  );
}
```

## 📱 Touch and Mobile Support

```tsx
function ResponsiveTimeline() {
  return (
    <Timeline
      {...timelineProps}
      // Touch gestures enabled by default
      // disableTouch={false} // Set to true to disable touch
    />
  );
}
```

Supported touch gestures:
- **Swipe**: Horizontal scrolling
- **Pinch**: Zoom in/out
- **Tap**: Select clips
- **Long Press**: Context menu (if implemented)

## 🔧 State Management

### Undo/Redo

```tsx
import { useUndoRedo } from 'timeline-studio-lib';

function UndoRedoControls() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
    </div>
  );
}
```

### State Serialization

```tsx
import { useStateSerialization } from 'timeline-studio-lib';

function SaveLoadControls() {
  const { exportState, importState } = useStateSerialization();

  const saveProject = async () => {
    const state = await exportState();
    localStorage.setItem('timeline-project', JSON.stringify(state));
  };

  const loadProject = () => {
    const saved = localStorage.getItem('timeline-project');
    if (saved) {
      importState(JSON.parse(saved));
    }
  };

  return (
    <div>
      <button onClick={saveProject}>Save Project</button>
      <button onClick={loadProject}>Load Project</button>
    </div>
  );
}
```

## 🧪 Testing Utilities

```tsx
import { 
  generateMockClips, 
  generateMockTracks,
  generateRealisticTimeline,
  performanceTestScenarios 
} from 'timeline-studio-lib';

// Generate test data
const mockClips = generateMockClips(100);
const mockTracks = generateMockTracks(5);
const realisticTimeline = generateRealisticTimeline();

// Run performance tests
const scenarios = performanceTestScenarios();
scenarios.forEach(scenario => {
  console.log(`Testing scenario: ${scenario.name}`);
  // Run your tests with scenario.data
});
```

## 📖 API Reference

### Core Components

- **`Timeline`**: Main timeline component
- **`TimelineErrorBoundary`**: Error boundary for timeline
- **`ThemeProvider`**: Theme context provider
- **`EventBusProvider`**: Event bus context provider

### Hooks

- **`useEventBus()`**: Access event bus instance
- **`useTheme()`**: Access current theme
- **`useUndoRedo()`**: Undo/redo functionality
- **`useStateSerialization()`**: State export/import
- **`useVirtualization()`**: Virtualization utilities

### Types

- **`TimelineProps`**: Main timeline component props
- **`Clip`**: Individual clip data structure
- **`Track`**: Track data structure
- **`TimelineState`**: Complete timeline state
- **`TimelineTheme`**: Theme configuration
- **`TimelineEventPayloads`**: Event payload types

## 🛠️ Development

### Prerequisites

- Node.js 16+
- npm, yarn, or pnpm

### Available Scripts

```bash
# Development
npm run dev          # Build in watch mode
npm run build        # Production build
npm run build:dev    # Development build

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type checking

# Analysis
npm run analyze      # Bundle analysis
npm run size         # Check bundle size
```

### Building

The library is built using Rollup and outputs:

- **CommonJS**: `dist/index.js`
- **ES Modules**: `dist/index.esm.js`
- **TypeScript Declarations**: `dist/index.d.ts`
- **CSS**: `dist/styles/timeline.css`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/emlinh-ai/timeline-studio-lib.git
cd timeline-studio-lib
npm install
npm run dev
```

## 📄 License

MIT © [React Timeline Library Contributors](LICENSE)

## 🙏 Acknowledgments

- Inspired by professional video editing software
- Built with modern React patterns and TypeScript
- Designed for accessibility and performance

---

**Made with ❤️ for the React community**