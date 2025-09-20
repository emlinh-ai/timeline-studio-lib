import { 
  debounce, 
  throttle, 
  measurePerformance, 
  createPerformanceMonitor,
  PerformanceMetrics 
} from '../performanceUtils';

describe('performanceUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should cancel previous calls when called multiple times', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('should handle immediate option', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100, true);

      debouncedFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');

      debouncedFn('test2');
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should return a function that can be cancelled', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('test');
      debouncedFn.cancel();

      jest.advanceTimersByTime(100);
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('throttle', () => {
    it('should limit function execution frequency', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('first');
      expect(mockFn).toHaveBeenCalledWith('first');

      throttledFn('second');
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttledFn('third');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('third');
    });

    it('should handle leading and trailing options', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100, { leading: false, trailing: true });

      throttledFn('test');
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should return a function that can be cancelled', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('test');
      throttledFn.cancel();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1); // First call goes through immediately
    });
  });

  describe('measurePerformance', () => {
    it('should measure sync function performance', () => {
      const syncFn = () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const result = measurePerformance(syncFn, 'test-operation');
      
      expect(result.result).toBe(499500);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.operationName).toBe('test-operation');
    });

    it('should measure async function performance', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      };

      const result = await measurePerformance(asyncFn, 'async-operation');
      
      expect(result.result).toBe('async-result');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.operationName).toBe('async-operation');
    });

    it('should handle function errors', () => {
      const errorFn = () => {
        throw new Error('Test error');
      };

      expect(() => measurePerformance(errorFn, 'error-operation')).toThrow('Test error');
    });
  });

  describe('createPerformanceMonitor', () => {
    it('should create a performance monitor with default config', () => {
      const monitor = createPerformanceMonitor();
      
      expect(monitor).toHaveProperty('startMeasurement');
      expect(monitor).toHaveProperty('endMeasurement');
      expect(monitor).toHaveProperty('getMetrics');
      expect(monitor).toHaveProperty('reset');
    });

    it('should track performance measurements', () => {
      const monitor = createPerformanceMonitor();
      
      monitor.startMeasurement('test-op');
      // Simulate some work
      jest.advanceTimersByTime(10);
      monitor.endMeasurement('test-op');

      const metrics = monitor.getMetrics();
      expect(metrics.measurements).toHaveLength(1);
      expect(metrics.measurements[0].name).toBe('test-op');
      expect(metrics.measurements[0].duration).toBeGreaterThan(0);
    });

    it('should calculate average performance', () => {
      const monitor = createPerformanceMonitor();
      
      // Add multiple measurements
      monitor.startMeasurement('test-op');
      jest.advanceTimersByTime(10);
      monitor.endMeasurement('test-op');

      monitor.startMeasurement('test-op');
      jest.advanceTimersByTime(20);
      monitor.endMeasurement('test-op');

      const metrics = monitor.getMetrics();
      expect(metrics.averageDuration).toBe(15);
      expect(metrics.totalMeasurements).toBe(2);
    });

    it('should respect max measurements limit', () => {
      const monitor = createPerformanceMonitor({ maxMeasurements: 2 });
      
      monitor.startMeasurement('test-1');
      monitor.endMeasurement('test-1');
      
      monitor.startMeasurement('test-2');
      monitor.endMeasurement('test-2');
      
      monitor.startMeasurement('test-3');
      monitor.endMeasurement('test-3');

      const metrics = monitor.getMetrics();
      expect(metrics.measurements).toHaveLength(2);
      expect(metrics.measurements[0].name).toBe('test-2');
      expect(metrics.measurements[1].name).toBe('test-3');
    });

    it('should reset metrics', () => {
      const monitor = createPerformanceMonitor();
      
      monitor.startMeasurement('test-op');
      monitor.endMeasurement('test-op');
      
      let metrics = monitor.getMetrics();
      expect(metrics.measurements).toHaveLength(1);
      
      monitor.reset();
      metrics = monitor.getMetrics();
      expect(metrics.measurements).toHaveLength(0);
      expect(metrics.totalMeasurements).toBe(0);
    });

    it('should handle unmatched end measurements', () => {
      const monitor = createPerformanceMonitor();
      
      // End measurement without starting it
      monitor.endMeasurement('non-existent');
      
      const metrics = monitor.getMetrics();
      expect(metrics.measurements).toHaveLength(0);
    });

    it('should handle multiple start calls for same operation', () => {
      const monitor = createPerformanceMonitor();
      
      monitor.startMeasurement('test-op');
      monitor.startMeasurement('test-op'); // Should overwrite previous start
      jest.advanceTimersByTime(10);
      monitor.endMeasurement('test-op');

      const metrics = monitor.getMetrics();
      expect(metrics.measurements).toHaveLength(1);
    });
  });

  describe('PerformanceMetrics interface', () => {
    it('should have correct structure', () => {
      const monitor = createPerformanceMonitor();
      const metrics: PerformanceMetrics = monitor.getMetrics();
      
      expect(metrics).toHaveProperty('measurements');
      expect(metrics).toHaveProperty('totalMeasurements');
      expect(metrics).toHaveProperty('averageDuration');
      expect(metrics).toHaveProperty('minDuration');
      expect(metrics).toHaveProperty('maxDuration');
      
      expect(Array.isArray(metrics.measurements)).toBe(true);
      expect(typeof metrics.totalMeasurements).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(typeof metrics.minDuration).toBe('number');
      expect(typeof metrics.maxDuration).toBe('number');
    });
  });
});