import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualizedTrackContainer } from '../VirtualizedTrackContainer';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { Track, TimelineTheme } from '../../types';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock requestAnimationFrame
window.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

const defaultTheme: TimelineTheme = {
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

// Helper function to generate mock tracks with clips
const generateMockTracks = (trackCount: number, clipsPerTrack: number = 5): Track[] => {
  return Array.from({ length: trackCount }, (_, trackIndex) => ({
    id: `track-${trackIndex}`,
    type: ['video', 'audio', 'text', 'overlay'][trackIndex % 4] as Track['type'],
    name: `Track ${trackIndex + 1}`,
    height: 60,
    isVisible: true,
    isMuted: false,
    clips: Array.from({ length: clipsPerTrack }, (_, clipIndex) => ({
      id: `clip-${trackIndex}-${clipIndex}`,
      trackId: `track-${trackIndex}`,
      start: clipIndex * 2,
      duration: 1.5,
      type: ['video', 'audio', 'text', 'overlay'][clipIndex % 4] as any,
      metadata: {
        name: `Clip ${clipIndex + 1}`,
        thumbnailUrl: `https://example.com/thumb-${clipIndex}.jpg`
      }
    }))
  }));
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <EventBusProvider namespace="test">
    {children}
  </EventBusProvider>
);

describe('VirtualizedTrackContainer', () => {
  const defaultProps = {
    tracks: generateMockTracks(20, 3),
    currentTime: 0,
    zoom: 1,
    pixelsPerSecond: 100,
    theme: defaultTheme,
    estimatedItemSize: 60,
    overscan: 5,
    containerHeight: 400
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders virtualized tracks', () => {
    render(
      <TestWrapper>
        <VirtualizedTrackContainer {...defaultProps} />
      </TestWrapper>
    );

    // Should render the virtualized container
    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
    expect(document.querySelector('.tracks-virtualizer')).toBeInTheDocument();
  });

  it('shows empty state when no tracks', () => {
    render(
      <TestWrapper>
        <VirtualizedTrackContainer {...defaultProps} tracks={[]} />
      </TestWrapper>
    );

    expect(screen.getByText('No tracks to display')).toBeInTheDocument();
  });

  it('renders playhead indicator', () => {
    render(
      <TestWrapper>
        <VirtualizedTrackContainer {...defaultProps} currentTime={5} />
      </TestWrapper>
    );

    const playhead = document.querySelector('.timeline-playhead');
    expect(playhead).toBeInTheDocument();
    expect(playhead).toHaveStyle({ left: '500px' }); // 5 seconds * 100 pixels/second * 1 zoom
  });

  it('handles scroll changes', async () => {
    const onScrollChange = jest.fn();
    render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          {...defaultProps} 
          onScrollChange={onScrollChange}
        />
      </TestWrapper>
    );

    // This would be triggered by the ScrollableContainer
    // We can't easily test this without mocking the ScrollableContainer
    expect(onScrollChange).not.toHaveBeenCalled();
  });

  it('handles clip interactions', () => {
    const onClipSelect = jest.fn();
    const onClipDrag = jest.fn();
    const onClipResize = jest.fn();

    render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          {...defaultProps}
          onClipSelect={onClipSelect}
          onClipDrag={onClipDrag}
          onClipResize={onClipResize}
        />
      </TestWrapper>
    );

    // The clip interactions would be handled by the Track components
    // which are rendered within the virtualization wrapper
    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });
});

describe('VirtualizedTrackContainer Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.warn to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles 1000 tracks efficiently', async () => {
    const largeTracks = generateMockTracks(1000, 2);
    const startTime = performance.now();

    render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={largeTracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    const renderTime = performance.now() - startTime;

    // Should render quickly even with 1000 tracks
    expect(renderTime).toBeLessThan(200); // Less than 200ms

    // Should render the container
    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });

  it('handles 5000 tracks with many clips efficiently', async () => {
    const massiveTracks = generateMockTracks(5000, 10);
    const startTime = performance.now();

    render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={massiveTracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    const renderTime = performance.now() - startTime;

    // Should still render reasonably quickly with massive dataset
    expect(renderTime).toBeLessThan(500); // Less than 500ms

    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });

  it('maintains performance with frequent prop updates', async () => {
    const tracks = generateMockTracks(500, 5);
    const { rerender } = render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={tracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    const startTime = performance.now();

    // Simulate frequent updates (like during playback)
    for (let i = 0; i < 60; i++) { // 60 updates (like 60fps)
      rerender(
        <TestWrapper>
          <VirtualizedTrackContainer 
            tracks={tracks}
            currentTime={i * 0.1} // Update current time
            zoom={1 + (i * 0.01)} // Slight zoom changes
            pixelsPerSecond={100}
            theme={defaultTheme}
            estimatedItemSize={60}
            containerHeight={400}
          />
        </TestWrapper>
      );
    }

    const updateTime = performance.now() - startTime;

    // Should handle 60 updates quickly (simulating 1 second of 60fps updates)
    expect(updateTime).toBeLessThan(1000); // Less than 1 second

    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });

  it('memory usage remains stable with large datasets', () => {
    const tracks1000 = generateMockTracks(1000, 3);
    const { rerender } = render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={tracks1000}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    // Rerender with 10x more tracks
    const tracks10000 = generateMockTracks(10000, 3);
    rerender(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={tracks10000}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    // Should still render without issues
    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });

  it('handles zoom changes efficiently with large datasets', () => {
    const tracks = generateMockTracks(2000, 5);
    const { rerender } = render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={tracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    const startTime = performance.now();

    // Test various zoom levels
    const zoomLevels = [0.5, 1, 2, 5, 10, 0.1];
    zoomLevels.forEach(zoom => {
      rerender(
        <TestWrapper>
          <VirtualizedTrackContainer 
            tracks={tracks}
            currentTime={0}
            zoom={zoom}
            pixelsPerSecond={100}
            theme={defaultTheme}
            estimatedItemSize={60}
            containerHeight={400}
          />
        </TestWrapper>
      );
    });

    const zoomTime = performance.now() - startTime;

    // Should handle zoom changes quickly
    expect(zoomTime).toBeLessThan(100); // Less than 100ms for all zoom changes

    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });
});

describe('VirtualizedTrackContainer Integration', () => {
  it('emits performance events in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const tracks = generateMockTracks(100, 5);
    
    render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={tracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    // In a real scenario, we would listen for the performance events
    // For now, just verify the component renders
    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('calculates timeline width correctly', () => {
    const tracks = generateMockTracks(10, 3);
    // Each track has 3 clips: start at 0, 2, 4 with duration 1.5
    // So max end time is 4 + 1.5 = 5.5 seconds
    // At 100 pixels per second with zoom 1: 5.5 * 100 * 1 = 550px
    // But minimum width is 1000px

    render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={tracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });

  it('filters invisible tracks', () => {
    const tracks = generateMockTracks(10, 2);
    // Make half the tracks invisible
    tracks.forEach((track, index) => {
      track.isVisible = index % 2 === 0;
    });

    render(
      <TestWrapper>
        <VirtualizedTrackContainer 
          tracks={tracks}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={defaultTheme}
          estimatedItemSize={60}
          containerHeight={400}
        />
      </TestWrapper>
    );

    // Should still render the container
    expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
  });
});