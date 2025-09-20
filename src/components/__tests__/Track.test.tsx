import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Track } from '../Track';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { Track as TrackType, Clip, TimelineTheme } from '../../types';

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
const mockVideoClip: Clip = {
  id: 'clip-1',
  trackId: 'track-1',
  start: 0,
  duration: 5,
  type: 'video',
  metadata: {
    name: 'Test Video Clip'
  }
};

const mockAudioClip: Clip = {
  id: 'clip-2',
  trackId: 'track-1',
  start: 6,
  duration: 3,
  type: 'audio',
  metadata: {
    name: 'Test Audio Clip'
  }
};

const mockVideoTrack: TrackType = {
  id: 'track-1',
  type: 'video',
  name: 'Video Track',
  height: 60,
  isVisible: true,
  clips: [mockVideoClip]
};

const mockAudioTrack: TrackType = {
  id: 'track-2',
  type: 'audio',
  name: 'Audio Track',
  height: 60,
  isVisible: true,
  isMuted: false,
  clips: [mockAudioClip]
};

// Wrapper component with EventBus provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <EventBusProvider namespace="test">
    {children}
  </EventBusProvider>
);

const defaultProps = {
  track: mockVideoTrack,
  index: 0,
  currentTime: 0,
  zoom: 1,
  pixelsPerSecond: 100,
  theme: mockTheme,
  timelineWidth: 1000
};

describe('Track Component', () => {
  describe('Track Header', () => {
    it('should render track header with correct information', () => {
      render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
      expect(screen.getByText(/video.*•.*1.*clips/i)).toBeInTheDocument();
    });

    it('should display correct track type icons', () => {
      const { rerender } = render(
        <TestWrapper>
          <Track {...defaultProps} track={mockVideoTrack} />
        </TestWrapper>
      );

      // Video track should show video icon in header
      expect(screen.getAllByText('🎥')).toHaveLength(2); // One in header, one in clip

      // Audio track should show audio icon
      rerender(
        <TestWrapper>
          <Track {...defaultProps} track={mockAudioTrack} />
        </TestWrapper>
      );

      expect(screen.getAllByText('🎵')).toHaveLength(2); // One in header, one in clip
    });

    it('should show mute button for audio tracks', () => {
      render(
        <TestWrapper>
          <Track {...defaultProps} track={mockAudioTrack} />
        </TestWrapper>
      );

      const muteButton = screen.getByTitle('Mute');
      expect(muteButton).toBeInTheDocument();
      expect(muteButton).toHaveTextContent('🔊');
    });

    it('should not show mute button for non-audio tracks', () => {
      render(
        <TestWrapper>
          <Track {...defaultProps} track={mockVideoTrack} />
        </TestWrapper>
      );

      expect(screen.queryByTitle('Mute')).not.toBeInTheDocument();
    });

    it('should show visibility toggle button', () => {
      render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      const visibilityButton = screen.getByTitle('Hide track');
      expect(visibilityButton).toBeInTheDocument();
    });

    it('should handle muted audio track', () => {
      const mutedTrack = { ...mockAudioTrack, isMuted: true };
      render(
        <TestWrapper>
          <Track {...defaultProps} track={mutedTrack} />
        </TestWrapper>
      );

      const muteButton = screen.getByTitle('Unmute');
      expect(muteButton).toHaveTextContent('🔇');
    });

    it('should handle invisible track', () => {
      const invisibleTrack = { ...mockVideoTrack, isVisible: false };
      render(
        <TestWrapper>
          <Track {...defaultProps} track={invisibleTrack} />
        </TestWrapper>
      );

      const visibilityButton = screen.getByTitle('Show track');
      expect(visibilityButton).toBeInTheDocument();
    });
  });

  describe('Track Content', () => {
    it('should render track content area', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      const trackContent = container.querySelector('.track-content');
      expect(trackContent).toBeInTheDocument();
      expect(trackContent).toHaveStyle('position: relative');
    });

    it('should apply alternating background colors', () => {
      const { container: container1 } = render(
        <TestWrapper>
          <Track {...defaultProps} index={0} />
        </TestWrapper>
      );

      const { container: container2 } = render(
        <TestWrapper>
          <Track {...defaultProps} index={1} />
        </TestWrapper>
      );

      const trackContent1 = container1.querySelector('.track-content');
      const trackContent2 = container2.querySelector('.track-content');

      expect(trackContent1).toHaveStyle('background-color: #2d2d30');
      expect(trackContent2).toHaveStyle('background-color: #1e1e1e');
    });

    it('should render background grid', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      const trackGrid = container.querySelector('.track-grid');
      expect(trackGrid).toBeInTheDocument();
      expect(trackGrid).toHaveStyle('pointer-events: none');
    });

    it('should render drop zone', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      const dropZone = container.querySelector('.track-drop-zone');
      expect(dropZone).toBeInTheDocument();
      expect(dropZone).toHaveStyle('pointer-events: none');
    });
  });

  describe('Clip Rendering', () => {
    it('should render clips with correct positioning', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip');
      expect(clip).toBeInTheDocument();
      expect(clip).toHaveStyle('position: absolute');
      expect(clip).toHaveStyle('left: 0px'); // start at 0 seconds
      expect(clip).toHaveStyle('width: 500px'); // 5 seconds * 100 pixels
    });

    it('should render multiple clips', () => {
      const trackWithMultipleClips = {
        ...mockVideoTrack,
        clips: [mockVideoClip, { ...mockVideoClip, id: 'clip-2', start: 10 }]
      };

      render(
        <TestWrapper>
          <Track {...defaultProps} track={trackWithMultipleClips} />
        </TestWrapper>
      );

      const clips = screen.getAllByText('Test Video Clip');
      expect(clips).toHaveLength(2);
    });

    it('should apply correct clip colors based on type', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip-video');
      expect(clip).toHaveStyle('background-color: #4a90e2');
    });

    it('should show clip type indicators', () => {
      render(
        <TestWrapper>
          <Track {...defaultProps} />
        </TestWrapper>
      );

      // Video clip should show video icon
      expect(screen.getAllByText('🎥')).toHaveLength(2); // One in header, one in clip
    });

    it('should handle clips with no metadata name', () => {
      const clipWithoutName = { ...mockVideoClip, metadata: {} };
      const trackWithUnnamedClip = { ...mockVideoTrack, clips: [clipWithoutName] };

      render(
        <TestWrapper>
          <Track {...defaultProps} track={trackWithUnnamedClip} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Clip')).toBeInTheDocument();
    });

    it('should handle minimum clip width', () => {
      const veryShortClip = { ...mockVideoClip, duration: 0.1 }; // Very short duration
      const trackWithShortClip = { ...mockVideoTrack, clips: [veryShortClip] };

      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} track={trackWithShortClip} />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip');
      expect(clip).toHaveStyle('width: 40px'); // Minimum width
    });
  });

  describe('Clip Interactions', () => {
    it('should call onClipSelect when clip is clicked', () => {
      const mockOnClipSelect = jest.fn();
      render(
        <TestWrapper>
          <Track {...defaultProps} onClipSelect={mockOnClipSelect} />
        </TestWrapper>
      );

      const clip = screen.getByText('Test Video Clip');
      fireEvent.click(clip);

      expect(mockOnClipSelect).toHaveBeenCalledWith('clip-1');
    });

    it('should highlight selected clip', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} selectedClipId="clip-1" />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip.selected');
      expect(clip).toBeInTheDocument();
      expect(clip).toHaveStyle('border: 2px solid #007acc');
    });

    it('should deselect clips when clicking on empty track area', () => {
      const mockOnClipSelect = jest.fn();
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} onClipSelect={mockOnClipSelect} />
        </TestWrapper>
      );

      const trackContent = container.querySelector('.track-content');
      if (trackContent) {
        fireEvent.click(trackContent);
        expect(mockOnClipSelect).toHaveBeenCalledWith('');
      }
    });

    it('should not deselect when clicking on clip', () => {
      const mockOnClipSelect = jest.fn();
      render(
        <TestWrapper>
          <Track {...defaultProps} onClipSelect={mockOnClipSelect} />
        </TestWrapper>
      );

      const clip = screen.getByText('Test Video Clip');
      fireEvent.click(clip);

      // Should call with clip ID, not empty string
      expect(mockOnClipSelect).toHaveBeenCalledWith('clip-1');
      expect(mockOnClipSelect).not.toHaveBeenCalledWith('');
    });

    it('should use custom clip renderer when provided', () => {
      const customRenderer = jest.fn(() => <div>Custom Clip Renderer</div>);

      render(
        <TestWrapper>
          <Track {...defaultProps} renderClip={customRenderer} />
        </TestWrapper>
      );

      expect(screen.getByText('Custom Clip Renderer')).toBeInTheDocument();
      expect(customRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          clip: mockVideoClip,
          isSelected: false,
          onSelect: expect.any(Function),
          onDrag: expect.any(Function),
          onResize: expect.any(Function),
          style: expect.any(Object)
        })
      );
    });
  });

  describe('Track Types', () => {
    it('should render video track correctly', () => {
      render(
        <TestWrapper>
          <Track {...defaultProps} track={mockVideoTrack} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
      expect(screen.getByText(/video.*•.*1.*clips/i)).toBeInTheDocument();
    });

    it('should render audio track correctly', () => {
      render(
        <TestWrapper>
          <Track {...defaultProps} track={mockAudioTrack} />
        </TestWrapper>
      );

      expect(screen.getByText('Audio Track')).toBeInTheDocument();
      expect(screen.getByText(/audio.*•.*1.*clips/i)).toBeInTheDocument();
    });

    it('should render text track correctly', () => {
      const textTrack: TrackType = {
        id: 'track-3',
        type: 'text',
        name: 'Text Track',
        height: 60,
        isVisible: true,
        clips: []
      };

      render(
        <TestWrapper>
          <Track {...defaultProps} track={textTrack} />
        </TestWrapper>
      );

      expect(screen.getByText('Text Track')).toBeInTheDocument();
      expect(screen.getByText(/text.*•.*0.*clips/i)).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should render overlay track correctly', () => {
      const overlayTrack: TrackType = {
        id: 'track-4',
        type: 'overlay',
        name: 'Overlay Track',
        height: 60,
        isVisible: true,
        clips: []
      };

      render(
        <TestWrapper>
          <Track {...defaultProps} track={overlayTrack} />
        </TestWrapper>
      );

      expect(screen.getByText('Overlay Track')).toBeInTheDocument();
      expect(screen.getByText(/overlay.*•.*0.*clips/i)).toBeInTheDocument();
      expect(screen.getByText('🎨')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust clip positions based on zoom', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} zoom={2} />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip');
      expect(clip).toHaveStyle('width: 1000px'); // 5 seconds * 100 pixels * 2 zoom
    });

    it('should adjust clip positions based on pixelsPerSecond', () => {
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} pixelsPerSecond={50} />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip');
      expect(clip).toHaveStyle('width: 250px'); // 5 seconds * 50 pixels
    });

    it('should handle different track heights', () => {
      const tallTrack = { ...mockVideoTrack, height: 120 };
      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} track={tallTrack} />
        </TestWrapper>
      );

      const track = container.querySelector('.track');
      expect(track).toHaveStyle('height: 120px');

      const clip = container.querySelector('.clip');
      expect(clip).toHaveStyle('height: 112px'); // track height - 8px padding
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty track', () => {
      const emptyTrack = { ...mockVideoTrack, clips: [] };
      render(
        <TestWrapper>
          <Track {...defaultProps} track={emptyTrack} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Track')).toBeInTheDocument();
      expect(screen.getByText(/video.*•.*0.*clips/i)).toBeInTheDocument();
    });

    it('should handle track with very long name', () => {
      const longNameTrack = {
        ...mockVideoTrack,
        name: 'This is a very long track name that should be truncated'
      };

      render(
        <TestWrapper>
          <Track {...defaultProps} track={longNameTrack} />
        </TestWrapper>
      );

      expect(screen.getByText('This is a very long track name that should be truncated')).toBeInTheDocument();
    });

    it('should handle clips with zero duration', () => {
      const zeroDurationClip = { ...mockVideoClip, duration: 0 };
      const trackWithZeroClip = { ...mockVideoTrack, clips: [zeroDurationClip] };

      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} track={trackWithZeroClip} />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip');
      expect(clip).toHaveStyle('width: 40px'); // Minimum width
    });

    it('should handle negative clip start times', () => {
      const negativeStartClip = { ...mockVideoClip, start: -5 };
      const trackWithNegativeClip = { ...mockVideoTrack, clips: [negativeStartClip] };

      const { container } = render(
        <TestWrapper>
          <Track {...defaultProps} track={trackWithNegativeClip} />
        </TestWrapper>
      );

      const clip = container.querySelector('.clip');
      expect(clip).toHaveStyle('left: -500px'); // -5 seconds * 100 pixels
    });
  });
});