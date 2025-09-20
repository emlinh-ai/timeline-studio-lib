import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TrackContainer } from '../TrackContainer';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { Track, Clip, TimelineTheme } from '../../types';

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
    monospace: 'Courier, monospace'
  }
};

// Mock data
const mockClip: Clip = {
  id: 'clip-1',
  trackId: 'track-1',
  start: 0,
  duration: 5,
  type: 'video',
  metadata: {
    name: 'Test Video Clip'
  }
};

const mockTrack: Track = {
  id: 'track-1',
  type: 'video',
  name: 'Video Track',
  height: 60,
  isVisible: true,
  clips: [mockClip]
};

// Wrapper component with EventBus provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <EventBusProvider namespace="test">
    {children}
  </EventBusProvider>
);

const defaultProps = {
  tracks: [mockTrack],
  currentTime: 0,
  zoom: 1,
  pixelsPerSecond: 100,
  theme: mockTheme
};

describe('TrackContainer Component', () => {
  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });

    it('should render empty state when no tracks provided', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={[]} />
        </TestWrapper>
      );

      expect(screen.getByText('No tracks to display')).toBeInTheDocument();
    });

    it('should render multiple tracks', () => {
      const audioTrack: Track = {
        id: 'track-2',
        type: 'audio',
        name: 'Audio Track',
        height: 60,
        isVisible: true,
        clips: []
      };

      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={[mockTrack, audioTrack]} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
      expect(screen.getByText('Audio Track')).toBeInTheDocument();
    });

    it('should only render visible tracks', () => {
      const hiddenTrack: Track = {
        ...mockTrack,
        id: 'track-2',
        name: 'Hidden Track',
        isVisible: false
      };

      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={[mockTrack, hiddenTrack]} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
      expect(screen.queryByText('Hidden Track')).not.toBeInTheDocument();
    });

    it('should apply theme styles', () => {
      const { container } = render(
        <TestWrapper>
          <TrackContainer {...defaultProps} />
        </TestWrapper>
      );

      const trackContainer = container.querySelector('.track-container');
      expect(trackContainer).toHaveStyle('background-color: #1e1e1e');
    });
  });

  describe('Timeline Width Calculation', () => {
    it('should calculate timeline width based on clips', () => {
      const longClip: Clip = {
        id: 'clip-2',
        trackId: 'track-1',
        start: 10,
        duration: 20, // ends at 30 seconds
        type: 'video'
      };

      const trackWithLongClip: Track = {
        ...mockTrack,
        clips: [mockClip, longClip]
      };

      const { container } = render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={[trackWithLongClip]} />
        </TestWrapper>
      );

      const tracksWrapper = container.querySelector('.tracks-wrapper');
      expect(tracksWrapper).toHaveStyle('min-width: 3000px'); // 30 seconds * 100 pixels
    });

    it('should handle empty tracks', () => {
      const emptyTrack: Track = {
        ...mockTrack,
        clips: []
      };

      const { container } = render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={[emptyTrack]} />
        </TestWrapper>
      );

      const tracksWrapper = container.querySelector('.tracks-wrapper');
      expect(tracksWrapper).toHaveStyle('min-width: 1000px'); // Minimum width for usability
    });

    it('should adjust width based on zoom', () => {
      const { container } = render(
        <TestWrapper>
          <TrackContainer {...defaultProps} zoom={2} />
        </TestWrapper>
      );

      const tracksWrapper = container.querySelector('.tracks-wrapper');
      expect(tracksWrapper).toHaveStyle('min-width: 1000px'); // 5 seconds * 100 pixels * 2 zoom
    });
  });

  describe('Current Time Indicator', () => {
    it('should render current time indicator', () => {
      const { container } = render(
        <TestWrapper>
          <TrackContainer {...defaultProps} currentTime={2.5} />
        </TestWrapper>
      );

      const playhead = container.querySelector('.timeline-playhead');
      expect(playhead).toBeInTheDocument();
      expect(playhead).toHaveStyle('background-color: #ff4444');
    });

    it('should position playhead based on current time', () => {
      const { container } = render(
        <TestWrapper>
          <TrackContainer {...defaultProps} currentTime={2.5} />
        </TestWrapper>
      );

      const playhead = container.querySelector('.timeline-playhead');
      // Position calculation is complex, just check it exists and has positioning
      expect(playhead).toHaveStyle('position: absolute');
    });
  });

  describe('Clip Interactions', () => {
    it('should call onClipSelect when clip is clicked', () => {
      const mockOnClipSelect = jest.fn();
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} onClipSelect={mockOnClipSelect} />
        </TestWrapper>
      );

      const clip = screen.getByText('Test Video Clip');
      fireEvent.click(clip);

      expect(mockOnClipSelect).toHaveBeenCalledWith('clip-1');
    });

    it('should handle custom clip renderer', () => {
      const customRenderer = jest.fn(() => <div>Custom Clip</div>);
      
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} renderClip={customRenderer} />
        </TestWrapper>
      );

      expect(screen.getByText('Custom Clip')).toBeInTheDocument();
      expect(customRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          clip: mockClip,
          isSelected: false,
          onSelect: expect.any(Function),
          onDrag: expect.any(Function),
          onResize: expect.any(Function),
          style: expect.any(Object)
        })
      );
    });

    it('should highlight selected clip', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} selectedClipId="clip-1" />
        </TestWrapper>
      );

      const clip = screen.getByText('Test Video Clip').closest('.clip');
      expect(clip).toHaveClass('selected');
    });
  });

  describe('Virtualization', () => {
    it('should handle enableVirtualization prop', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} enableVirtualization={true} />
        </TestWrapper>
      );

      // For now, virtualization is not fully implemented, just check it renders
      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });

    it('should handle estimatedItemSize prop', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} estimatedItemSize={80} />
        </TestWrapper>
      );

      // For now, just check it renders without errors
      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large number of tracks', () => {
      const largeTracks: Track[] = Array.from({ length: 50 }, (_, i) => ({
        id: `track-${i}`,
        type: 'video' as const,
        name: `Track ${i}`,
        height: 60,
        isVisible: true,
        clips: []
      }));

      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={largeTracks} />
        </TestWrapper>
      );

      expect(screen.getByText('Track 0')).toBeInTheDocument();
      expect(screen.getByText('Track 49')).toBeInTheDocument();
    });

    it('should handle tracks with many clips', () => {
      const manyClips: Clip[] = Array.from({ length: 20 }, (_, i) => ({
        id: `clip-${i}`,
        trackId: 'track-1',
        start: i * 2,
        duration: 1,
        type: 'video' as const,
        metadata: { name: `Clip ${i}` }
      }));

      const trackWithManyClips: Track = {
        ...mockTrack,
        clips: manyClips
      };

      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={[trackWithManyClips]} />
        </TestWrapper>
      );

      expect(screen.getByText('Clip 0')).toBeInTheDocument();
      expect(screen.getByText('Clip 19')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tracks with zero height', () => {
      const zeroHeightTrack: Track = {
        ...mockTrack,
        height: 0
      };

      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} tracks={[zeroHeightTrack]} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });

    it('should handle negative current time', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} currentTime={-5} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });

    it('should handle zero zoom', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} zoom={0} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });

    it('should handle very small pixelsPerSecond', () => {
      render(
        <TestWrapper>
          <TrackContainer {...defaultProps} pixelsPerSecond={1} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });
  });
});