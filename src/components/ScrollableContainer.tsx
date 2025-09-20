import React, { useRef, useCallback, useEffect, useState, memo } from 'react';
import { useEventBus } from '../eventBus/EventBusProvider';

interface ScrollableContainerProps {
  children: React.ReactNode;
  contentWidth: number;
  pixelsPerSecond: number;
  zoom: number;
  currentTime: number;
  onScrollChange?: (scrollLeft: number, currentTime: number) => void;
}

/**
 * ScrollableContainer handles horizontal scrolling for the timeline
 * Emits scroll events and supports smooth scrolling
 * Includes debouncing for performance optimization
 */
const ScrollableContainerComponent = memo(function ScrollableContainer({
  children,
  contentWidth,
  pixelsPerSecond,
  zoom,
  currentTime,
  onScrollChange
}: ScrollableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eventBus = useEventBus();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const animationFrameRef = useRef<number>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastEmitTimeRef = useRef<number>(0);

  // Calculate current time from scroll position
  const calculateTimeFromScroll = useCallback((scrollLeft: number): number => {
    return scrollLeft / (pixelsPerSecond * zoom);
  }, [pixelsPerSecond, zoom]);

  // Calculate scroll position from time
  const calculateScrollFromTime = useCallback((time: number): number => {
    return time * pixelsPerSecond * zoom;
  }, [pixelsPerSecond, zoom]);

  // Debounced scroll event emission
  const emitScrollEvent = useCallback((scrollLeft: number, calculatedTime: number) => {
    const now = performance.now();
    const timeSinceLastEmit = now - lastEmitTimeRef.current;
    
    // Throttle to max 60fps (16.67ms)
    if (timeSinceLastEmit >= 16) {
      lastEmitTimeRef.current = now;
      
      // Emit scroll event
      eventBus.emit('timeline:scroll', {
        currentTime: calculatedTime,
        scrollLeft
      });

      // Call callback if provided
      onScrollChange?.(scrollLeft, calculatedTime);
    } else {
      // Debounce for final event
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        lastEmitTimeRef.current = performance.now();
        eventBus.emit('timeline:scroll', {
          currentTime: calculatedTime,
          scrollLeft
        });
        onScrollChange?.(scrollLeft, calculatedTime);
      }, 16 - timeSinceLastEmit);
    }
  }, [eventBus, onScrollChange]);

  // Handle scroll events with debouncing and requestAnimationFrame
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = event.currentTarget.scrollLeft;
    const calculatedTime = calculateTimeFromScroll(scrollLeft);

    // Set scrolling state
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Use requestAnimationFrame for smooth event emission
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      emitScrollEvent(scrollLeft, calculatedTime);
    });

    // Reset scrolling state after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [calculateTimeFromScroll, emitScrollEvent]);

  // Handle programmatic scroll from touch gestures
  const handleTouchScroll = useCallback((scrollDelta: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const newScrollLeft = Math.max(0, container.scrollLeft - scrollDelta);
    
    // Update scroll position
    container.scrollLeft = newScrollLeft;
    
    // Calculate and emit new time
    const calculatedTime = calculateTimeFromScroll(newScrollLeft);
    emitScrollEvent(newScrollLeft, calculatedTime);
  }, [calculateTimeFromScroll, emitScrollEvent]);

  // Smooth scroll to specific time position
  const smoothScrollToTime = useCallback((targetTime: number, duration: number = 300) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const targetScrollLeft = calculateScrollFromTime(targetTime);
    const startScrollLeft = container.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    
    // If distance is very small, just set position directly
    if (Math.abs(distance) < 1) {
      container.scrollLeft = targetScrollLeft;
      const finalTime = calculateTimeFromScroll(targetScrollLeft);
      eventBus.emit('timeline:scroll', {
        currentTime: finalTime,
        scrollLeft: targetScrollLeft
      });
      onScrollChange?.(targetScrollLeft, finalTime);
      return;
    }

    const startTime = performance.now();

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentScrollLeft = startScrollLeft + (distance * easeOut);
      container.scrollLeft = Math.max(0, currentScrollLeft);

      // Emit scroll events during animation for smooth feedback
      const currentCalculatedTime = calculateTimeFromScroll(container.scrollLeft);
      eventBus.emit('timeline:scroll', {
        currentTime: currentCalculatedTime,
        scrollLeft: container.scrollLeft
      });
      onScrollChange?.(container.scrollLeft, currentCalculatedTime);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateScroll);
      } else {
        // Ensure final position is exact
        container.scrollLeft = Math.max(0, targetScrollLeft);
        const finalTime = calculateTimeFromScroll(targetScrollLeft);
        eventBus.emit('timeline:scroll', {
          currentTime: finalTime,
          scrollLeft: targetScrollLeft
        });
        onScrollChange?.(targetScrollLeft, finalTime);
      }
    };

    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, [calculateScrollFromTime, calculateTimeFromScroll, eventBus, onScrollChange]);

  // Handle external scroll commands
  useEffect(() => {
    const handleScrollToEvent = (payload: { time: number }) => {
      // Validate payload
      if (typeof payload?.time !== 'number' || isNaN(payload.time)) {
        console.error('[ScrollableContainer] Invalid time value for scrollTo:', payload);
        return;
      }
      
      // Clamp time to valid range
      const clampedTime = Math.max(0, payload.time);
      smoothScrollToTime(clampedTime);
    };

    const handleTouchScrollEvent = (payload: { currentTime: number; scrollLeft: number }) => {
      // Handle touch-based scroll events
      if (typeof payload?.scrollLeft === 'number') {
        handleTouchScroll(payload.scrollLeft);
      }
    };

    const handleZoomEvent = (payload: { oldScale: number; newScale: number; centerTime?: number }) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      
      // Use current time as center if not provided
      const centerTime = payload.centerTime ?? currentTime;
      
      // Calculate the position of the center time before and after zoom
      const oldCenterPosition = centerTime * pixelsPerSecond * payload.oldScale;
      const newCenterPosition = centerTime * pixelsPerSecond * payload.newScale;
      
      // Calculate the current scroll position relative to the center time
      const currentScrollLeft = container.scrollLeft;
      const viewportCenter = containerWidth / 2;
      
      // Calculate where the center time should be positioned after zoom
      const targetScrollLeft = newCenterPosition - viewportCenter;
      
      // If the zoom change is significant, use smooth scrolling
      const zoomRatio = payload.newScale / payload.oldScale;
      if (Math.abs(zoomRatio - 1) > 0.1) {
        // Smooth scroll to maintain the center time in view
        smoothScrollToTime(centerTime, 150);
      } else {
        // For small zoom changes, update scroll position immediately
        container.scrollLeft = Math.max(0, targetScrollLeft);
      }
    };

    eventBus.on('timeline:scrollTo', handleScrollToEvent);
    eventBus.on('timeline:zoom', handleZoomEvent);
    eventBus.on('timeline:touchScroll', handleTouchScrollEvent);

    return () => {
      eventBus.off('timeline:scrollTo', handleScrollToEvent);
      eventBus.off('timeline:zoom', handleZoomEvent);
      eventBus.off('timeline:touchScroll', handleTouchScrollEvent);
    };
  }, [eventBus, smoothScrollToTime, pixelsPerSecond, currentTime]);

  // Sync scroll position with current time when not actively scrolling
  useEffect(() => {
    if (!isScrolling && containerRef.current) {
      const expectedScrollLeft = calculateScrollFromTime(currentTime);
      const currentScrollLeft = containerRef.current.scrollLeft;
      
      // Only update if there's a significant difference (avoid infinite loops)
      if (Math.abs(expectedScrollLeft - currentScrollLeft) > 1) {
        containerRef.current.scrollLeft = expectedScrollLeft;
      }
    }
  }, [currentTime, calculateScrollFromTime, isScrolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="scrollable-container"
      onScroll={handleScroll}
      style={{
        width: '100%',
        height: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        position: 'relative',
        scrollBehavior: 'auto' // We handle smooth scrolling manually
      }}
    >
      <div
        className="scrollable-content"
        style={{
          width: `${contentWidth}px`,
          height: '100%',
          minWidth: '100%'
        }}
      >
        {children}
      </div>
    </div>
  );
});

export const ScrollableContainer = memo(ScrollableContainerComponent);
export default ScrollableContainer;