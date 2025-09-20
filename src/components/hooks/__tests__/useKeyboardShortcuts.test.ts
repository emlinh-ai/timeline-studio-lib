import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, useKeyboardNavigation } from '../useKeyboardShortcuts';
import { Track, Clip } from '../../../types';

// Mock data
const mockTracks: Track[] = [
  {
    id: 'track-1',
    type: 'video',
    name: 'Video Track',
    height: 60,
    isVisible: true,
    clips: [
      {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 2,
        type: 'video',
        metadata: { name: 'Video Clip 1' }
      },
      {
        id: 'clip-2',
        trackId: 'track-1',
        start: 3,
        duration: 1.5,
        type: 'video',
        metadata: { name: 'Video Clip 2' }
      }
    ]
  },
  {
    id: 'track-2',
    type: 'audio',
    name: 'Audio Track',
    height: 60,
    isVisible: true,
    clips: [
      {
        id: 'clip-3',
        trackId: 'track-2',
        start: 0.5,
        duration: 3,
        type: 'audio',
        metadata: { name: 'Audio Clip 1' }
      },
      {
        id: 'clip-4',
        trackId: 'track-2',
        start: 4,
        duration: 2,
        type: 'audio',
        metadata: { name: 'Audio Clip 2' }
      }
    ]
  }
];

describe('useKeyboardShortcuts', () => {
  let mockCallbacks: {
    onZoomIn: jest.Mock;
    onZoomOut: jest.Mock;
    onZoomReset: jest.Mock;
    onZoomToFit: jest.Mock;
  };

  beforeEach(() => {
    mockCallbacks = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onZoomReset: jest.fn(),
      onZoomToFit: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle zoom in shortcut (Ctrl/Cmd + =)', () => {
    renderHook(() => useKeyboardShortcuts({
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: '=',
      ctrlKey: true,
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('should handle zoom out shortcut (Ctrl/Cmd + -)', () => {
    renderHook(() => useKeyboardShortcuts({
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: '-',
      ctrlKey: true,
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('should handle zoom reset shortcut (Ctrl/Cmd + 0)', () => {
    renderHook(() => useKeyboardShortcuts({
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: '0',
      ctrlKey: true,
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onZoomReset).toHaveBeenCalledTimes(1);
  });

  it('should handle zoom to fit shortcut (Ctrl/Cmd + 9)', () => {
    renderHook(() => useKeyboardShortcuts({
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: '9',
      ctrlKey: true,
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onZoomToFit).toHaveBeenCalledTimes(1);
  });

  it('should not handle shortcuts when disabled', () => {
    renderHook(() => useKeyboardShortcuts({
      ...mockCallbacks,
      enabled: false
    }));

    const event = new KeyboardEvent('keydown', {
      key: '=',
      ctrlKey: true,
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onZoomIn).not.toHaveBeenCalled();
  });

  it('should not handle shortcuts when focused on input elements', () => {
    // Create a mock input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts({
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: '=',
      ctrlKey: true,
      bubbles: true
    });

    // Mock the event target
    Object.defineProperty(event, 'target', {
      value: input,
      enumerable: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onZoomIn).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });
});

describe('useKeyboardNavigation', () => {
  let mockCallbacks: {
    onClipSelect: jest.Mock;
    onClipDeselect: jest.Mock;
    onClipRemove: jest.Mock;
    onPlayPause: jest.Mock;
    onZoomIn: jest.Mock;
    onZoomOut: jest.Mock;
    onZoomReset: jest.Mock;
    onZoomToFit: jest.Mock;
  };

  beforeEach(() => {
    mockCallbacks = {
      onClipSelect: jest.fn(),
      onClipDeselect: jest.fn(),
      onClipRemove: jest.fn(),
      onPlayPause: jest.fn(),
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onZoomReset: jest.fn(),
      onZoomToFit: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should select first clip when no clip is selected and right arrow is pressed', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: undefined,
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipSelect).toHaveBeenCalledWith('clip-1');
  });

  it('should navigate to next clip in same track', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1',
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipSelect).toHaveBeenCalledWith('clip-2');
  });

  it('should navigate to previous clip in same track', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-2',
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipSelect).toHaveBeenCalledWith('clip-1');
  });

  it('should navigate to clip below (same column)', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1', // Start at 0 seconds in track 1
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    // Should select clip-3 which starts at 0.5 seconds (close to clip-1's start time)
    expect(mockCallbacks.onClipSelect).toHaveBeenCalledWith('clip-3');
  });

  it('should navigate to clip above (same column)', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-3', // Start at 0.5 seconds in track 2
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    // Should select clip-1 which starts at 0 seconds (close to clip-3's start time)
    expect(mockCallbacks.onClipSelect).toHaveBeenCalledWith('clip-1');
  });

  it('should handle play/pause with space key', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1',
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('should handle clip removal with Delete key', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1',
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipRemove).toHaveBeenCalledWith('clip-1');
  });

  it('should handle clip removal with Backspace key', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1',
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'Backspace',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipRemove).toHaveBeenCalledWith('clip-1');
  });

  it('should handle deselection with Escape key', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1',
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipDeselect).toHaveBeenCalledTimes(1);
  });

  it('should not handle navigation when disabled', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: undefined,
      ...mockCallbacks,
      enabled: false
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipSelect).not.toHaveBeenCalled();
  });

  it('should not handle navigation when focused on input elements', () => {
    // Create a mock input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: undefined,
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true
    });

    // Mock the event target
    Object.defineProperty(event, 'target', {
      value: input,
      enumerable: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipSelect).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });

  it('should not remove clip when no clip is selected', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: undefined,
      ...mockCallbacks,
      enabled: true
    }));

    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockCallbacks.onClipRemove).not.toHaveBeenCalled();
  });

  it('should handle zoom shortcuts through navigation hook', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1',
      ...mockCallbacks,
      enabled: true
    }));

    // Test zoom in
    const zoomInEvent = new KeyboardEvent('keydown', {
      key: '=',
      ctrlKey: true,
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(zoomInEvent);
    });

    expect(mockCallbacks.onZoomIn).toHaveBeenCalledTimes(1);

    // Test zoom out
    const zoomOutEvent = new KeyboardEvent('keydown', {
      key: '-',
      ctrlKey: true,
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(zoomOutEvent);
    });

    expect(mockCallbacks.onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('should return navigation functions', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-1',
      ...mockCallbacks,
      enabled: true
    }));

    expect(result.current).toHaveProperty('navigateToNextClip');
    expect(result.current).toHaveProperty('navigateToPreviousClip');
    expect(result.current).toHaveProperty('navigateToClipAbove');
    expect(result.current).toHaveProperty('navigateToClipBelow');
    expect(result.current).toHaveProperty('focusedElement');

    expect(typeof result.current.navigateToNextClip).toBe('function');
    expect(typeof result.current.navigateToPreviousClip).toBe('function');
    expect(typeof result.current.navigateToClipAbove).toBe('function');
    expect(typeof result.current.navigateToClipBelow).toBe('function');
  });

  it('should handle edge cases when navigating beyond boundaries', () => {
    renderHook(() => useKeyboardNavigation({
      tracks: mockTracks,
      selectedClipId: 'clip-2', // Last clip in track 1
      ...mockCallbacks,
      enabled: true
    }));

    // Try to navigate right from last clip in track
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    // Should not call onClipSelect since we're at the end
    expect(mockCallbacks.onClipSelect).not.toHaveBeenCalled();
  });
});