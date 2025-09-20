import { EventBus, createEventBus, defaultEventBus } from '../EventBus';
import { TimelineEventPayloads, EventBusError } from '../../types';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('EventBus', () => {
  let eventBus: EventBus<TimelineEventPayloads>;

  beforeEach(() => {
    eventBus = new EventBus<TimelineEventPayloads>('test');
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('Basic functionality', () => {
    it('should create an EventBus instance with correct namespace', () => {
      expect(eventBus.getNamespace()).toBe('test');
    });

    it('should emit and receive events', () => {
      const mockListener = jest.fn();
      const payload = { clipId: 'clip-1', time: 10, nativeEvent: new MouseEvent('click') };

      eventBus.on('timeline:clipClick', mockListener);
      eventBus.emit('timeline:clipClick', payload);

      expect(mockListener).toHaveBeenCalledWith(payload);
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners for the same event', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();
      const payload = { currentTime: 5, scrollLeft: 100 };

      eventBus.on('timeline:scroll', mockListener1);
      eventBus.on('timeline:scroll', mockListener2);
      eventBus.emit('timeline:scroll', payload);

      expect(mockListener1).toHaveBeenCalledWith(payload);
      expect(mockListener2).toHaveBeenCalledWith(payload);
      expect(eventBus.getListenerCount('timeline:scroll')).toBe(2);
    });

    it('should remove listeners correctly', () => {
      const mockListener = jest.fn();
      const payload = { oldScale: 1, newScale: 2 };

      eventBus.on('timeline:zoom', mockListener);
      expect(eventBus.getListenerCount('timeline:zoom')).toBe(1);

      eventBus.off('timeline:zoom', mockListener);
      expect(eventBus.getListenerCount('timeline:zoom')).toBe(0);

      eventBus.emit('timeline:zoom', payload);
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle void events correctly', () => {
      const mockListener = jest.fn();

      eventBus.on('timeline:ready', mockListener);
      eventBus.emit('timeline:ready', undefined);

      expect(mockListener).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Namespace support', () => {
    it('should create namespaced events for non-default namespace', () => {
      const namespacedBus = new EventBus<TimelineEventPayloads>('instance1');
      const mockListener = jest.fn();

      namespacedBus.on('timeline:clipClick', mockListener);
      
      // The internal event should be namespaced
      expect(namespacedBus.getRegisteredEvents()).toContain('timeline:instance1:clipClick');
    });

    it('should not namespace events for default namespace', () => {
      const defaultBus = new EventBus<TimelineEventPayloads>('default');
      const mockListener = jest.fn();

      defaultBus.on('timeline:clipClick', mockListener);
      
      // The internal event should not be namespaced
      expect(defaultBus.getRegisteredEvents()).toContain('timeline:clipClick');
    });

    it('should isolate events between different namespaces', () => {
      const bus1 = new EventBus<TimelineEventPayloads>('instance1');
      const bus2 = new EventBus<TimelineEventPayloads>('instance2');
      
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const payload = { clipId: 'clip-1', time: 10, nativeEvent: new MouseEvent('click') };

      bus1.on('timeline:clipClick', listener1);
      bus2.on('timeline:clipClick', listener2);

      bus1.emit('timeline:clipClick', payload);

      expect(listener1).toHaveBeenCalledWith(payload);
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw EventBusError for invalid listener', () => {
      expect(() => {
        eventBus.on('timeline:clipClick', 'not a function' as any);
      }).toThrow(EventBusError);
    });

    it('should handle listener errors gracefully', () => {
      const goodListener = jest.fn();
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const payload = { clipId: 'clip-1', time: 10, nativeEvent: new MouseEvent('click') };

      eventBus.on('timeline:clipClick', goodListener);
      eventBus.on('timeline:clipClick', badListener);

      // Should not throw, but should log error
      expect(() => {
        eventBus.emit('timeline:clipClick', payload);
      }).not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalledWith(payload);
      expect(badListener).toHaveBeenCalledWith(payload);
    });

    it('should handle emit errors', () => {
      // Mock the listeners Map to throw an error
      const originalGet = eventBus['listeners'].get;
      eventBus['listeners'].get = jest.fn(() => {
        throw new Error('Map error');
      });

      expect(() => {
        eventBus.emit('timeline:clipClick', { clipId: 'clip-1', time: 10, nativeEvent: new MouseEvent('click') });
      }).toThrow(EventBusError);

      // Restore original method
      eventBus['listeners'].get = originalGet;
    });
  });

  describe('Cleanup functionality', () => {
    it('should clear all listeners', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();

      eventBus.on('timeline:clipClick', mockListener1);
      eventBus.on('timeline:scroll', mockListener2);

      expect(eventBus.getRegisteredEvents().length).toBe(2);

      eventBus.clear();

      expect(eventBus.getRegisteredEvents().length).toBe(0);
      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(0);
      expect(eventBus.getListenerCount('timeline:scroll')).toBe(0);
    });

    it('should clear listeners for specific event', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();

      eventBus.on('timeline:clipClick', mockListener1);
      eventBus.on('timeline:scroll', mockListener2);

      eventBus.clearEvent('timeline:clipClick');

      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(0);
      expect(eventBus.getListenerCount('timeline:scroll')).toBe(1);
    });

    it('should clean up empty listener sets when removing listeners', () => {
      const mockListener = jest.fn();

      eventBus.on('timeline:clipClick', mockListener);
      expect(eventBus.getRegisteredEvents()).toContain('timeline:test:clipClick');

      eventBus.off('timeline:clipClick', mockListener);
      expect(eventBus.getRegisteredEvents()).not.toContain('timeline:test:clipClick');
    });
  });

  describe('Utility methods', () => {
    it('should check if event has listeners', () => {
      const mockListener = jest.fn();

      expect(eventBus.hasListeners('timeline:clipClick')).toBe(false);

      eventBus.on('timeline:clipClick', mockListener);
      expect(eventBus.hasListeners('timeline:clipClick')).toBe(true);

      eventBus.off('timeline:clipClick', mockListener);
      expect(eventBus.hasListeners('timeline:clipClick')).toBe(false);
    });

    it('should return correct listener count', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();

      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(0);

      eventBus.on('timeline:clipClick', mockListener1);
      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(1);

      eventBus.on('timeline:clipClick', mockListener2);
      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(2);

      eventBus.off('timeline:clipClick', mockListener1);
      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(1);
    });

    it('should provide debug information', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();

      eventBus.on('timeline:clipClick', mockListener1);
      eventBus.on('timeline:clipClick', mockListener2);
      eventBus.on('timeline:scroll', mockListener1);

      const debugInfo = eventBus.getDebugInfo();

      expect(debugInfo.namespace).toBe('test');
      expect(debugInfo.totalEvents).toBe(2);
      expect(debugInfo.totalListeners).toBe(3);
      expect(debugInfo.events).toHaveLength(2);
    });
  });

  describe('Debug mode', () => {
    it('should enable and disable debug mode', () => {
      const debugBus = new EventBus<TimelineEventPayloads>('debug', true);
      const mockListener = jest.fn();

      debugBus.on('timeline:clipClick', mockListener);
      debugBus.emit('timeline:clipClick', { clipId: 'clip-1', time: 10, nativeEvent: new MouseEvent('click') });

      expect(console.log).toHaveBeenCalled();

      debugBus.setDebugMode(false);
      (console.log as jest.Mock).mockClear();

      debugBus.emit('timeline:clipClick', { clipId: 'clip-1', time: 10, nativeEvent: new MouseEvent('click') });
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('Factory functions', () => {
    it('should create EventBus with createEventBus factory', () => {
      const factoryBus = createEventBus<TimelineEventPayloads>('factory-test');
      
      expect(factoryBus.getNamespace()).toBe('factory-test');
      expect(factoryBus).toBeInstanceOf(EventBus);
    });

    it('should provide default EventBus instance', () => {
      expect(defaultEventBus).toBeInstanceOf(EventBus);
      expect(defaultEventBus.getNamespace()).toBe('default');
    });
  });

  describe('Type safety', () => {
    it('should enforce correct event types', () => {
      const mockListener = jest.fn();

      // This should compile without issues
      eventBus.on('timeline:clipClick', (payload) => {
        expect(payload.clipId).toBeDefined();
        expect(payload.time).toBeDefined();
        expect(payload.nativeEvent).toBeDefined();
      });

      eventBus.emit('timeline:clipClick', {
        clipId: 'clip-1',
        time: 10,
        nativeEvent: new MouseEvent('click')
      });
    });

    it('should handle different payload types correctly', () => {
      const clipClickListener = jest.fn();
      const scrollListener = jest.fn();
      const readyListener = jest.fn();

      eventBus.on('timeline:clipClick', clipClickListener);
      eventBus.on('timeline:scroll', scrollListener);
      eventBus.on('timeline:ready', readyListener);

      eventBus.emit('timeline:clipClick', {
        clipId: 'clip-1',
        time: 10,
        nativeEvent: new MouseEvent('click')
      });

      eventBus.emit('timeline:scroll', {
        currentTime: 5,
        scrollLeft: 100
      });

      eventBus.emit('timeline:ready', undefined);

      expect(clipClickListener).toHaveBeenCalledWith({
        clipId: 'clip-1',
        time: 10,
        nativeEvent: expect.any(MouseEvent)
      });

      expect(scrollListener).toHaveBeenCalledWith({
        currentTime: 5,
        scrollLeft: 100
      });

      expect(readyListener).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Edge cases', () => {
    it('should handle removing non-existent listener', () => {
      const mockListener = jest.fn();

      // Should not throw when removing listener that was never added
      expect(() => {
        eventBus.off('timeline:clipClick', mockListener);
      }).not.toThrow();
    });

    it('should handle emitting to non-existent event', () => {
      // Should not throw when emitting to event with no listeners
      expect(() => {
        eventBus.emit('timeline:clipClick', {
          clipId: 'clip-1',
          time: 10,
          nativeEvent: new MouseEvent('click')
        });
      }).not.toThrow();
    });

    it('should handle adding same listener multiple times', () => {
      const mockListener = jest.fn();

      eventBus.on('timeline:clipClick', mockListener);
      eventBus.on('timeline:clipClick', mockListener);

      // Should only add listener once (Set behavior)
      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(1);

      eventBus.emit('timeline:clipClick', {
        clipId: 'clip-1',
        time: 10,
        nativeEvent: new MouseEvent('click')
      });

      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should handle listeners being modified during emission', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn(() => {
        // Remove listener1 during emission
        eventBus.off('timeline:clipClick', listener1);
      });
      const listener3 = jest.fn();

      eventBus.on('timeline:clipClick', listener1);
      eventBus.on('timeline:clipClick', listener2);
      eventBus.on('timeline:clipClick', listener3);

      eventBus.emit('timeline:clipClick', {
        clipId: 'clip-1',
        time: 10,
        nativeEvent: new MouseEvent('click')
      });

      // All listeners should have been called despite modification during emission
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);

      // listener1 should be removed for future emissions
      expect(eventBus.getListenerCount('timeline:clipClick')).toBe(2);
    });
  });
});