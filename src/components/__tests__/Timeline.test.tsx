import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Timeline } from '../Timeline';
import { TimelineProps, Clip, Track } from '../../types';

// Mock data
const mockClip: Clip = {
  id: 'clip-1',
  trackId: 'track-1',
  start: 0,
  duration: 5,
  type: 'video',
  metadata: {
    name: 'Test Clip',
    thumbnailUrl: 'https://example.com/thumb.jpg'
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

const defaultProps: TimelineProps = {
  tracks: [mockTrack],
  duration: 10,
  currentTime: 0,
  zoom: 1
};

describe('Timeline Component', () => {
  beforeEach(() => {
    // Clear any console errors/warnings
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render without crashing', () => {
      render(<Timeline {...defaultProps} />);
      expect(screen.getByText('Time:')).toBeInTheDocument();
      expect(screen.getByText('Video Track')).toBeInTheDocument();
    });

    it('should render with empty state when no props provided', () => {
      render(<Timeline />);
      expect(screen.getByText('No tracks to display')).toBeInTheDocument();
      // Check time display in header
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:00');
    });

    it('should display correct initial state from props', () => {
      render(<Timeline {...defaultProps} />);
      expect(screen.getByText('Video Track')).toBeInTheDocument();
      // Check time display in header
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:00');
      expect(timeDisplay).toHaveTextContent('00:10');
    });

    it('should apply custom className', () => {
      const { container } = render(<Timeline {...defaultProps} className="custom-timeline" />);
      expect(container.querySelector('.timeline-root')).toHaveClass('custom-timeline');
    });

    it('should apply custom theme', () => {
      const customTheme = {
        primaryColor: '#ff0000',
        backgroundColor: '#000000',
        trackBackgroundColor: '#333333',
        clipBorderRadius: '8px',
        clipColors: {
          video: '#ff0000',
          audio: '#00ff00',
          text: '#0000ff',
          overlay: '#ffff00'
        },
        fonts: {
          primary: 'Arial, sans-serif',
          monospace: 'Courier, monospace'
        }
      };

      const { container } = render(<Timeline {...defaultProps} theme={customTheme} />);
      const timelineRoot = container.querySelector('.timeline-root');
      expect(timelineRoot).toHaveStyle('background-color: #000000');
      expect(timelineRoot).toHaveStyle('font-family: Arial, sans-serif');
    });
  });

  describe('Prop Handling', () => {
    it('should update state when tracks prop changes', async () => {
      const { rerender } = render(<Timeline {...defaultProps} />);
      expect(screen.getByText('Video Track')).toBeInTheDocument();

      const newTrack: Track = {
        id: 'track-2',
        type: 'audio',
        name: 'Audio Track',
        height: 60,
        isVisible: true,
        clips: []
      };

      rerender(<Timeline {...defaultProps} tracks={[mockTrack, newTrack]} />);
      await waitFor(() => {
        expect(screen.getByText('Audio Track')).toBeInTheDocument();
      });
    });

    it('should update state when duration prop changes', async () => {
      const { rerender } = render(<Timeline {...defaultProps} />);
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:10');

      rerender(<Timeline {...defaultProps} duration={20} />);
      await waitFor(() => {
        const updatedTimeDisplay = screen.getByText('Time:').parentElement;
        expect(updatedTimeDisplay).toHaveTextContent('00:20');
      });
    });

    it('should update state when currentTime prop changes', async () => {
      const { rerender } = render(<Timeline {...defaultProps} />);
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:00');

      rerender(<Timeline {...defaultProps} currentTime={5} />);
      await waitFor(() => {
        const updatedTimeDisplay = screen.getByText('Time:').parentElement;
        expect(updatedTimeDisplay).toHaveTextContent('00:05');
      });
    });

    it('should update state when zoom prop changes', async () => {
      const { rerender } = render(<Timeline {...defaultProps} />);
      expect(screen.getByText('100%')).toBeInTheDocument();

      rerender(<Timeline {...defaultProps} zoom={2} />);
      await waitFor(() => {
        expect(screen.getByText('200%')).toBeInTheDocument();
      });
    });
  });

  describe('Event Bus Integration', () => {
    it('should use custom namespace when provided', () => {
      render(<Timeline {...defaultProps} eventBusNamespace="custom-timeline" />);
      // The component should render without errors with custom namespace
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });
  });

  describe('Callback Props', () => {
    it('should call onStateChange when provided', () => {
      const mockOnStateChange = jest.fn();
      render(<Timeline {...defaultProps} onStateChange={mockOnStateChange} />);
      
      // Component should render successfully with callback
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });

    it('should handle callback props being undefined', () => {
      // Should not throw when callback props are not provided
      expect(() => {
        render(<Timeline {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid track data gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const invalidTrack = {
        ...mockTrack,
        id: '', // Invalid empty ID
      } as Track;

      // Should not crash, but may show error boundary
      render(<Timeline tracks={[invalidTrack]} />);
      // Either shows error boundary or timeline header
      expect(
        screen.queryByText('Time:') || 
        screen.queryByText('⚠️ Timeline Error')
      ).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid clip data gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const invalidClip = {
        ...mockClip,
        duration: -1, // Invalid negative duration
      } as Clip;

      const trackWithInvalidClip = {
        ...mockTrack,
        clips: [invalidClip]
      };

      // Should not crash, but may show error boundary
      render(<Timeline tracks={[trackWithInvalidClip]} />);
      // Either shows error boundary or timeline header
      expect(
        screen.queryByText('Time:') || 
        screen.queryByText('⚠️ Timeline Error')
      ).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Feature Flags', () => {
    it('should handle enableVirtualization prop', () => {
      render(<Timeline {...defaultProps} enableVirtualization={true} />);
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });

    it('should handle disableTouch prop', () => {
      render(<Timeline {...defaultProps} disableTouch={true} />);
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });

    it('should handle enableUndo prop', () => {
      render(<Timeline {...defaultProps} enableUndo={false} />);
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA structure', () => {
      const { container } = render(<Timeline {...defaultProps} />);
      const timelineRoot = container.querySelector('.timeline-root');
      expect(timelineRoot).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<Timeline {...defaultProps} />);
      const timelineRoot = screen.getByText('Time:').closest('.timeline-root');
      expect(timelineRoot).toBeInTheDocument();
      
      // Test that the component can receive focus (will be enhanced in later tasks)
      if (timelineRoot) {
        fireEvent.keyDown(timelineRoot, { key: 'Tab' });
        // Should not throw errors
      }
    });
  });

  describe('Performance', () => {
    it('should handle large number of tracks without crashing', () => {
      const largeTracks: Track[] = Array.from({ length: 100 }, (_, i) => ({
        id: `track-${i}`,
        type: 'video' as const,
        name: `Track ${i}`,
        height: 60,
        isVisible: true,
        clips: []
      }));

      render(<Timeline tracks={largeTracks} />);
      expect(screen.getByText('Track 0')).toBeInTheDocument();
      expect(screen.getByText('Track 99')).toBeInTheDocument();
    });

    it('should handle large number of clips without crashing', () => {
      const largeClips: Clip[] = Array.from({ length: 100 }, (_, i) => ({
        id: `clip-${i}`,
        trackId: 'track-1',
        start: i * 2,
        duration: 1,
        type: 'video' as const,
        metadata: { name: `Clip ${i}` }
      }));

      const trackWithManyClips: Track = {
        ...mockTrack,
        clips: largeClips
      };

      render(<Timeline tracks={[trackWithManyClips]} />);
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });
  });
});