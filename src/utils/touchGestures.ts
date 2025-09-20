/**
 * Touch gesture utilities for timeline interactions
 * Handles swipe (scroll), pinch (zoom), tap (select), and long press gestures
 */

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  type: 'swipe';
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  deltaX: number;
  deltaY: number;
}

export interface PinchGesture {
  type: 'pinch';
  scale: number;
  centerX: number;
  centerY: number;
  distance: number;
}

export interface TapGesture {
  type: 'tap';
  x: number;
  y: number;
  timestamp: number;
}

export interface LongPressGesture {
  type: 'longpress';
  x: number;
  y: number;
  timestamp: number;
}

export type TouchGesture = SwipeGesture | PinchGesture | TapGesture | LongPressGesture;

export interface TouchGestureConfig {
  // Swipe configuration
  swipeThreshold: number; // minimum distance for swipe
  swipeVelocityThreshold: number; // minimum velocity for swipe
  
  // Pinch configuration
  pinchThreshold: number; // minimum scale change for pinch
  
  // Tap configuration
  tapThreshold: number; // maximum movement for tap
  tapTimeout: number; // maximum time for tap
  
  // Long press configuration
  longPressTimeout: number; // minimum time for long press
  longPressThreshold: number; // maximum movement for long press
}

export const DEFAULT_TOUCH_CONFIG: TouchGestureConfig = {
  swipeThreshold: 10,
  swipeVelocityThreshold: 0.3,
  pinchThreshold: 0.1,
  tapThreshold: 10,
  tapTimeout: 300,
  longPressTimeout: 500,
  longPressThreshold: 10
};

/**
 * Calculate distance between two touch points
 */
export function calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point between two touch points
 */
export function calculateCenter(point1: TouchPoint, point2: TouchPoint): { x: number; y: number } {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2
  };
}

/**
 * Calculate velocity from distance and time
 */
export function calculateVelocity(distance: number, time: number): number {
  return time > 0 ? distance / time : 0;
}

/**
 * Get touch point from touch event
 */
export function getTouchPoint(touch: Touch): TouchPoint {
  return {
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  };
}

/**
 * Get multiple touch points from touch event
 */
export function getTouchPoints(touches: TouchList): TouchPoint[] {
  const points: TouchPoint[] = [];
  for (let i = 0; i < touches.length; i++) {
    points.push(getTouchPoint(touches[i]));
  }
  return points;
}

/**
 * Detect swipe gesture from touch points
 */
export function detectSwipe(
  startPoint: TouchPoint,
  endPoint: TouchPoint,
  config: TouchGestureConfig = DEFAULT_TOUCH_CONFIG
): SwipeGesture | null {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const distance = calculateDistance(startPoint, endPoint);
  const time = endPoint.timestamp - startPoint.timestamp;
  const velocity = calculateVelocity(distance, time);

  // Check if movement meets threshold requirements
  if (distance < config.swipeThreshold || velocity < config.swipeVelocityThreshold) {
    return null;
  }

  // Determine primary direction
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  
  let direction: SwipeGesture['direction'];
  if (absX > absY) {
    direction = deltaX > 0 ? 'right' : 'left';
  } else {
    direction = deltaY > 0 ? 'down' : 'up';
  }

  return {
    type: 'swipe',
    direction,
    distance,
    velocity,
    deltaX,
    deltaY
  };
}

/**
 * Detect pinch gesture from two touch points
 */
export function detectPinch(
  startPoints: [TouchPoint, TouchPoint],
  endPoints: [TouchPoint, TouchPoint],
  config: TouchGestureConfig = DEFAULT_TOUCH_CONFIG
): PinchGesture | null {
  const startDistance = calculateDistance(startPoints[0], startPoints[1]);
  const endDistance = calculateDistance(endPoints[0], endPoints[1]);
  
  if (startDistance === 0) return null;
  
  const scale = endDistance / startDistance;
  const scaleChange = Math.abs(scale - 1);
  
  // Check if scale change meets threshold
  if (scaleChange < config.pinchThreshold) {
    return null;
  }

  const center = calculateCenter(endPoints[0], endPoints[1]);

  return {
    type: 'pinch',
    scale,
    centerX: center.x,
    centerY: center.y,
    distance: endDistance
  };
}

/**
 * Detect tap gesture
 */
export function detectTap(
  startPoint: TouchPoint,
  endPoint: TouchPoint,
  config: TouchGestureConfig = DEFAULT_TOUCH_CONFIG
): TapGesture | null {
  const distance = calculateDistance(startPoint, endPoint);
  const time = endPoint.timestamp - startPoint.timestamp;

  // Check if movement and time are within tap thresholds
  if (distance > config.tapThreshold || time > config.tapTimeout) {
    return null;
  }

  return {
    type: 'tap',
    x: endPoint.x,
    y: endPoint.y,
    timestamp: endPoint.timestamp
  };
}

/**
 * Detect long press gesture
 */
export function detectLongPress(
  startPoint: TouchPoint,
  currentPoint: TouchPoint,
  config: TouchGestureConfig = DEFAULT_TOUCH_CONFIG
): LongPressGesture | null {
  const distance = calculateDistance(startPoint, currentPoint);
  const time = currentPoint.timestamp - startPoint.timestamp;

  // Check if time meets long press threshold and movement is minimal
  if (time < config.longPressTimeout || distance > config.longPressThreshold) {
    return null;
  }

  return {
    type: 'longpress',
    x: currentPoint.x,
    y: currentPoint.y,
    timestamp: currentPoint.timestamp
  };
}

/**
 * Prevent default touch behaviors that interfere with gestures
 */
export function preventDefaultTouchBehavior(event: TouchEvent): void {
  // Prevent scrolling, zooming, and other default touch behaviors
  event.preventDefault();
  
  // Also prevent context menu on long press
  if (event.type === 'touchstart' || event.type === 'touchmove') {
    event.stopPropagation();
  }
}

/**
 * Check if touch event should be handled based on target element
 */
export function shouldHandleTouch(event: TouchEvent, allowedSelectors: string[] = []): boolean {
  const target = event.target as Element;
  
  // Always handle if no specific selectors provided
  if (allowedSelectors.length === 0) {
    return true;
  }
  
  // Check if target matches any allowed selector
  return allowedSelectors.some(selector => {
    try {
      return target.matches(selector) || target.closest(selector) !== null;
    } catch {
      return false;
    }
  });
}