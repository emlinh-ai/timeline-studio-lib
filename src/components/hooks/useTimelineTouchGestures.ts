import { useCallback, useRef } from 'react';
import { useTouchGestures, TouchGestureHandlers } from './useTouchGestures';
import { useEventBus } from '../../eventBus/EventBusProvider';

export interface TimelineTouchGestureOptions {
  disabled?: boolean;
  pixelsPerSecond: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onClipSelect?: (clipId: string, x: number, y: number) => void;
  onContextMenu?: (x: number, y: number) => void;
}

/**
 * Timeline-specific touch gesture handler
 * Converts touch gestures into timeline actions (scroll, zoom, select, context menu)
 */
export function useTimelineTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TimelineTouchGestureOptions
) {
  const {
    disabled = false,
    pixelsPerSecond,
    zoom,
    minZoom,
    maxZoom,
    onClipSelect,
    onContextMenu
  } = options;

  const eventBus = useEventBus();
  const lastPinchScaleRef = useRef<number>(1);
  const accumulatedScrollRef = useRef<number>(0);

  // Convert pixel distance to time
  const pixelsToTime = useCallback((pixels: number): number => {
    return pixels / (pixelsPerSecond * zoom);
  }, [pixelsPerSecond, zoom]);

  // Handle swipe gestures for scrolling
  const handleSwipe = useCallback((gesture: Extract<import('../../utils/touchGestures').TouchGesture, { type: 'swipe' }>) => {
    // Only handle horizontal swipes for timeline scrolling
    if (gesture.direction === 'left' || gesture.direction === 'right') {
      // Convert swipe distance to time change
      const timeChange = pixelsToTime(Math.abs(gesture.deltaX));
      
      // Accumulate small scroll movements for smoother scrolling
      accumulatedScrollRef.current += gesture.deltaX;
      
      // Only emit scroll events for significant movements
      if (Math.abs(accumulatedScrollRef.current) > 5) {
        const scrollTimeChange = pixelsToTime(accumulatedScrollRef.current);
        
        // Emit touch scroll event (negative because left swipe should scroll right in timeline)
        eventBus.emit('timeline:touchScroll', {
          currentTime: 0, // Will be calculated by ScrollableContainer
          scrollLeft: -accumulatedScrollRef.current
        });
        
        accumulatedScrollRef.current = 0;
      }
    }
  }, [pixelsToTime, eventBus]);

  // Handle pinch gestures for zooming
  const handlePinch = useCallback((gesture: Extract<import('../../utils/touchGestures').TouchGesture, { type: 'pinch' }>) => {
    // Calculate zoom change based on pinch scale
    const scaleChange = gesture.scale / lastPinchScaleRef.current;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * scaleChange));
    
    // Convert gesture center to time for zoom centering
    const element = elementRef.current;
    if (element) {
      const rect = element.getBoundingClientRect();
      const relativeX = gesture.centerX - rect.left;
      const centerTime = pixelsToTime(relativeX);
      
      eventBus.emit('timeline:zoom', {
        oldScale: zoom,
        newScale: newZoom,
        centerTime
      });
    }
    
    lastPinchScaleRef.current = gesture.scale;
  }, [zoom, minZoom, maxZoom, pixelsToTime, eventBus, elementRef]);

  // Handle tap gestures for clip selection
  const handleTap = useCallback((gesture: Extract<import('../../utils/touchGestures').TouchGesture, { type: 'tap' }>) => {
    const element = elementRef.current;
    if (!element) return;

    // Find the clip element at the tap position
    const elementAtPoint = document.elementFromPoint(gesture.x, gesture.y);
    const clipElement = elementAtPoint?.closest('[data-clip-id]') as HTMLElement;
    
    if (clipElement && clipElement.dataset.clipId) {
      // Clip was tapped - select it
      onClipSelect?.(clipElement.dataset.clipId, gesture.x, gesture.y);
      
      // Emit clip click event
      eventBus.emit('timeline:clipClick', {
        clipId: clipElement.dataset.clipId,
        time: pixelsToTime(gesture.x - element.getBoundingClientRect().left),
        nativeEvent: new MouseEvent('click', {
          clientX: gesture.x,
          clientY: gesture.y
        })
      });
    } else {
      // Empty area was tapped - clear selection
      onClipSelect?.('', gesture.x, gesture.y);
    }
  }, [elementRef, onClipSelect, eventBus, pixelsToTime]);

  // Handle long press gestures for context menu
  const handleLongPress = useCallback((gesture: Extract<import('../../utils/touchGestures').TouchGesture, { type: 'longpress' }>) => {
    // Show context menu at long press position
    onContextMenu?.(gesture.x, gesture.y);
    
    // Also check if a clip was long-pressed
    const elementAtPoint = document.elementFromPoint(gesture.x, gesture.y);
    const clipElement = elementAtPoint?.closest('[data-clip-id]') as HTMLElement;
    
    if (clipElement && clipElement.dataset.clipId) {
      // Select the clip that was long-pressed
      onClipSelect?.(clipElement.dataset.clipId, gesture.x, gesture.y);
    }
  }, [onContextMenu, onClipSelect]);

  // Reset pinch scale on touch start
  const handleTouchStart = useCallback(() => {
    lastPinchScaleRef.current = 1;
    accumulatedScrollRef.current = 0;
  }, []);

  // Create gesture handlers
  const gestureHandlers: TouchGestureHandlers = {
    onSwipe: handleSwipe,
    onPinch: handlePinch,
    onTap: handleTap,
    onLongPress: handleLongPress,
    onTouchStart: handleTouchStart
  };

  // Use the touch gestures hook
  const touchState = useTouchGestures(elementRef, gestureHandlers, {
    disabled,
    config: {
      // Timeline-specific gesture configuration
      swipeThreshold: 5, // Lower threshold for responsive scrolling
      swipeVelocityThreshold: 0.1, // Lower velocity threshold
      pinchThreshold: 0.05, // Lower threshold for responsive zooming
      tapThreshold: 15, // Slightly higher for touch accuracy
      tapTimeout: 300,
      longPressTimeout: 500,
      longPressThreshold: 15
    },
    allowedSelectors: [
      '.timeline-root',
      '.timeline-body',
      '.track-container',
      '.track',
      '.clip',
      '.scrollable-container'
    ],
    preventDefaultBehavior: true
  });

  return touchState;
}