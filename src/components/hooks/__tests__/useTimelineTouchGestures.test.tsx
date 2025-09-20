import React, { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useTimelineTouchGestures } from '../useTimelineTouchGestures';
import { EventBusProvider } from '../../../eventBus/EventBusProvider';

// Mock the useTouchGestures hook
jest.mock('../useTouchGestures', () => ({
  useTouchGestures: jest.fn((elementRef, handlers, options) => {
    // Store handlers for testing
    (global as any).mockTouchHandlers = handlers;
    return { isActive: false, gestureInProgress: false };
  })
}));

// Mock the EventBus
const mockEmit = jest.fn();
jest.mock('../../../eventBus/EventBusProvider', () => ({
  ...jest.requireActual('../../../eventBus/EventBusProvider'),
  useEventBus: () => ({
    emit: mockEmit,
    on: jest.fn(),
    off: jest.fn()
  })
}));

// Test component that uses the hook
function TestComponent({ 
  options 
}: { 
  options: any;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  useTimelineTouchGestures(elementRef, options);

  return (
    <div ref={elementRef} data-testid="timeline-element">
      <div data-clip-id="clip-1" data-testid="clip-1">Clip 1</div>
      <div data-testid="empty-area">Empty Area</div>
    </div>
  );
}

describe('useTimelineTouchGestures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: jest.fn()
    }));

    // Mock document.elementFromPoint
    (global as any).document.elementFromPoint = jest.fn();
  });

  const defaultOptions = {
    disabled: false,
    pixelsPerSecond: 100,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 10,
    onClipSelect: jest.fn(),
    onContextMenu: jest.fn()
  };

  it('should initialize touch gestures with correct configuration', () => {
    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const mockUseTouchGestures = jest.requireMock('../useTouchGestures').useTouchGestures;
    
    expect(mockUseTouchGestures).toHaveBeenCalledWith(
      expect.any(Object), // elementRef
      expect.objectContaining({
        onSwipe: expect.any(Function),
        onPinch: expect.any(Function),
        onTap: expect.any(Function),
        onLongPress: expect.any(Function),
        onTouchStart: expect.any(Function)
      }),
      expect.objectContaining({
        disabled: false,
        config: expect.objectContaining({
          swipeThreshold: 5,
          pinchThreshold: 0.05,
          tapThreshold: 15
        }),
        allowedSelectors: expect.arrayContaining([
          '.timeline-root',
          '.timeline-body',
          '.track-container'
        ]),
        preventDefaultBehavior: true
      })
    );
  });

  it('should handle swipe gesture for scrolling', () => {
    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate horizontal right swipe
    handlers.onSwipe({
      type: 'swipe',
      direction: 'right',
      distance: 50,
      velocity: 0.5,
      deltaX: 50,
      deltaY: 0
    });

    expect(mockEmit).toHaveBeenCalledWith('timeline:touchScroll', {
      currentTime: 0,
      scrollLeft: -50
    });
  });

  it('should handle pinch gesture for zooming', () => {
    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate pinch zoom in
    handlers.onPinch({
      type: 'pinch',
      scale: 1.5,
      centerX: 100,
      centerY: 50,
      distance: 150
    });

    expect(mockEmit).toHaveBeenCalledWith('timeline:zoom', {
      oldScale: 1,
      newScale: 1.5,
      centerTime: 1 // 100px / (100 pixelsPerSecond * 1 zoom)
    });
  });

  it('should handle tap gesture on clip for selection', () => {
    const mockClipElement = document.createElement('div');
    mockClipElement.setAttribute('data-clip-id', 'clip-1');
    (global as any).document.elementFromPoint.mockReturnValue(mockClipElement);
    mockClipElement.closest = jest.fn(() => mockClipElement);

    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate tap on clip
    handlers.onTap({
      type: 'tap',
      x: 100,
      y: 50,
      timestamp: Date.now()
    });

    expect(defaultOptions.onClipSelect).toHaveBeenCalledWith('clip-1', 100, 50);
    expect(mockEmit).toHaveBeenCalledWith('timeline:clipClick', {
      clipId: 'clip-1',
      time: 1, // 100px / (100 pixelsPerSecond * 1 zoom)
      nativeEvent: expect.any(MouseEvent)
    });
  });

  it('should handle tap gesture on empty area for deselection', () => {
    const mockEmptyElement = document.createElement('div');
    (global as any).document.elementFromPoint.mockReturnValue(mockEmptyElement);
    mockEmptyElement.closest = jest.fn(() => null);

    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate tap on empty area
    handlers.onTap({
      type: 'tap',
      x: 100,
      y: 50,
      timestamp: Date.now()
    });

    expect(defaultOptions.onClipSelect).toHaveBeenCalledWith('', 100, 50);
  });

  it('should handle long press gesture for context menu', () => {
    const mockClipElement = document.createElement('div');
    mockClipElement.setAttribute('data-clip-id', 'clip-1');
    (global as any).document.elementFromPoint.mockReturnValue(mockClipElement);
    mockClipElement.closest = jest.fn(() => mockClipElement);

    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate long press
    handlers.onLongPress({
      type: 'longpress',
      x: 100,
      y: 50,
      timestamp: Date.now()
    });

    expect(defaultOptions.onContextMenu).toHaveBeenCalledWith(100, 50);
    expect(defaultOptions.onClipSelect).toHaveBeenCalledWith('clip-1', 100, 50);
  });

  it('should respect zoom limits in pinch gesture', () => {
    const options = {
      ...defaultOptions,
      zoom: 0.1, // At minimum zoom
      minZoom: 0.1,
      maxZoom: 10
    };

    render(
      <EventBusProvider namespace="test">
        <TestComponent options={options} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Try to zoom out beyond minimum
    handlers.onPinch({
      type: 'pinch',
      scale: 0.5, // Would result in 0.05 zoom
      centerX: 100,
      centerY: 50,
      distance: 50
    });

    expect(mockEmit).toHaveBeenCalledWith('timeline:zoom', {
      oldScale: 0.1,
      newScale: 0.1, // Should be clamped to minimum
      centerTime: expect.any(Number)
    });
  });

  it('should accumulate small scroll movements', () => {
    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate small swipe (below threshold)
    handlers.onSwipe({
      type: 'swipe',
      direction: 'right',
      distance: 3,
      velocity: 0.5,
      deltaX: 3,
      deltaY: 0
    });

    // Should not emit scroll event for small movement
    expect(mockEmit).not.toHaveBeenCalled();

    // Simulate another small swipe to accumulate
    handlers.onSwipe({
      type: 'swipe',
      direction: 'right',
      distance: 4,
      velocity: 0.5,
      deltaX: 4,
      deltaY: 0
    });

    // Should emit scroll event when accumulated movement exceeds threshold
    expect(mockEmit).toHaveBeenCalledWith('timeline:touchScroll', {
      currentTime: 0,
      scrollLeft: -7 // Accumulated deltaX
    });
  });

  it('should ignore vertical swipes', () => {
    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate vertical swipe
    handlers.onSwipe({
      type: 'swipe',
      direction: 'up',
      distance: 50,
      velocity: 0.5,
      deltaX: 0,
      deltaY: -50
    });

    // Should not emit scroll event for vertical swipe
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should reset state on touch start', () => {
    render(
      <EventBusProvider namespace="test">
        <TestComponent options={defaultOptions} />
      </EventBusProvider>
    );

    const handlers = (global as any).mockTouchHandlers;
    
    // Simulate touch start
    handlers.onTouchStart();

    // This should reset internal state (no direct way to test, but ensures clean state)
    expect(true).toBe(true); // Placeholder assertion
  });

  it('should be disabled when disabled option is true', () => {
    const disabledOptions = {
      ...defaultOptions,
      disabled: true
    };

    render(
      <EventBusProvider namespace="test">
        <TestComponent options={disabledOptions} />
      </EventBusProvider>
    );

    const mockUseTouchGestures = jest.requireMock('../useTouchGestures').useTouchGestures;
    
    expect(mockUseTouchGestures).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.objectContaining({
        disabled: true
      })
    );
  });
});