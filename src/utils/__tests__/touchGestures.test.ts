import {
  TouchPoint,
  SwipeGesture,
  PinchGesture,
  TapGesture,
  LongPressGesture,
  DEFAULT_TOUCH_CONFIG,
  calculateDistance,
  calculateCenter,
  calculateVelocity,
  getTouchPoint,
  getTouchPoints,
  detectSwipe,
  detectPinch,
  detectTap,
  detectLongPress,
  preventDefaultTouchBehavior,
  shouldHandleTouch
} from '../touchGestures';

describe('touchGestures', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1: TouchPoint = { x: 0, y: 0, timestamp: 0 };
      const point2: TouchPoint = { x: 3, y: 4, timestamp: 100 };
      
      expect(calculateDistance(point1, point2)).toBe(5);
    });

    it('should return 0 for same points', () => {
      const point: TouchPoint = { x: 10, y: 20, timestamp: 0 };
      
      expect(calculateDistance(point, point)).toBe(0);
    });
  });

  describe('calculateCenter', () => {
    it('should calculate center point between two points', () => {
      const point1: TouchPoint = { x: 0, y: 0, timestamp: 0 };
      const point2: TouchPoint = { x: 10, y: 20, timestamp: 100 };
      
      const center = calculateCenter(point1, point2);
      expect(center).toEqual({ x: 5, y: 10 });
    });
  });

  describe('calculateVelocity', () => {
    it('should calculate velocity from distance and time', () => {
      expect(calculateVelocity(100, 200)).toBe(0.5);
    });

    it('should return 0 for zero time', () => {
      expect(calculateVelocity(100, 0)).toBe(0);
    });
  });

  describe('getTouchPoint', () => {
    it('should extract touch point from Touch object', () => {
      const mockTouch = {
        clientX: 100,
        clientY: 200
      } as Touch;

      const point = getTouchPoint(mockTouch);
      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
      expect(typeof point.timestamp).toBe('number');
    });
  });

  describe('getTouchPoints', () => {
    it('should extract multiple touch points from TouchList', () => {
      const mockTouchList = {
        length: 2,
        0: { clientX: 100, clientY: 200 } as Touch,
        1: { clientX: 300, clientY: 400 } as Touch,
        item: jest.fn(),
        [Symbol.iterator]: jest.fn()
      } as unknown as TouchList;

      const points = getTouchPoints(mockTouchList);
      expect(points).toHaveLength(2);
      expect(points[0].x).toBe(100);
      expect(points[0].y).toBe(200);
      expect(points[1].x).toBe(300);
      expect(points[1].y).toBe(400);
    });
  });

  describe('detectSwipe', () => {
    it('should detect horizontal right swipe', () => {
      const startPoint: TouchPoint = { x: 0, y: 0, timestamp: 0 };
      const endPoint: TouchPoint = { x: 50, y: 5, timestamp: 100 };

      const swipe = detectSwipe(startPoint, endPoint);
      expect(swipe).toBeTruthy();
      expect(swipe!.type).toBe('swipe');
      expect(swipe!.direction).toBe('right');
      expect(swipe!.deltaX).toBe(50);
      expect(swipe!.deltaY).toBe(5);
    });

    it('should detect horizontal left swipe', () => {
      const startPoint: TouchPoint = { x: 50, y: 0, timestamp: 0 };
      const endPoint: TouchPoint = { x: 0, y: 5, timestamp: 100 };

      const swipe = detectSwipe(startPoint, endPoint);
      expect(swipe).toBeTruthy();
      expect(swipe!.direction).toBe('left');
    });

    it('should detect vertical down swipe', () => {
      const startPoint: TouchPoint = { x: 0, y: 0, timestamp: 0 };
      const endPoint: TouchPoint = { x: 5, y: 50, timestamp: 100 };

      const swipe = detectSwipe(startPoint, endPoint);
      expect(swipe).toBeTruthy();
      expect(swipe!.direction).toBe('down');
    });

    it('should detect vertical up swipe', () => {
      const startPoint: TouchPoint = { x: 0, y: 50, timestamp: 0 };
      const endPoint: TouchPoint = { x: 5, y: 0, timestamp: 100 };

      const swipe = detectSwipe(startPoint, endPoint);
      expect(swipe).toBeTruthy();
      expect(swipe!.direction).toBe('up');
    });

    it('should return null for insufficient distance', () => {
      const startPoint: TouchPoint = { x: 0, y: 0, timestamp: 0 };
      const endPoint: TouchPoint = { x: 5, y: 0, timestamp: 100 };

      const swipe = detectSwipe(startPoint, endPoint);
      expect(swipe).toBeNull();
    });

    it('should return null for insufficient velocity', () => {
      const startPoint: TouchPoint = { x: 0, y: 0, timestamp: 0 };
      const endPoint: TouchPoint = { x: 50, y: 0, timestamp: 10000 }; // Very slow

      const swipe = detectSwipe(startPoint, endPoint);
      expect(swipe).toBeNull();
    });
  });

  describe('detectPinch', () => {
    it('should detect pinch zoom in', () => {
      const startPoints: [TouchPoint, TouchPoint] = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 100, y: 0, timestamp: 0 }
      ];
      const endPoints: [TouchPoint, TouchPoint] = [
        { x: -10, y: 0, timestamp: 100 },
        { x: 110, y: 0, timestamp: 100 }
      ];

      const pinch = detectPinch(startPoints, endPoints);
      expect(pinch).toBeTruthy();
      expect(pinch!.type).toBe('pinch');
      expect(pinch!.scale).toBeGreaterThan(1);
      expect(pinch!.centerX).toBe(50);
      expect(pinch!.centerY).toBe(0);
    });

    it('should detect pinch zoom out', () => {
      const startPoints: [TouchPoint, TouchPoint] = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 100, y: 0, timestamp: 0 }
      ];
      const endPoints: [TouchPoint, TouchPoint] = [
        { x: 10, y: 0, timestamp: 100 },
        { x: 90, y: 0, timestamp: 100 }
      ];

      const pinch = detectPinch(startPoints, endPoints);
      expect(pinch).toBeTruthy();
      expect(pinch!.scale).toBeLessThan(1);
    });

    it('should return null for insufficient scale change', () => {
      const startPoints: [TouchPoint, TouchPoint] = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 100, y: 0, timestamp: 0 }
      ];
      const endPoints: [TouchPoint, TouchPoint] = [
        { x: 1, y: 0, timestamp: 100 },
        { x: 99, y: 0, timestamp: 100 }
      ];

      const pinch = detectPinch(startPoints, endPoints);
      expect(pinch).toBeNull();
    });

    it('should return null for zero start distance', () => {
      const startPoints: [TouchPoint, TouchPoint] = [
        { x: 50, y: 50, timestamp: 0 },
        { x: 50, y: 50, timestamp: 0 }
      ];
      const endPoints: [TouchPoint, TouchPoint] = [
        { x: 0, y: 0, timestamp: 100 },
        { x: 100, y: 100, timestamp: 100 }
      ];

      const pinch = detectPinch(startPoints, endPoints);
      expect(pinch).toBeNull();
    });
  });

  describe('detectTap', () => {
    it('should detect valid tap', () => {
      const startPoint: TouchPoint = { x: 100, y: 200, timestamp: 0 };
      const endPoint: TouchPoint = { x: 105, y: 205, timestamp: 150 };

      const tap = detectTap(startPoint, endPoint);
      expect(tap).toBeTruthy();
      expect(tap!.type).toBe('tap');
      expect(tap!.x).toBe(105);
      expect(tap!.y).toBe(205);
    });

    it('should return null for too much movement', () => {
      const startPoint: TouchPoint = { x: 100, y: 200, timestamp: 0 };
      const endPoint: TouchPoint = { x: 150, y: 250, timestamp: 150 };

      const tap = detectTap(startPoint, endPoint);
      expect(tap).toBeNull();
    });

    it('should return null for too long duration', () => {
      const startPoint: TouchPoint = { x: 100, y: 200, timestamp: 0 };
      const endPoint: TouchPoint = { x: 105, y: 205, timestamp: 500 };

      const tap = detectTap(startPoint, endPoint);
      expect(tap).toBeNull();
    });
  });

  describe('detectLongPress', () => {
    it('should detect valid long press', () => {
      const startPoint: TouchPoint = { x: 100, y: 200, timestamp: 0 };
      const currentPoint: TouchPoint = { x: 105, y: 205, timestamp: 600 };

      const longPress = detectLongPress(startPoint, currentPoint);
      expect(longPress).toBeTruthy();
      expect(longPress!.type).toBe('longpress');
      expect(longPress!.x).toBe(105);
      expect(longPress!.y).toBe(205);
    });

    it('should return null for insufficient time', () => {
      const startPoint: TouchPoint = { x: 100, y: 200, timestamp: 0 };
      const currentPoint: TouchPoint = { x: 105, y: 205, timestamp: 300 };

      const longPress = detectLongPress(startPoint, currentPoint);
      expect(longPress).toBeNull();
    });

    it('should return null for too much movement', () => {
      const startPoint: TouchPoint = { x: 100, y: 200, timestamp: 0 };
      const currentPoint: TouchPoint = { x: 150, y: 250, timestamp: 600 };

      const longPress = detectLongPress(startPoint, currentPoint);
      expect(longPress).toBeNull();
    });
  });

  describe('preventDefaultTouchBehavior', () => {
    it('should call preventDefault and stopPropagation', () => {
      const mockEvent = {
        type: 'touchstart',
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      } as unknown as TouchEvent;

      preventDefaultTouchBehavior(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should not call stopPropagation for touchend', () => {
      const mockEvent = {
        type: 'touchend',
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      } as unknown as TouchEvent;

      preventDefaultTouchBehavior(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });
  });

  describe('shouldHandleTouch', () => {
    it('should return true when no selectors provided', () => {
      const mockEvent = {
        target: document.createElement('div')
      } as unknown as TouchEvent;

      expect(shouldHandleTouch(mockEvent)).toBe(true);
    });

    it('should return true when target matches selector', () => {
      const div = document.createElement('div');
      div.className = 'timeline-root';
      
      const mockEvent = {
        target: div
      } as unknown as TouchEvent;

      expect(shouldHandleTouch(mockEvent, ['.timeline-root'])).toBe(true);
    });

    it('should return true when target has matching parent', () => {
      const parent = document.createElement('div');
      parent.className = 'timeline-root';
      const child = document.createElement('div');
      parent.appendChild(child);
      
      const mockEvent = {
        target: child
      } as unknown as TouchEvent;

      expect(shouldHandleTouch(mockEvent, ['.timeline-root'])).toBe(true);
    });

    it('should return false when target does not match', () => {
      const div = document.createElement('div');
      div.className = 'other-element';
      
      const mockEvent = {
        target: div
      } as unknown as TouchEvent;

      expect(shouldHandleTouch(mockEvent, ['.timeline-root'])).toBe(false);
    });

    it('should handle invalid selectors gracefully', () => {
      const div = document.createElement('div');
      
      const mockEvent = {
        target: div
      } as unknown as TouchEvent;

      expect(shouldHandleTouch(mockEvent, ['[invalid-selector'])).toBe(false);
    });
  });
});