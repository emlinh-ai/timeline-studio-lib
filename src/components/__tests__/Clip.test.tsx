import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Clip } from '../Clip';
import { Clip as ClipType, TimelineTheme } from '../../types';

// Mock theme for testing
const mockTheme: TimelineTheme = {
  primaryColor: '#007acc',
  backgroundColor: '#1e1e1e',
  trackBackgroundColor: '#2d2d2d',
  clipBorderRadius: '4px',
  clipColors: {
    video: '#4a90e2',
    audio: '#7ed321',
    text: '#f5a623',
    overlay: '#bd10e0'
  },
  fonts: {
    primary: 'Arial, sans-serif',
    monospace: 'Monaco, monospace'
  }
};

// Helper function to create test clips
const createTestClip = (overrides: Partial<ClipType> = {}): ClipType => ({
  id: 'test-clip-1',
  trackId: 'track-1',
  start: 10,
  duration: 5,
  type: 'video',
  metadata: {
    name: 'Test Clip'
  },
  ...overrides
});

describe('Clip Component', () => {
  const defaultProps = {
    clip: createTestClip(),
    isSelected: false,
    theme: mockTheme,
    pixelsPerSecond: 50,
    zoom: 1,
    trackHeight: 60,
    onSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Positioning and Dimensions', () => {
    it('should position clip based on start time and duration', () => {
      const clip = createTestClip({ start: 10, duration: 5 });
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Expected left position: start (10) * pixelsPerSecond (50) * zoom (1) = 500px
      expect(styles.left).toBe('500px');
      // Expected width: duration (5) * pixelsPerSecond (50) * zoom (1) = 250px
      expect(styles.width).toBe('250px');
    });

    it('should apply zoom factor to positioning and width', () => {
      const clip = createTestClip({ start: 5, duration: 2 });
      render(<Clip {...defaultProps} clip={clip} zoom={2} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Expected left position: start (5) * pixelsPerSecond (50) * zoom (2) = 500px
      expect(styles.left).toBe('500px');
      // Expected width: duration (2) * pixelsPerSecond (50) * zoom (2) = 200px
      expect(styles.width).toBe('200px');
    });

    it('should enforce minimum width for very short clips', () => {
      const clip = createTestClip({ start: 0, duration: 0.1 });
      render(<Clip {...defaultProps} clip={clip} pixelsPerSecond={10} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Duration (0.1) * pixelsPerSecond (10) * zoom (1) = 1px, but minimum is 20px
      expect(styles.width).toBe('20px');
    });

    it('should calculate height based on track height with padding', () => {
      render(<Clip {...defaultProps} trackHeight={80} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Expected height: trackHeight (80) - 8px padding = 72px
      expect(styles.height).toBe('72px');
      expect(styles.top).toBe('4px');
    });
  });

  describe('Type-specific Styling', () => {
    it('should apply video clip styling', () => {
      const clip = createTestClip({ type: 'video' });
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Convert hex to rgb for comparison
      expect(styles.backgroundColor).toBe('rgb(74, 144, 226)'); // #4a90e2
      expect(clipElement).toHaveClass('clip-video');
      expect(screen.getByText('🎥')).toBeInTheDocument();
    });

    it('should apply audio clip styling with pattern', () => {
      const clip = createTestClip({ type: 'audio' });
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Convert hex to rgb for comparison
      expect(styles.backgroundColor).toBe('rgb(126, 211, 33)'); // #7ed321
      expect(clipElement).toHaveClass('clip-audio');
      expect(screen.getByText('🎵')).toBeInTheDocument();
      // Audio clips should have background-size set (which indicates pattern styling)
      expect(styles.backgroundSize).toBe('8px 8px');
    });

    it('should apply text clip styling', () => {
      const clip = createTestClip({ type: 'text', metadata: { text: 'Hello World' } });
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Convert hex to rgb for comparison
      expect(styles.backgroundColor).toBe('rgb(245, 166, 35)'); // #f5a623
      expect(clipElement).toHaveClass('clip-text');
      expect(screen.getByText('📝')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should apply overlay clip styling', () => {
      const clip = createTestClip({ type: 'overlay' });
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Convert hex to rgb for comparison
      expect(styles.backgroundColor).toBe('rgb(189, 16, 224)'); // #bd10e0
      expect(clipElement).toHaveClass('clip-overlay');
      expect(screen.getByText('🎨')).toBeInTheDocument();
    });
  });

  describe('Selection State and Visual Feedback', () => {
    it('should apply selected styling when isSelected is true', () => {
      render(<Clip {...defaultProps} isSelected={true} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      expect(clipElement).toHaveClass('selected');
      expect(styles.border).toContain(mockTheme.primaryColor);
      expect(styles.opacity).toBe('1');
      expect(styles.zIndex).toBe('10');
      expect(styles.boxShadow).toContain(mockTheme.primaryColor);
      expect(styles.transform).toBe('translateY(-1px)');
    });

    it('should apply unselected styling when isSelected is false', () => {
      render(<Clip {...defaultProps} isSelected={false} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      expect(clipElement).not.toHaveClass('selected');
      expect(styles.opacity).toBe('0.9');
      expect(styles.zIndex).toBe('1');
      expect(styles.transform).toBe('none');
    });

    it('should call onSelect when clicked', () => {
      const onSelect = jest.fn();
      const clip = createTestClip({ id: 'test-clip-123' });
      
      render(<Clip {...defaultProps} clip={clip} onSelect={onSelect} />);
      
      const clipElement = screen.getByRole('button');
      fireEvent.click(clipElement);
      
      expect(onSelect).toHaveBeenCalledWith('test-clip-123');
    });

    it('should call onSelect when Enter key is pressed', () => {
      const onSelect = jest.fn();
      const clip = createTestClip({ id: 'test-clip-456' });
      
      render(<Clip {...defaultProps} clip={clip} onSelect={onSelect} />);
      
      const clipElement = screen.getByRole('button');
      fireEvent.keyDown(clipElement, { key: 'Enter' });
      
      expect(onSelect).toHaveBeenCalledWith('test-clip-456');
    });

    it('should call onSelect when Space key is pressed', () => {
      const onSelect = jest.fn();
      const clip = createTestClip({ id: 'test-clip-789' });
      
      render(<Clip {...defaultProps} clip={clip} onSelect={onSelect} />);
      
      const clipElement = screen.getByRole('button');
      fireEvent.keyDown(clipElement, { key: ' ' });
      
      expect(onSelect).toHaveBeenCalledWith('test-clip-789');
    });

    it('should call onDoubleClick when double clicked', () => {
      const onDoubleClick = jest.fn();
      const clip = createTestClip({ id: 'test-clip-double' });
      
      render(<Clip {...defaultProps} clip={clip} onDoubleClick={onDoubleClick} />);
      
      const clipElement = screen.getByRole('button');
      fireEvent.doubleClick(clipElement);
      
      expect(onDoubleClick).toHaveBeenCalledWith('test-clip-double');
    });

    it('should stop event propagation on click', () => {
      const onSelect = jest.fn();
      const parentClick = jest.fn();
      
      render(
        <div onClick={parentClick}>
          <Clip {...defaultProps} onSelect={onSelect} />
        </div>
      );
      
      const clipElement = screen.getByRole('button');
      fireEvent.click(clipElement);
      
      expect(onSelect).toHaveBeenCalled();
      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe('Content Display', () => {
    it('should display clip name from metadata', () => {
      const clip = createTestClip({ metadata: { name: 'My Custom Clip' } });
      render(<Clip {...defaultProps} clip={clip} />);
      
      expect(screen.getByText('My Custom Clip')).toBeInTheDocument();
    });

    it('should display default name based on type when no metadata name', () => {
      const clip = createTestClip({ type: 'audio', metadata: {} });
      render(<Clip {...defaultProps} clip={clip} />);
      
      expect(screen.getByText('Audio Clip')).toBeInTheDocument();
    });

    it('should display text content for text clips', () => {
      const clip = createTestClip({ 
        type: 'text', 
        metadata: { text: 'Sample Text Content' } 
      });
      render(<Clip {...defaultProps} clip={clip} />);
      
      expect(screen.getByText('Sample Text Content')).toBeInTheDocument();
    });

    it('should display duration when clip is wide enough', () => {
      const clip = createTestClip({ duration: 125 }); // 2:05
      render(<Clip {...defaultProps} clip={clip} pixelsPerSecond={2} />); // Wide clip
      
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should not display duration when clip is too narrow', () => {
      const clip = createTestClip({ duration: 125 }); // 2:05
      render(<Clip {...defaultProps} clip={clip} pixelsPerSecond={0.1} />); // Narrow clip
      
      expect(screen.queryByText('2:05')).not.toBeInTheDocument();
    });

    it('should display AI indicator when clip is AI generated', () => {
      const clip = createTestClip({ metadata: { isAI: true } });
      render(<Clip {...defaultProps} clip={clip} />);
      
      expect(screen.getByText('✨')).toBeInTheDocument();
    });

    it('should display speed indicator when speed is not 1x', () => {
      const clip = createTestClip({ metadata: { speed: 2.5 } });
      render(<Clip {...defaultProps} clip={clip} />);
      
      expect(screen.getByText('2.5x')).toBeInTheDocument();
    });

    it('should not display speed indicator when speed is 1x', () => {
      const clip = createTestClip({ metadata: { speed: 1 } });
      render(<Clip {...defaultProps} clip={clip} />);
      
      expect(screen.queryByText('1x')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      const clip = createTestClip({ 
        type: 'video',
        duration: 65, // 1:05
        metadata: { name: 'Test Video' }
      });
      
      render(<Clip {...defaultProps} clip={clip} isSelected={true} />);
      
      const clipElement = screen.getByRole('button');
      expect(clipElement).toHaveAttribute(
        'aria-label',
        'video clip: Test Video, duration 1:05, selected'
      );
    });

    it('should have proper title attribute with duration', () => {
      const clip = createTestClip({ 
        duration: 90, // 1:30
        metadata: { name: 'Sample Clip' }
      });
      
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      expect(clipElement).toHaveAttribute('title', 'Sample Clip (1:30)');
    });

    it('should be focusable with tabIndex', () => {
      render(<Clip {...defaultProps} />);
      
      const clipElement = screen.getByRole('button');
      expect(clipElement).toHaveAttribute('tabIndex', '0');
    });

    it('should handle keyboard navigation', () => {
      const onSelect = jest.fn();
      render(<Clip {...defaultProps} onSelect={onSelect} />);
      
      const clipElement = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(clipElement, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);
      
      // Test Space key
      fireEvent.keyDown(clipElement, { key: ' ' });
      expect(onSelect).toHaveBeenCalledTimes(2);
      
      // Test other keys (should not trigger)
      fireEvent.keyDown(clipElement, { key: 'Escape' });
      expect(onSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('should show grab cursor when onDrag is provided', () => {
      const onDrag = jest.fn();
      render(<Clip {...defaultProps} onDrag={onDrag} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      expect(styles.cursor).toBe('grab');
    });

    it('should show pointer cursor when onDrag is not provided', () => {
      render(<Clip {...defaultProps} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      expect(styles.cursor).toBe('pointer');
    });

    it('should start dragging on mouse down', () => {
      const onDrag = jest.fn();
      const onSelect = jest.fn();
      
      render(<Clip {...defaultProps} onDrag={onDrag} onSelect={onSelect} />);
      
      const clipElement = screen.getByRole('button');
      
      act(() => {
        fireEvent.mouseDown(clipElement, { clientX: 100 });
      });
      
      expect(onSelect).toHaveBeenCalledWith(defaultProps.clip.id);
      expect(clipElement).toHaveClass('dragging');
    });

    it('should call onDrag during mouse move when dragging', () => {
      const onDrag = jest.fn();
      const clip = createTestClip({ start: 10, duration: 5 });
      
      render(<Clip {...defaultProps} clip={clip} onDrag={onDrag} />);
      
      const clipElement = screen.getByRole('button');
      
      // Start dragging
      act(() => {
        fireEvent.mouseDown(clipElement, { clientX: 100 });
      });
      
      // Move mouse
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: 150 }));
      });
      
      // Calculate expected new start time
      // deltaX = 150 - 100 = 50px
      // deltaTime = 50 / (50 * 1) = 1 second
      // newStart = 10 + 1 = 11 seconds
      expect(onDrag).toHaveBeenCalledWith(clip.id, 11);
    });

    it('should prevent negative start times during drag', () => {
      const onDrag = jest.fn();
      const clip = createTestClip({ start: 1, duration: 5 });
      
      render(<Clip {...defaultProps} clip={clip} onDrag={onDrag} />);
      
      const clipElement = screen.getByRole('button');
      
      // Start dragging
      act(() => {
        fireEvent.mouseDown(clipElement, { clientX: 100 });
      });
      
      // Move mouse to the left (negative direction)
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: 0 }));
      });
      
      // Should clamp to 0, not go negative
      expect(onDrag).toHaveBeenCalledWith(clip.id, 0);
    });

    it('should stop dragging on mouse up', () => {
      const onDrag = jest.fn();
      
      render(<Clip {...defaultProps} onDrag={onDrag} />);
      
      const clipElement = screen.getByRole('button');
      
      // Start dragging
      act(() => {
        fireEvent.mouseDown(clipElement, { clientX: 100 });
      });
      expect(clipElement).toHaveClass('dragging');
      
      // End dragging
      act(() => {
        fireEvent(document, new MouseEvent('mouseup'));
      });
      expect(clipElement).not.toHaveClass('dragging');
    });

    it('should apply dragging visual feedback', () => {
      const onDrag = jest.fn();
      
      render(<Clip {...defaultProps} onDrag={onDrag} />);
      
      const clipElement = screen.getByRole('button');
      
      // Check initial state
      expect(clipElement).not.toHaveClass('dragging');
      
      // Start dragging
      act(() => {
        fireEvent.mouseDown(clipElement, { clientX: 100 });
      });
      
      // Check dragging state
      expect(clipElement).toHaveClass('dragging');
      
      // The computed styles might not update immediately in tests,
      // but we can verify the class is applied which indicates the state changed
    });

    it('should not start dragging if onDrag is not provided', () => {
      render(<Clip {...defaultProps} />);
      
      const clipElement = screen.getByRole('button');
      fireEvent.mouseDown(clipElement, { clientX: 100 });
      
      expect(clipElement).not.toHaveClass('dragging');
    });

    it('should handle zoom factor in drag calculations', () => {
      const onDrag = jest.fn();
      const clip = createTestClip({ start: 10, duration: 5 });
      
      render(<Clip {...defaultProps} clip={clip} onDrag={onDrag} zoom={2} />);
      
      const clipElement = screen.getByRole('button');
      
      // Start dragging
      act(() => {
        fireEvent.mouseDown(clipElement, { clientX: 100 });
      });
      
      // Move mouse
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: 150 }));
      });
      
      // Calculate expected new start time with zoom factor
      // deltaX = 150 - 100 = 50px
      // deltaTime = 50 / (50 * 2) = 0.5 seconds
      // newStart = 10 + 0.5 = 10.5 seconds
      expect(onDrag).toHaveBeenCalledWith(clip.id, 10.5);
    });

    it('should clean up event listeners on unmount during drag', () => {
      const onDrag = jest.fn();
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<Clip {...defaultProps} onDrag={onDrag} />);
      
      const clipElement = screen.getByRole('button');
      
      // Start dragging
      act(() => {
        fireEvent.mouseDown(clipElement, { clientX: 100 });
      });
      
      // Unmount component
      act(() => {
        unmount();
      });
      
      // Should clean up event listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Resize Functionality', () => {
    it('should show resize handles when selected and onResize is provided', () => {
      const onResize = jest.fn();
      render(<Clip {...defaultProps} isSelected={true} onResize={onResize} />);
      
      expect(document.querySelector('.resize-handle-left')).toBeInTheDocument();
      expect(document.querySelector('.resize-handle-right')).toBeInTheDocument();
    });

    it('should not show resize handles when not selected', () => {
      const onResize = jest.fn();
      render(<Clip {...defaultProps} isSelected={false} onResize={onResize} />);
      
      expect(document.querySelector('.resize-handle-left')).not.toBeInTheDocument();
      expect(document.querySelector('.resize-handle-right')).not.toBeInTheDocument();
    });

    it('should not show resize handles when onResize is not provided', () => {
      render(<Clip {...defaultProps} isSelected={true} />);
      
      expect(document.querySelector('.resize-handle-left')).not.toBeInTheDocument();
      expect(document.querySelector('.resize-handle-right')).not.toBeInTheDocument();
    });

    it('should start resizing from right edge', () => {
      const onResize = jest.fn();
      const onSelect = jest.fn();
      
      render(<Clip {...defaultProps} isSelected={true} onResize={onResize} onSelect={onSelect} />);
      
      const rightHandle = document.querySelector('.resize-handle-right') as HTMLElement;
      
      act(() => {
        fireEvent.mouseDown(rightHandle, { clientX: 100 });
      });
      
      expect(onSelect).toHaveBeenCalledWith(defaultProps.clip.id);
      expect(screen.getByRole('button')).toHaveClass('resizing-right');
    });

    it('should start resizing from left edge', () => {
      const onResize = jest.fn();
      const onSelect = jest.fn();
      
      render(<Clip {...defaultProps} isSelected={true} onResize={onResize} onSelect={onSelect} />);
      
      const leftHandle = document.querySelector('.resize-handle-left') as HTMLElement;
      
      act(() => {
        fireEvent.mouseDown(leftHandle, { clientX: 100 });
      });
      
      expect(onSelect).toHaveBeenCalledWith(defaultProps.clip.id);
      expect(screen.getByRole('button')).toHaveClass('resizing-left');
    });

    it('should call onResize when resizing from right edge', () => {
      const onResize = jest.fn();
      const clip = createTestClip({ start: 10, duration: 5 });
      
      render(<Clip {...defaultProps} clip={clip} isSelected={true} onResize={onResize} />);
      
      const rightHandle = document.querySelector('.resize-handle-right') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(rightHandle, { clientX: 100 });
      });
      
      // Move mouse to increase duration
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: 150 }));
      });
      
      // Calculate expected new duration
      // deltaX = 150 - 100 = 50px
      // deltaTime = 50 / (50 * 1) = 1 second
      // newDuration = 5 + 1 = 6 seconds
      expect(onResize).toHaveBeenCalledWith(clip.id, 6);
    });

    it('should call onResize and onDrag when resizing from left edge', () => {
      const onResize = jest.fn();
      const onDrag = jest.fn();
      const clip = createTestClip({ start: 10, duration: 5 });
      
      render(<Clip {...defaultProps} clip={clip} isSelected={true} onResize={onResize} onDrag={onDrag} />);
      
      const leftHandle = document.querySelector('.resize-handle-left') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(leftHandle, { clientX: 100 });
      });
      
      // Move mouse to the right (decrease start time, increase duration)
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: 150 }));
      });
      
      // Calculate expected changes
      // deltaX = 150 - 100 = 50px
      // deltaTime = 50 / (50 * 1) = 1 second
      // newStart = 10 + 1 = 11 seconds
      // newDuration = 5 - 1 = 4 seconds
      expect(onDrag).toHaveBeenCalledWith(clip.id, 11);
      expect(onResize).toHaveBeenCalledWith(clip.id, 4);
    });

    it('should enforce minimum duration during resize', () => {
      const onResize = jest.fn();
      const clip = createTestClip({ start: 10, duration: 0.5 });
      
      render(<Clip {...defaultProps} clip={clip} isSelected={true} onResize={onResize} />);
      
      const rightHandle = document.querySelector('.resize-handle-right') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(rightHandle, { clientX: 100 });
      });
      
      // Move mouse to the left (decrease duration)
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: 0 }));
      });
      
      // Should enforce minimum duration of 0.1 seconds
      expect(onResize).toHaveBeenCalledWith(clip.id, 0.1);
    });

    it('should prevent negative start times during left edge resize', () => {
      const onResize = jest.fn();
      const onDrag = jest.fn();
      const clip = createTestClip({ start: 1, duration: 5 });
      
      render(<Clip {...defaultProps} clip={clip} isSelected={true} onResize={onResize} onDrag={onDrag} />);
      
      const leftHandle = document.querySelector('.resize-handle-left') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(leftHandle, { clientX: 100 });
      });
      
      // Move mouse far to the left (would cause negative start time)
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: -200 }));
      });
      
      // Should clamp start time to 0
      expect(onDrag).toHaveBeenCalledWith(clip.id, 0);
      // Duration should be adjusted accordingly (original start + duration - new start)
      expect(onResize).toHaveBeenCalledWith(clip.id, 6); // 1 + 5 - 0 = 6
    });

    it('should stop resizing on mouse up', () => {
      const onResize = jest.fn();
      
      render(<Clip {...defaultProps} isSelected={true} onResize={onResize} />);
      
      const rightHandle = document.querySelector('.resize-handle-right') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(rightHandle, { clientX: 100 });
      });
      expect(screen.getByRole('button')).toHaveClass('resizing-right');
      
      // End resizing
      act(() => {
        fireEvent(document, new MouseEvent('mouseup'));
      });
      expect(screen.getByRole('button')).not.toHaveClass('resizing-right');
    });

    it('should apply resizing visual feedback', () => {
      const onResize = jest.fn();
      
      render(<Clip {...defaultProps} isSelected={true} onResize={onResize} />);
      
      const clipElement = screen.getByRole('button');
      const rightHandle = document.querySelector('.resize-handle-right') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(rightHandle, { clientX: 100 });
      });
      
      expect(clipElement).toHaveClass('resizing-right');
    });

    it('should handle zoom factor in resize calculations', () => {
      const onResize = jest.fn();
      const clip = createTestClip({ start: 10, duration: 5 });
      
      render(<Clip {...defaultProps} clip={clip} isSelected={true} onResize={onResize} zoom={2} />);
      
      const rightHandle = document.querySelector('.resize-handle-right') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(rightHandle, { clientX: 100 });
      });
      
      // Move mouse
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', { clientX: 150 }));
      });
      
      // Calculate expected new duration with zoom factor
      // deltaX = 150 - 100 = 50px
      // deltaTime = 50 / (50 * 2) = 0.5 seconds
      // newDuration = 5 + 0.5 = 5.5 seconds
      expect(onResize).toHaveBeenCalledWith(clip.id, 5.5);
    });

    it('should clean up event listeners on unmount during resize', () => {
      const onResize = jest.fn();
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<Clip {...defaultProps} isSelected={true} onResize={onResize} />);
      
      const rightHandle = document.querySelector('.resize-handle-right') as HTMLElement;
      
      // Start resizing
      act(() => {
        fireEvent.mouseDown(rightHandle, { clientX: 100 });
      });
      
      // Unmount component
      act(() => {
        unmount();
      });
      
      // Should clean up event listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration clips', () => {
      const clip = createTestClip({ duration: 0 });
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Should still have minimum width
      expect(styles.width).toBe('20px');
      // Duration won't be shown because clip is too narrow (20px < 60px threshold)
      expect(screen.queryByText('0:00')).not.toBeInTheDocument();
      // But it should be in the title
      expect(clipElement).toHaveAttribute('title', 'Test Clip (0:00)');
    });

    it('should handle negative start times', () => {
      const clip = createTestClip({ start: -5 });
      render(<Clip {...defaultProps} clip={clip} />);
      
      const clipElement = screen.getByRole('button');
      const styles = window.getComputedStyle(clipElement);
      
      // Should position at negative left
      expect(styles.left).toBe('-250px');
    });

    it('should handle very large durations', () => {
      const clip = createTestClip({ duration: 3661 }); // 1:01:01
      render(<Clip {...defaultProps} clip={clip} pixelsPerSecond={1} />);
      
      expect(screen.getByText('61:01')).toBeInTheDocument(); // Minutes:seconds format
    });

    it('should handle missing metadata gracefully', () => {
      const clip = createTestClip({ metadata: undefined });
      render(<Clip {...defaultProps} clip={clip} />);
      
      expect(screen.getByText('Video Clip')).toBeInTheDocument();
      expect(screen.queryByText('✨')).not.toBeInTheDocument();
      expect(screen.queryByText(/x$/)).not.toBeInTheDocument();
    });
  });
});