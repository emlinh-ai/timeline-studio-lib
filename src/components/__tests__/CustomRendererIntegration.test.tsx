import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Track } from '../Track';
import { Track as TrackType, ClipRendererProps } from '../../types';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { ThemeProvider } from '../../theme';

// Mock the ClipRenderer component
jest.mock('../ClipRenderer', () => ({
  ClipRenderer: ({ clip, customRenderer, onSelect, onDrag, onResize, isSelected }: any) => {
    if (customRenderer) {
      try {
        const customElement = customRenderer({
          clip,
          isSelected,
          onSelect,
          onDrag,
          onResize,
          style: {}
        });
        return (
          <div data-testid={`custom-rendered-${clip.id}`}>
            {customElement}
          </div>
        );
      } catch (error) {
        return (
          <div data-testid={`fallback-rendered-${clip.id}`}>
            Fallback for {clip.id}
          </div>
        );
      }
    }
    return (
      <div data-testid={`default-rendered-${clip.id}`}>
        Default: {clip.metadata?.name || clip.id}
      </div>
    );
  }
}));

const mockTrack: TrackType = {
  id: 'test-track',
  type: 'video',
  name: 'Test Video Track',
  height: 60,
  isVisible: true,
  clips: [
    {
      id: 'clip-1',
      trackId: 'test-track',
      start: 0,
      duration: 5,
      type: 'video',
      metadata: { name: 'First Clip' }
    },
    {
      id: 'clip-2',
      trackId: 'test-track',
      start: 10,
      duration: 3,
      type: 'video',
      metadata: { name: 'Second Clip' }
    }
  ]
};

const defaultProps = {
  track: mockTrack,
  index: 0,
  currentTime: 0,
  zoom: 1,
  pixelsPerSecond: 100,
  timelineWidth: 1000,
  onClipSelect: jest.fn(),
  onClipDrag: jest.fn(),
  onClipResize: jest.fn()
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <EventBusProvider namespace="test">
        {component}
      </EventBusProvider>
    </ThemeProvider>
  );
};

describe('Custom Renderer Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Track with Default Renderer', () => {
    it('should render all clips with default renderer when no custom renderer provided', () => {
      renderWithProviders(<Track {...defaultProps} />);

      expect(screen.getByTestId('default-rendered-clip-1')).toBeInTheDocument();
      expect(screen.getByTestId('default-rendered-clip-2')).toBeInTheDocument();
      expect(screen.getByText('Default: First Clip')).toBeInTheDocument();
      expect(screen.getByText('Default: Second Clip')).toBeInTheDocument();
    });
  });

  describe('Track with Custom Renderer', () => {
    it('should render all clips with custom renderer when provided', () => {
      const customRenderer = jest.fn((props: ClipRendererProps) => (
        <div data-testid={`custom-clip-${props.clip.id}`}>
          Custom: {props.clip.metadata?.name} ({props.clip.type})
        </div>
      ));

      renderWithProviders(
        <Track {...defaultProps} renderClip={customRenderer} />
      );

      expect(screen.getByTestId('custom-rendered-clip-1')).toBeInTheDocument();
      expect(screen.getByTestId('custom-rendered-clip-2')).toBeInTheDocument();
      expect(screen.getByText('Custom: First Clip (video)')).toBeInTheDocument();
      expect(screen.getByText('Custom: Second Clip (video)')).toBeInTheDocument();
      
      // Should be called once for each clip
      expect(customRenderer).toHaveBeenCalledTimes(2);
    });

    it('should pass correct props to custom renderer for each clip', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);

      renderWithProviders(
        <Track {...defaultProps} renderClip={customRenderer} />
      );

      // Check first clip call
      expect(customRenderer).toHaveBeenNthCalledWith(1, {
        clip: mockTrack.clips[0],
        isSelected: false,
        onSelect: expect.any(Function),
        onDrag: expect.any(Function),
        onResize: expect.any(Function),
        style: {}
      });

      // Check second clip call
      expect(customRenderer).toHaveBeenNthCalledWith(2, {
        clip: mockTrack.clips[1],
        isSelected: false,
        onSelect: expect.any(Function),
        onDrag: expect.any(Function),
        onResize: expect.any(Function),
        style: {}
      });
    });

    it('should handle selected clip state correctly', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);

      renderWithProviders(
        <Track 
          {...defaultProps} 
          selectedClipId="clip-1"
          renderClip={customRenderer} 
        />
      );

      // First clip should be selected
      expect(customRenderer).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({ isSelected: true })
      );

      // Second clip should not be selected
      expect(customRenderer).toHaveBeenNthCalledWith(2, 
        expect.objectContaining({ isSelected: false })
      );
    });
  });

  describe('Custom Renderer Error Handling', () => {
    it('should fallback to default renderer when custom renderer throws error', () => {
      const customRenderer = jest.fn(() => {
        throw new Error('Custom renderer failed');
      });

      renderWithProviders(
        <Track {...defaultProps} renderClip={customRenderer} />
      );

      // Should show fallback renderers
      expect(screen.getByTestId('fallback-rendered-clip-1')).toBeInTheDocument();
      expect(screen.getByTestId('fallback-rendered-clip-2')).toBeInTheDocument();
      expect(screen.getByText('Fallback for clip-1')).toBeInTheDocument();
      expect(screen.getByText('Fallback for clip-2')).toBeInTheDocument();
    });

    it('should handle mixed success/failure scenarios', () => {
      let callCount = 0;
      const customRenderer = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds
          return <div>Custom Success</div>;
        } else {
          // Second call fails
          throw new Error('Second renderer failed');
        }
      });

      renderWithProviders(
        <Track {...defaultProps} renderClip={customRenderer} />
      );

      // First clip should render custom
      expect(screen.getByTestId('custom-rendered-clip-1')).toBeInTheDocument();
      expect(screen.getByText('Custom Success')).toBeInTheDocument();

      // Second clip should fallback
      expect(screen.getByTestId('fallback-rendered-clip-2')).toBeInTheDocument();
      expect(screen.getByText('Fallback for clip-2')).toBeInTheDocument();
    });
  });

  describe('Event Handling with Custom Renderer', () => {
    it('should handle clip selection through custom renderer', () => {
      const onClipSelect = jest.fn();
      const customRenderer = jest.fn((props: ClipRendererProps) => (
        <button 
          data-testid={`custom-button-${props.clip.id}`}
          onClick={() => props.onSelect(props.clip.id)}
        >
          Select {props.clip.metadata?.name}
        </button>
      ));

      renderWithProviders(
        <Track 
          {...defaultProps} 
          onClipSelect={onClipSelect}
          renderClip={customRenderer} 
        />
      );

      const firstClipButton = screen.getByTestId('custom-button-clip-1');
      fireEvent.click(firstClipButton);

      expect(onClipSelect).toHaveBeenCalledWith('clip-1');
    });

    it('should handle drag operations through custom renderer', () => {
      const onClipDrag = jest.fn();
      const customRenderer = jest.fn((props: ClipRendererProps) => (
        <div 
          data-testid={`custom-drag-${props.clip.id}`}
          onMouseDown={() => props.onDrag(props.clip.id, props.clip.start + 5)}
        >
          Drag {props.clip.metadata?.name}
        </div>
      ));

      renderWithProviders(
        <Track 
          {...defaultProps} 
          onClipDrag={onClipDrag}
          renderClip={customRenderer} 
        />
      );

      const firstClipDrag = screen.getByTestId('custom-drag-clip-1');
      fireEvent.mouseDown(firstClipDrag);

      expect(onClipDrag).toHaveBeenCalledWith('clip-1', 5);
    });

    it('should handle resize operations through custom renderer', () => {
      const onClipResize = jest.fn();
      const customRenderer = jest.fn((props: ClipRendererProps) => (
        <div 
          data-testid={`custom-resize-${props.clip.id}`}
          onDoubleClick={() => props.onResize(props.clip.id, props.clip.duration + 2)}
        >
          Resize {props.clip.metadata?.name}
        </div>
      ));

      renderWithProviders(
        <Track 
          {...defaultProps} 
          onClipResize={onClipResize}
          renderClip={customRenderer} 
        />
      );

      const firstClipResize = screen.getByTestId('custom-resize-clip-1');
      fireEvent.doubleClick(firstClipResize);

      expect(onClipResize).toHaveBeenCalledWith('clip-1', 7);
    });
  });

  describe('Performance and Re-rendering', () => {
    it('should not re-render custom renderer unnecessarily', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);

      const { rerender } = renderWithProviders(
        <Track {...defaultProps} renderClip={customRenderer} />
      );

      expect(customRenderer).toHaveBeenCalledTimes(2);

      // Re-render with same props
      rerender(
        <ThemeProvider>
          <EventBusProvider namespace="test">
            <Track {...defaultProps} renderClip={customRenderer} />
          </EventBusProvider>
        </ThemeProvider>
      );

      // Should not call custom renderer again due to memoization
      expect(customRenderer).toHaveBeenCalledTimes(2);
    });

    it('should re-render when track clips change', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);

      const { rerender } = renderWithProviders(
        <Track {...defaultProps} renderClip={customRenderer} />
      );

      expect(customRenderer).toHaveBeenCalledTimes(2);

      // Add a new clip
      const updatedTrack = {
        ...mockTrack,
        clips: [
          ...mockTrack.clips,
          {
            id: 'clip-3',
            trackId: 'test-track',
            start: 15,
            duration: 2,
            type: 'video' as const,
            metadata: { name: 'Third Clip' }
          }
        ]
      };

      rerender(
        <ThemeProvider>
          <EventBusProvider namespace="test">
            <Track {...defaultProps} track={updatedTrack} renderClip={customRenderer} />
          </EventBusProvider>
        </ThemeProvider>
      );

      // Should call custom renderer for all clips including the new one
      expect(customRenderer).toHaveBeenCalledTimes(5); // 2 initial + 3 new
    });
  });

  describe('Different Clip Types', () => {
    it('should handle custom rendering for different clip types', () => {
      const mixedTrack: TrackType = {
        ...mockTrack,
        clips: [
          { id: 'video-clip', trackId: 'test-track', start: 0, duration: 5, type: 'video', metadata: { name: 'Video' } },
          { id: 'audio-clip', trackId: 'test-track', start: 5, duration: 3, type: 'audio', metadata: { name: 'Audio' } },
          { id: 'text-clip', trackId: 'test-track', start: 8, duration: 2, type: 'text', metadata: { name: 'Text' } },
          { id: 'overlay-clip', trackId: 'test-track', start: 10, duration: 4, type: 'overlay', metadata: { name: 'Overlay' } }
        ]
      };

      const customRenderer = jest.fn((props: ClipRendererProps) => (
        <div data-testid={`custom-${props.clip.type}-${props.clip.id}`}>
          {props.clip.type.toUpperCase()}: {props.clip.metadata?.name}
        </div>
      ));

      renderWithProviders(
        <Track {...defaultProps} track={mixedTrack} renderClip={customRenderer} />
      );

      expect(screen.getByTestId('custom-video-video-clip')).toBeInTheDocument();
      expect(screen.getByTestId('custom-audio-audio-clip')).toBeInTheDocument();
      expect(screen.getByTestId('custom-text-text-clip')).toBeInTheDocument();
      expect(screen.getByTestId('custom-overlay-overlay-clip')).toBeInTheDocument();

      expect(screen.getByText('VIDEO: Video')).toBeInTheDocument();
      expect(screen.getByText('AUDIO: Audio')).toBeInTheDocument();
      expect(screen.getByText('TEXT: Text')).toBeInTheDocument();
      expect(screen.getByText('OVERLAY: Overlay')).toBeInTheDocument();

      expect(customRenderer).toHaveBeenCalledTimes(4);
    });
  });
});