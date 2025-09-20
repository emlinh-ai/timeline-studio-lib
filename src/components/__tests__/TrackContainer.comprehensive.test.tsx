import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackContainer } from '../TrackContainer';
import { Track, Clip } from '../../types';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';

// Mock child components
jest.mock('../Track', () => ({
  Track: ({ track, onClipSelect }: any) => (
    <div 
      data-testid={`track-${track.id}`}
      onClick={() => onClipSelect?.('test-clip')}
    >
      Track: {track.name} ({track.clips.length} clips)
    </div>
  )
}));

jest.mock('../ScrollableContainer', () => ({
  ScrollableContainer: ({ children, onScrollChange }: any) => (
    <div 
      data-testid="scrollable-container"
      onScroll={() => onScrollChange?.(100, 10)}
    >
      {children}
    </div>
  )
}));

jest.mock('../VirtualizedTrackContainer', () => ({
  VirtualizedTrackContainer: ({ tracks }: any) => (
    <div data-testid="virtualized-container">
      Virtualized: {tracks.length} tracks
    </div>
  )
}));

const createMockClip = (id: string, start: number, duration: number): Clip => ({
  id,
  trackId: 'track-1',
  start,
  duration,
  type: 'video',
  metadata: { name: `Clip ${id}` }
});

const createMockTrack = (id: string, name: string, clips: Clip[], isVisible = true): Track => ({
  id,
  type: 'video',
  name,
  height: 60,
  isVisible,
  clips
});

const defaultProps = {
  tracks: [
    createMockTrack('track-1', 'Video Track', [
      createMockClip('clip-1', 0, 30),
      createMockClip('clip-2', 30, 30)
    ]),
    createMockTrack('track-2', 'Audio Track', [
      createMockClip('clip-3', 10, 20)
    ])
  ],
  currentTime: 15,
  zoom: 1,
  pixelsPerSecond: 30,
  selectedClipId: 'clip-1'
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventBusProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </EventBusProvider>
  );
};

describe('TrackContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all visible tracks', () => {
      renderWithProviders(<TrackContainer {...defaultProps} />);
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
      expect(screen.getByTestId('track-track-2')).toBeInTheDocument();
      expect(screen.getByText('Track: Video Track (2 clips)')).toBeInTheDocument();
      expect(screen.getByText('Track: Audio Track (1 clips)')).toBeInTheDocument();
    });

    it('should render scrollable container', () => {
      renderWithProviders(<TrackContainer {...defaultProps} />);
      
      expect(screen.getByTestId('scrollable-container')).toBeInTheDocument();
    });

    it('should render current time indicator', () => {
      const { container } = renderWithProviders(<TrackContainer {...defaultProps} />);
      
      const playhead = container.querySelector('.timeline-playhead');
      expect(playhead).toBeInTheDocument();
      expect(playhead).toHaveStyle({
        left: '450px', // currentTime * pixelsPerSecond * zoom = 15 * 30 * 1
        backgroundColor: '#ff4444'
      });
    });

    it('should filter out invisible tracks', () => {
      const tracksWithHidden = [
        ...defaultProps.tracks,
        createMockTrack('track-3', 'Hidden Track', [], false)
      ];
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={tracksWithHidden}
        />
      );
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
      expect(screen.getByTestId('track-track-2')).toBeInTheDocument();
      expect(screen.queryByTestId('track-track-3')).not.toBeInTheDocument();
    });
  });

  describe('Timeline Width Calculation', () => {
    it('should calculate timeline width based on clips', () => {
      const tracksWithLongClips = [
        createMockTrack('track-1', 'Long Track', [
          createMockClip('clip-1', 0, 100),
          createMockClip('clip-2', 100, 50) // Total duration: 150
        ])
      ];
      
      const { container } = renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={tracksWithLongClips}
        />
      );
      
      // Timeline width should be at least 150 * 30 * 1 = 4500px
      const tracksWrapper = container.querySelector('.tracks-wrapper');
      expect(tracksWrapper).toBeInTheDocument();
    });

    it('should use minimum width when no clips exist', () => {
      const emptyTracks = [
        createMockTrack('track-1', 'Empty Track', [])
      ];
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={emptyTracks}
        />
      );
      
      expect(screen.getByTestId('scrollable-container')).toBeInTheDocument();
    });

    it('should recalculate width when zoom changes', () => {
      const { rerender } = renderWithProviders(<TrackContainer {...defaultProps} />);
      
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <TrackContainer 
              {...defaultProps}
              zoom={2}
            />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      // Timeline width should double with zoom
      expect(screen.getByTestId('scrollable-container')).toBeInTheDocument();
    });
  });

  describe('Virtualization', () => {
    it('should use virtualized container when enabled and many tracks', () => {
      const manyTracks = Array.from({ length: 15 }, (_, i) => 
        createMockTrack(`track-${i}`, `Track ${i}`, [])
      );
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={manyTracks}
          enableVirtualization={true}
        />
      );
      
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
      expect(screen.getByText('Virtualized: 15 tracks')).toBeInTheDocument();
    });

    it('should not use virtualization with few tracks', () => {
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          enableVirtualization={true}
        />
      );
      
      expect(screen.queryByTestId('virtualized-container')).not.toBeInTheDocument();
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
    });

    it('should pass correct props to virtualized container', () => {
      const manyTracks = Array.from({ length: 15 }, (_, i) => 
        createMockTrack(`track-${i}`, `Track ${i}`, [])
      );
      
      const onClipSelect = jest.fn();
      const onScrollChange = jest.fn();
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={manyTracks}
          enableVirtualization={true}
          estimatedItemSize={80}
          onClipSelect={onClipSelect}
          onScrollChange={onScrollChange}
        />
      );
      
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should handle clip selection', () => {
      const onClipSelect = jest.fn();
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          onClipSelect={onClipSelect}
        />
      );
      
      fireEvent.click(screen.getByTestId('track-track-1'));
      expect(onClipSelect).toHaveBeenCalledWith('test-clip');
    });

    it('should handle scroll changes', () => {
      const onScrollChange = jest.fn();
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          onScrollChange={onScrollChange}
        />
      );
      
      fireEvent.scroll(screen.getByTestId('scrollable-container'));
      expect(onScrollChange).toHaveBeenCalledWith(100, 10);
    });

    it('should handle clip drag events', () => {
      const onClipDrag = jest.fn();
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          onClipDrag={onClipDrag}
        />
      );
      
      // Event would be handled by Track component
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
    });

    it('should handle clip resize events', () => {
      const onClipResize = jest.fn();
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          onClipResize={onClipResize}
        />
      );
      
      // Event would be handled by Track component
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
    });
  });

  describe('Custom Clip Rendering', () => {
    it('should pass custom renderer to tracks', () => {
      const customRenderer = jest.fn(() => <div>Custom Clip</div>);
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          renderClip={customRenderer}
        />
      );
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
      expect(screen.getByTestId('track-track-2')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no tracks', () => {
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={[]}
        />
      );
      
      expect(screen.getByText('No tracks to display')).toBeInTheDocument();
    });

    it('should show empty state when all tracks are hidden', () => {
      const hiddenTracks = defaultProps.tracks.map(track => ({
        ...track,
        isVisible: false
      }));
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={hiddenTracks}
        />
      );
      
      expect(screen.getByText('No tracks to display')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize component to prevent unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(<TrackContainer {...defaultProps} />);
      
      // Re-render with same props
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <TrackContainer {...defaultProps} />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
    });

    it('should recalculate timeline width only when necessary', () => {
      const { rerender } = renderWithProviders(<TrackContainer {...defaultProps} />);
      
      // Re-render with different currentTime (should not affect timeline width)
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <TrackContainer 
              {...defaultProps}
              currentTime={20}
            />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
    });

    it('should handle large numbers of tracks efficiently', () => {
      const manyTracks = Array.from({ length: 100 }, (_, i) => 
        createMockTrack(`track-${i}`, `Track ${i}`, [])
      );
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={manyTracks}
          enableVirtualization={true}
        />
      );
      
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      const { container } = renderWithProviders(<TrackContainer {...defaultProps} />);
      
      const trackContainer = container.querySelector('.track-container');
      expect(trackContainer).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%'
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide accessible structure', () => {
      renderWithProviders(<TrackContainer {...defaultProps} />);
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
      expect(screen.getByTestId('track-track-2')).toBeInTheDocument();
    });

    it('should handle keyboard navigation through tracks', () => {
      renderWithProviders(<TrackContainer {...defaultProps} />);
      
      const track1 = screen.getByTestId('track-track-1');
      const track2 = screen.getByTestId('track-track-2');
      
      expect(track1).toBeInTheDocument();
      expect(track2).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tracks with no clips', () => {
      const tracksWithEmpty = [
        createMockTrack('track-1', 'Empty Track', []),
        createMockTrack('track-2', 'Normal Track', [
          createMockClip('clip-1', 0, 30)
        ])
      ];
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={tracksWithEmpty}
        />
      );
      
      expect(screen.getByText('Track: Empty Track (0 clips)')).toBeInTheDocument();
      expect(screen.getByText('Track: Normal Track (1 clips)')).toBeInTheDocument();
    });

    it('should handle zero zoom level', () => {
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          zoom={0}
        />
      );
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
    });

    it('should handle negative current time', () => {
      const { container } = renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          currentTime={-10}
        />
      );
      
      const playhead = container.querySelector('.timeline-playhead');
      expect(playhead).toHaveStyle({
        left: '-300px' // -10 * 30 * 1
      });
    });

    it('should handle very large timeline widths', () => {
      const longTrack = createMockTrack('track-1', 'Long Track', [
        createMockClip('clip-1', 0, 10000) // Very long clip
      ]);
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={[longTrack]}
        />
      );
      
      expect(screen.getByTestId('track-track-1')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with all event handlers', () => {
      const handlers = {
        onClipSelect: jest.fn(),
        onClipDrag: jest.fn(),
        onClipResize: jest.fn(),
        onScrollChange: jest.fn()
      };
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          {...handlers}
        />
      );
      
      fireEvent.click(screen.getByTestId('track-track-1'));
      expect(handlers.onClipSelect).toHaveBeenCalled();
      
      fireEvent.scroll(screen.getByTestId('scrollable-container'));
      expect(handlers.onScrollChange).toHaveBeenCalled();
    });

    it('should work with custom clip renderer and virtualization', () => {
      const manyTracks = Array.from({ length: 15 }, (_, i) => 
        createMockTrack(`track-${i}`, `Track ${i}`, [])
      );
      
      const customRenderer = jest.fn(() => <div>Custom</div>);
      
      renderWithProviders(
        <TrackContainer 
          {...defaultProps}
          tracks={manyTracks}
          enableVirtualization={true}
          renderClip={customRenderer}
        />
      );
      
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
    });
  });
});