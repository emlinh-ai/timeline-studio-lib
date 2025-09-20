import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { Clip } from '../Clip';
import { Track } from '../Track';
import { TrackContainer } from '../TrackContainer';
import { performanceMonitor, memoryMonitor } from '../../utils/performanceUtils';
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

// Helper function to generate mock clips
function generateMockClips(count: number): ClipType[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `clip-${i}`,
    trackId: `track-${Math.floor(i / 10)}`,
    start: i * 2,
    duration: 1.5,
    type: ['video', 'audio', 'text', 'overlay'][i % 4] as ClipType['type'],
    metadata: {
      name: `Clip ${i + 1}`,
      thumbnailUrl: `https://example.com/thumb-${i}.jpg`
    }
  }));
}

// Helper function to generate mock tracks
function generateMockTracks(trackCount: number, clipsPerTrack: number): TrackType[] {
  return Array.from({ length: trackCount }, (_, i) => ({
    id: `track-${i}`,
    type: ['video', 'audio', 'text', 'overlay'][i % 4] as TrackType['type'],
    name: `Track ${i + 1}`,
    height: 60,
    isVisible: true,
    isMuted: false,
    clips: generateMockClips(clipsPerTrack).map(clip => ({
      ...clip,
      trackId: `track-${i}`,
      id: `${clip.id}-track-${i}`
    }))
  }));
}

describe('Performance Tests', () => {
  beforeEach(() => {
    performanceMonitor.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.logSummary();
    memoryMonitor.logSummary();
  });

  describe('Component Render Performance', () => {
    test('Clip component renders within performance budget', async () => {
      const mockClip: ClipType = {
        id: 'test-clip',
        trackId: 'test-track',
        start: 0,
        duration: 5,
        type: 'video',
        metadata: { name: 'Test Clip' }
      };

      const renderStart = performance.now();
      
      render(
        <Clip
          clip={mockClip}
          isSelected={false}
          theme={mockTheme}
          pixelsPerSecond={100}
          zoom={1}
          trackHeight={60}
          onSelect={jest.fn()}
        />
      );

      const renderTime = performance.now() - renderStart;
      
      // Should render within 16ms (60fps budget)
      expect(renderTime).toBeLessThan(16);
    });

    test('Track component renders efficiently with multiple clips', async () => {
      const mockTrack: TrackType = {
        id: 'test-track',
        type: 'video',
        name: 'Test Track',
        height: 60,
        isVisible: true,
        isMuted: false,
        clips: generateMockClips(50) // 50 clips
      };

      const renderStart = performance.now();
      
      render(
        <Track
          track={mockTrack}
          index={0}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={mockTheme}
          timelineWidth={5000}
        />
      );

      const renderTime = performance.now() - renderStart;
      
      // Should render within reasonable time even with many clips
      expect(renderTime).toBeLessThan(50);
    });

    test('TrackContainer handles large datasets efficiently', async () => {
      const mockTracks = generateMockTracks(20, 25); // 20 tracks, 25 clips each = 500 clips total

      const renderStart = performance.now();
      
      render(
        <TrackContainer
          tracks={mockTracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={mockTheme}
          enableVirtualization={true}
          estimatedItemSize={60}
        />
      );

      const renderTime = performance.now() - renderStart;
      
      // Should render within reasonable time with virtualization
      expect(renderTime).toBeLessThan(100);
    });

    test('Timeline component initial render performance', async () => {
      const mockTracks = generateMockTracks(10, 20); // 10 tracks, 20 clips each

      const renderStart = performance.now();
      
      render(
        <Timeline
          tracks={mockTracks}
          duration={100}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          enableVirtualization={false}
        />
      );

      const renderTime = performance.now() - renderStart;
      
      // Initial render should be reasonably fast
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('Interaction Performance', () => {
    test('Zoom operations are debounced and performant', async () => {
      const mockTracks = generateMockTracks(5, 10);
      let zoomChangeCount = 0;
      
      const onZoom = jest.fn(() => {
        zoomChangeCount++;
      });

      render(
        <Timeline
          tracks={mockTracks}
          duration={50}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          onZoom={onZoom}
        />
      );

      const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
      
      // Rapid zoom operations
      const operationStart = performance.now();
      
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomInButton);
      }
      
      const operationTime = performance.now() - operationStart;
      
      // Should handle rapid operations efficiently
      expect(operationTime).toBeLessThan(100);
      
      // Wait for debouncing to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // Should have debounced the zoom events
      expect(zoomChangeCount).toBeLessThan(10);
    });

    test('Scroll operations are throttled for performance', async () => {
      const mockTracks = generateMockTracks(3, 5);
      let scrollEventCount = 0;
      
      const onScroll = jest.fn(() => {
        scrollEventCount++;
      });

      const { container } = render(
        <Timeline
          tracks={mockTracks}
          duration={50}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          onScroll={onScroll}
        />
      );

      const scrollContainer = container.querySelector('.scrollable-container');
      expect(scrollContainer).toBeInTheDocument();

      // Simulate rapid scroll events
      const scrollStart = performance.now();
      
      for (let i = 0; i < 20; i++) {
        fireEvent.scroll(scrollContainer!, { target: { scrollLeft: i * 10 } });
      }
      
      const scrollTime = performance.now() - scrollStart;
      
      // Should handle rapid scroll events efficiently
      expect(scrollTime).toBeLessThan(50);
      
      // Wait for throttling to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Should have throttled the scroll events
      expect(scrollEventCount).toBeLessThan(20);
    });
  });

  describe('Memory Performance', () => {
    test('Components clean up properly on unmount', async () => {
      const mockTracks = generateMockTracks(5, 10);
      
      // Take initial memory measurement
      memoryMonitor.measure();
      
      const { unmount } = render(
        <Timeline
          tracks={mockTracks}
          duration={50}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      // Simulate some interactions
      const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
      fireEvent.click(zoomInButton);
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Unmount component
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Take final memory measurement
      memoryMonitor.measure();
      
      // Memory trend should not be increasing after unmount
      const trend = memoryMonitor.getTrend();
      expect(trend).not.toBe('increasing');
    });

    test('Large datasets do not cause memory leaks', async () => {
      // Take initial measurement
      memoryMonitor.measure();
      
      // Render with large dataset
      const largeTracks = generateMockTracks(50, 100); // 5000 clips total
      
      const { rerender, unmount } = render(
        <Timeline
          tracks={largeTracks}
          duration={1000}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          enableVirtualization={true}
        />
      );

      // Simulate multiple re-renders with different data
      for (let i = 0; i < 5; i++) {
        const newTracks = generateMockTracks(50, 100);
        rerender(
          <Timeline
            tracks={newTracks}
            duration={1000}
            currentTime={i * 10}
            zoom={1 + i * 0.1}
            pixelsPerSecond={100}
            enableVirtualization={true}
          />
        );
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
        
        memoryMonitor.measure();
      }

      unmount();
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      memoryMonitor.measure();
      
      // Memory should not be continuously increasing
      const trend = memoryMonitor.getTrend();
      expect(trend).not.toBe('increasing');
    });
  });

  describe('React.memo Effectiveness', () => {
    test('Clip component does not re-render when props are unchanged', () => {
      const mockClip: ClipType = {
        id: 'test-clip',
        trackId: 'test-track',
        start: 0,
        duration: 5,
        type: 'video',
        metadata: { name: 'Test Clip' }
      };

      let renderCount = 0;
      const TestClip = React.memo(() => {
        renderCount++;
        return (
          <Clip
            clip={mockClip}
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
      
      // Should not re-render due to memoization
      expect(renderCount).toBe(1);
    });

    test('Track component re-renders only when necessary', () => {
      const mockTrack: TrackType = {
        id: 'test-track',
        type: 'video',
        name: 'Test Track',
        height: 60,
        isVisible: true,
        isMuted: false,
        clips: generateMockClips(5)
      };

      let renderCount = 0;
      const TestTrack = React.memo(({ currentTime }: { currentTime: number }) => {
        renderCount++;
        return (
          <Track
            track={mockTrack}
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
      
      // Re-render with same currentTime
      rerender(<TestTrack currentTime={0} />);
      expect(renderCount).toBe(1);
      
      // Re-render with different currentTime
      rerender(<TestTrack currentTime={5} />);
      expect(renderCount).toBe(2);
    });
  });

  describe('Performance Monitoring', () => {
    test('Performance monitor tracks render times correctly', () => {
      const componentName = 'TestComponent';
      
      performanceMonitor.startRender(componentName);
      
      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Busy wait for 10ms
      }
      
      const metric = performanceMonitor.endRender(componentName);
      
      expect(metric).toBeTruthy();
      expect(metric!.renderTime).toBeGreaterThan(9);
      expect(metric!.componentName).toBe(componentName);
      
      const data = performanceMonitor.getPerformanceData(componentName);
      expect(data).toBeTruthy();
      expect(data!.totalRenders).toBe(1);
      expect(data!.averageRenderTime).toBeGreaterThan(9);
    });

    test('Performance monitor identifies slow renders', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const componentName = 'SlowComponent';
      
      performanceMonitor.startRender(componentName);
      
      // Simulate slow render (>16ms)
      const start = performance.now();
      while (performance.now() - start < 20) {
        // Busy wait for 20ms
      }
      
      performanceMonitor.endRender(componentName);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected: SlowComponent')
      );
      
      const data = performanceMonitor.getPerformanceData(componentName);
      expect(data!.slowRenders).toBe(1);
      
      consoleSpy.mockRestore();
    });
  });
});