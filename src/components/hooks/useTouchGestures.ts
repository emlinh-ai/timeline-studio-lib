import { useRef, useCallback, useEffect } from 'react';
import {
  TouchPoint,
  TouchGesture,
  TouchGestureConfig,
  DEFAULT_TOUCH_CONFIG,
  getTouchPoint,
  getTouchPoints,
  detectSwipe,
  detectPinch,
  detectTap,
  detectLongPress,
  preventDefaultTouchBehavior,
  shouldHandleTouch
} from '../../utils/touchGestures';

export interface TouchGestureHandlers {
  onSwipe?: (gesture: Extract<TouchGesture, { type: 'swipe' }>) => void;
  onPinch?: (gesture: Extract<TouchGesture, { type: 'pinch' }>) => void;
  onTap?: (gesture: Extract<TouchGesture, { type: 'tap' }>) => void;
  onLongPress?: (gesture: Extract<TouchGesture, { type: 'longpress' }>) => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchMove?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
}

export interface UseTouchGesturesOptions {
  disabled?: boolean;
  config?: Partial<TouchGestureConfig>;
  allowedSelectors?: string[];
  preventDefaultBehavior?: boolean;
}

interface TouchState {
  isActive: boolean;
  startPoints: TouchPoint[];
  currentPoints: TouchPoint[];
  longPressTimer?: NodeJS.Timeout;
  gestureInProgress: boolean;
}

/**
 * Hook for handling touch gestures on timeline components
 * Supports swipe (scroll), pinch (zoom), tap (select), and long press (context menu)
 */
export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: TouchGestureHandlers,
  options: UseTouchGesturesOptions = {}
) {
  const {
    disabled = false,
    config = {},
    allowedSelectors = [],
    preventDefaultBehavior = true
  } = options;

  const touchConfig = { ...DEFAULT_TOUCH_CONFIG, ...config };
  const touchStateRef = useRef<TouchState>({
    isActive: false,
    startPoints: [],
    currentPoints: [],
    gestureInProgress: false
  });

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (touchStateRef.current.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer);
      touchStateRef.current.longPressTimer = undefined;
    }
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled || !shouldHandleTouch(event, allowedSelectors)) {
      return;
    }

    if (preventDefaultBehavior) {
      preventDefaultTouchBehavior(event);
    }

    const touchPoints = getTouchPoints(event.touches);
    touchStateRef.current = {
      isActive: true,
      startPoints: [...touchPoints],
      currentPoints: [...touchPoints],
      gestureInProgress: false
    };

    // Start long press timer for single touch
    if (touchPoints.length === 1 && handlers.onLongPress) {
      touchStateRef.current.longPressTimer = setTimeout(() => {
        const currentState = touchStateRef.current;
        if (currentState.isActive && currentState.currentPoints.length === 1) {
          const longPressGesture = detectLongPress(
            currentState.startPoints[0],
            currentState.currentPoints[0],
            touchConfig
          );
          
          if (longPressGesture) {
            currentState.gestureInProgress = true;
            handlers.onLongPress?.(longPressGesture);
          }
        }
      }, touchConfig.longPressTimeout);
    }

    handlers.onTouchStart?.(event);
  }, [disabled, allowedSelectors, preventDefaultBehavior, handlers, touchConfig]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    const currentState = touchStateRef.current;
    if (disabled || !currentState.isActive) {
      return;
    }

    if (preventDefaultBehavior) {
      preventDefaultTouchBehavior(event);
    }

    const touchPoints = getTouchPoints(event.touches);
    currentState.currentPoints = [...touchPoints];

    // Handle pinch gesture (two fingers)
    if (touchPoints.length === 2 && currentState.startPoints.length === 2 && handlers.onPinch) {
      const pinchGesture = detectPinch(
        [currentState.startPoints[0], currentState.startPoints[1]],
        [touchPoints[0], touchPoints[1]],
        touchConfig
      );

      if (pinchGesture) {
        currentState.gestureInProgress = true;
        clearLongPressTimer();
        handlers.onPinch(pinchGesture);
      }
    }
    // Handle swipe gesture (one finger)
    else if (touchPoints.length === 1 && currentState.startPoints.length === 1 && handlers.onSwipe) {
      const swipeGesture = detectSwipe(
        currentState.startPoints[0],
        touchPoints[0],
        touchConfig
      );

      if (swipeGesture) {
        currentState.gestureInProgress = true;
        clearLongPressTimer();
        handlers.onSwipe(swipeGesture);
      }
    }

    handlers.onTouchMove?.(event);
  }, [disabled, handlers, touchConfig, clearLongPressTimer, preventDefaultBehavior]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const currentState = touchStateRef.current;
    if (disabled || !currentState.isActive) {
      return;
    }

    if (preventDefaultBehavior) {
      preventDefaultTouchBehavior(event);
    }

    clearLongPressTimer();

    // Handle tap gesture if no other gesture was detected
    if (!currentState.gestureInProgress && 
        currentState.startPoints.length === 1 && 
        currentState.currentPoints.length === 1 && 
        handlers.onTap) {
      
      const tapGesture = detectTap(
        currentState.startPoints[0],
        currentState.currentPoints[0],
        touchConfig
      );

      if (tapGesture) {
        handlers.onTap(tapGesture);
      }
    }

    // Reset touch state
    touchStateRef.current = {
      isActive: false,
      startPoints: [],
      currentPoints: [],
      gestureInProgress: false
    };

    handlers.onTouchEnd?.(event);
  }, [disabled, handlers, touchConfig, clearLongPressTimer, preventDefaultBehavior]);

  // Handle touch cancel
  const handleTouchCancel = useCallback((event: TouchEvent) => {
    clearLongPressTimer();
    touchStateRef.current = {
      isActive: false,
      startPoints: [],
      currentPoints: [],
      gestureInProgress: false
    };

    handlers.onTouchEnd?.(event);
  }, [clearLongPressTimer, handlers]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) {
      return;
    }

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [elementRef, disabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    isActive: touchStateRef.current.isActive,
    gestureInProgress: touchStateRef.current.gestureInProgress
  };
}