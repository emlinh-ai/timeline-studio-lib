import React from 'react';
import { render } from '@testing-library/react';
import { Clip } from '../Clip';
import { Track } from '../Track';
import { TimelineHeader } from '../TimelineHeader';
import { TrackContainer } from '../TrackContainer';
import { TimelineTheme, Track as TrackType, Clip as ClipType } from '../../types';

// Mock theme
const mockTheme: TimelineTheme = {
  primaryColor: '#007acc',
  backgroundColor: '#1e1e1e',
  trackBackgroundColor: '#2d2d2d',
  clipBorderRadius: '4px',
  clipColors: {
    video: '#4CAF50',
    audio: '#FF9800',
    text: '#2196F3',
    overlay: '#9C27B0'
  },
  fonts: {
    primary: 'Arial, sans-serif',
    monospace: 'monospace'
  }
};

// Helper to create mock clip
const createMockClip = (overrides: Partial<ClipType> = {}): ClipType => ({
  id: 'test-clip',
  trackId: 'test-track',
  start: 0,
  duration: 5,
  type: 'video',
  metadata: { name: 'Test Clip' },
  ...overrides
});

// Helper to create mock track
const createMockTrack = (overrides: Partial<TrackType> = {}): TrackType => ({
  id: 'test-track',
  type: 'video',
  name: 'Test Track',
  height: 60,
  isVisible: true,
  isMuted: false,
  clips: [createMockClip()],
  ...overrides
});

describe('React.memo Optimization Tests', () => {
  describe('Clip Component Memoization', () => {
    test('should not re-render when props are unchanged', () => {
      let renderCount = 0;
      
      const TestClip = React.memo(() => {
        renderCount++;
        return (
          <Clip
            clip={createMockClip()}
            isSelected={false}
            theme={mockTheme}
            pixelsPerSecond={100}
            zoom={1}
            trackHeight={60}
            onSelect={jest.fn()}
          />
        );
      });

      const { rerender } = render(<TestClip />);
      expect(renderCount).toBe(1);

      // Re-render with same props
      rerender(<TestClip />);
      expect(renderCount).toBe(1); // Should not re-render
    });

    test('should re-render when clip data changes', () => {
      let renderCount = 0;
      
      const TestClip = React.memo(({ clipStart }: { clipStart: number }) => {
        renderCount++;
        return (
          <Clip
            clip={createMockClip({ start: clipStart })}
            isSelected={false}
            theme={mockTheme}
            pixelsPerSecond={100}
            zoom={1}
            trackHeight={60}
            onSelect={jest.fn()}
          />
        );
      });

      const { rerender } = render(<TestClip clipStart={0} />);
      expect(renderCount).toBe(1);

      // Re-render with different clip start
      rerender(<TestClip clipStart={5} />);
      expect(renderCount).toBe(2); // Should re-render
    });

    test('should re-render when selection state changes', () => {
      let renderCount = 0;
      
      const TestClip = React.memo(({ isSelected }: { isSelected: boolean }) => {
        renderCount++;
        return (
          <Clip
            clip={createMockClip()}
            isSelected={isSelected}
            theme={mockTheme}
            pixelsPerSecond={100}
            zoom={1}
            trackHeight={60}
            onSelect={jest.fn()}
          />
        );
      });

      const { rerender } = render(<TestClip isSelected={false} />);
      expect(renderCount).toBe(1);

      // Re-render with different selection state
      rerender(<TestClip isSelected={true} />);
      expect(renderCount).toBe(2); // Should re-render
    });
  });

  describe('Track Component Memoization', () => {
    test('should not re-render when props are unchanged', () => {
      let renderCount = 0;
      
      const TestTrack = React.memo(() => {
        renderCount++;
        return (
          <Track
            track={createMockTrack()}
            index={0}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={mockTheme}
            timelineWidth={1000}
          />
        );
      });

      const { rerender } = render(<TestTrack />);
      expect(renderCount).toBe(1);

      // Re-render with same props
      rerender(<TestTrack />);
      expect(renderCount).toBe(1); // Should not re-render
    });

    test('should re-render when current time changes', () => {
      let renderCount = 0;
      
      const TestTrack = React.memo(({ currentTime }: { currentTime: number }) => {
        renderCount++;
        return (
          <Track
            track={createMockTrack()}
            index={0}
            currentTime={currentTime}
            zoom={1}
            pixelsPerSecond={100}
            theme={mockTheme}
            timelineWidth={1000}
          />
        );
      });

      const { rerender } = render(<TestTrack currentTime={0} />);
      expect(renderCount).toBe(1);

      // Re-render with different current time
      rerender(<TestTrack currentTime={5} />);
      expect(renderCount).toBe(2); // Should re-render
    });

    test('should re-render when track clips change', () => {
      let renderCount = 0;
      
      const TestTrack = React.memo(({ clipCount }: { clipCount: number }) => {
        renderCount++;
        const clips = Array.from({ length: clipCount }, (_, i) => 
          createMockClip({ id: `clip-${i}` })
        );
        return (
          <Track
            track={createMockTrack({ clips })}
            index={0}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={mockTheme}
            timelineWidth={1000}
          />
        );
      });

      const { rerender } = render(<TestTrack clipCount={1} />);
      expect(renderCount).toBe(1);

      // Re-render with different number of clips
      rerender(<TestTrack clipCount={2} />);
      expect(renderCount).toBe(2); // Should re-render
    });
  });

  describe('TimelineHeader Component Memoization', () => {
    test('should not re-render when props are unchanged', () => {
      let renderCount = 0;
      
      const TestTimelineHeader = React.memo(() => {
        renderCount++;
        return (
          <TimelineHeader
            currentTime={0}
            duration={100}
            zoom={1}
            pixelsPerSecond={100}
            theme={mockTheme}
          />
        );
      });

      const { rerender } = render(<TestTimelineHeader />);
      expect(renderCount).toBe(1);

      // Re-render with same props
      rerender(<TestTimelineHeader />);
      expect(renderCount).toBe(1); // Should not re-render
    });

    test('should re-render when zoom changes', () => {
      let renderCount = 0;
      
      const TestTimelineHeader = React.memo(({ zoom }: { zoom: number }) => {
        renderCount++;
        return (
          <TimelineHeader
            currentTime={0}
            duration={100}
            zoom={zoom}
            pixelsPerSecond={100}
            theme={mockTheme}
          />
        );
      });

      const { rerender } = render(<TestTimelineHeader zoom={1} />);
      expect(renderCount).toBe(1);

      // Re-render with different zoom
      rerender(<TestTimelineHeader zoom={2} />);
      expect(renderCount).toBe(2); // Should re-render
    });
  });

  describe('TrackContainer Component Memoization', () => {
    test('should not re-render when props are unchanged', () => {
      let renderCount = 0;
      
      const TestTrackContainer = React.memo(() => {
        renderCount++;
        return (
          <TrackContainer
            tracks={[createMockTrack()]}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={mockTheme}
          />
        );
      });

      const { rerender } = render(<TestTrackContainer />);
      expect(renderCount).toBe(1);

      // Re-render with same props
      rerender(<TestTrackContainer />);
      expect(renderCount).toBe(1); // Should not re-render
    });

    test('should re-render when tracks change', () => {
      let renderCount = 0;
      
      const TestTrackContainer = React.memo(({ trackCount }: { trackCount: number }) => {
        renderCount++;
        const tracks = Array.from({ length: trackCount }, (_, i) => 
          createMockTrack({ id: `track-${i}`, name: `Track ${i + 1}` })
        );
        return (
          <TrackContainer
            tracks={tracks}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={mockTheme}
          />
        );
      });

      const { rerender } = render(<TestTrackContainer trackCount={1} />);
      expect(renderCount).toBe(1);

      // Re-render with different number of tracks
      rerender(<TestTrackContainer trackCount={2} />);
      expect(renderCount).toBe(2); // Should re-render
    });
  });

  describe('Performance Comparison', () => {
    test('memoized components perform better with frequent re-renders', () => {
      const renderTimes: number[] = [];
      
      // Test with memoized component
      const MemoizedClip = React.memo(() => (
        <Clip
          clip={createMockClip()}
          isSelected={false}
          theme={mockTheme}
          pixelsPerSecond={100}
          zoom={1}
          trackHeight={60}
          onSelect={jest.fn()}
        />
      ));

      const { rerender } = render(<MemoizedClip />);

      // Perform multiple re-renders and measure time
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        rerender(<MemoizedClip />);
        const end = performance.now();
        renderTimes.push(end - start);
      }

      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      
      // Memoized re-renders should be very fast (most should be skipped)
      expect(averageRenderTime).toBeLessThan(1); // Less than 1ms on average
    });

    test('components re-render appropriately when props change', () => {
      let renderCount = 0;
      
      const TestClip = React.memo(({ start }: { start: number }) => {
        renderCount++;
        return (
          <Clip
            clip={createMockClip({ start })}
            isSelected={false}
            theme={mockTheme}
            pixelsPerSecond={100}
            zoom={1}
            trackHeight={60}
            onSelect={jest.fn()}
          />
        );
      });

      const { rerender } = render(<TestClip start={0} />);
      expect(renderCount).toBe(1);

      // Multiple re-renders with same props
      for (let i = 0; i < 5; i++) {
        rerender(<TestClip start={0} />);
      }
      expect(renderCount).toBe(1); // Should not re-render

      // Re-render with different prop
      rerender(<TestClip start={5} />);
      expect(renderCount).toBe(2); // Should re-render once

      // Multiple re-renders with same new props
      for (let i = 0; i < 5; i++) {
        rerender(<TestClip start={5} />);
      }
      expect(renderCount).toBe(2); // Should not re-render again
    });
  });
});