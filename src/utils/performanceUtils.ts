import React from 'react';

/**
 * Performance utilities for measuring render times and optimization
 */

export interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
  props?: Record<string, any>;
}

export interface RenderPerformanceData {
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenders: number;
  slowRenders: number; // Renders > 16ms (60fps threshold)
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private renderStartTimes: Map<string, number> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  /**
   * Start measuring render time for a component
   */
  startRender(componentName: string, props?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    const startTime = performance.now();
    this.renderStartTimes.set(componentName, startTime);
  }

  /**
   * End measuring render time for a component
   */
  endRender(componentName: string, props?: Record<string, any>): PerformanceMetrics | null {
    if (!this.isEnabled) return null;
    
    const startTime = this.renderStartTimes.get(componentName);
    if (!startTime) return null;

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    const metric: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: endTime,
      props
    };

    // Store metric
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    this.metrics.get(componentName)!.push(metric);

    // Clean up
    this.renderStartTimes.delete(componentName);

    // Log slow renders
    if (renderTime > 16) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }

    return metric;
  }

  /**
   * Get performance data for a component
   */
  getPerformanceData(componentName: string): RenderPerformanceData | null {
    const metrics = this.metrics.get(componentName);
    if (!metrics || metrics.length === 0) return null;

    const renderTimes = metrics.map(m => m.renderTime);
    const totalRenders = renderTimes.length;
    const slowRenders = renderTimes.filter(time => time > 16).length;

    return {
      averageRenderTime: renderTimes.reduce((sum, time) => sum + time, 0) / totalRenders,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      totalRenders,
      slowRenders
    };
  }

  /**
   * Get all performance data
   */
  getAllPerformanceData(): Map<string, RenderPerformanceData> {
    const result = new Map<string, RenderPerformanceData>();
    
    for (const [componentName] of this.metrics) {
      const data = this.getPerformanceData(componentName);
      if (data) {
        result.set(componentName, data);
      }
    }
    
    return result;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.renderStartTimes.clear();
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (!this.isEnabled) return;

    console.group('🚀 Timeline Performance Summary');
    
    const allData = this.getAllPerformanceData();
    
    if (allData.size === 0) {
      console.log('No performance data available');
      console.groupEnd();
      return;
    }

    // Sort by average render time (slowest first)
    const sortedData = Array.from(allData.entries())
      .sort(([, a], [, b]) => b.averageRenderTime - a.averageRenderTime);

    console.table(
      sortedData.reduce((acc, [name, data]) => {
        acc[name] = {
          'Avg Render (ms)': data.averageRenderTime.toFixed(2),
          'Max Render (ms)': data.maxRenderTime.toFixed(2),
          'Total Renders': data.totalRenders,
          'Slow Renders': data.slowRenders,
          'Slow %': ((data.slowRenders / data.totalRenders) * 100).toFixed(1) + '%'
        };
        return acc;
      }, {} as Record<string, any>)
    );

    console.groupEnd();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string, props?: Record<string, any>) {
  React.useEffect(() => {
    performanceMonitor.startRender(componentName, props);
    
    // Use requestAnimationFrame to measure after render
    const rafId = requestAnimationFrame(() => {
      performanceMonitor.endRender(componentName, props);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  });
}

/**
 * Higher-order component for measuring render performance
 */
export function withRenderPerformance<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithRenderPerformance: React.FC<P> = (props: P) => {
    useRenderPerformance(displayName, props);
    return React.createElement(WrappedComponent, props);
  };

  WithRenderPerformance.displayName = `withRenderPerformance(${displayName})`;
  
  return WithRenderPerformance;
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle utility for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memory usage monitoring utility
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private measurements: Array<{ timestamp: number; usedJSHeapSize: number; totalJSHeapSize: number }> = [];

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Take a memory measurement
   */
  measure(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      this.measurements.push({
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize
      });

      // Keep only last 100 measurements
      if (this.measurements.length > 100) {
        this.measurements = this.measurements.slice(-100);
      }
    }
  }

  /**
   * Get memory usage trend
   */
  getTrend(): 'increasing' | 'decreasing' | 'stable' | 'unknown' {
    if (this.measurements.length < 10) return 'unknown';

    const recent = this.measurements.slice(-10);
    const older = this.measurements.slice(-20, -10);

    if (older.length === 0) return 'unknown';

    const recentAvg = recent.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const threshold = olderAvg * 0.1; // 10% threshold

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Log memory usage summary
   */
  logSummary(): void {
    if (this.measurements.length === 0) {
      console.log('No memory measurements available');
      return;
    }

    const latest = this.measurements[this.measurements.length - 1];
    const trend = this.getTrend();
    
    console.group('💾 Memory Usage Summary');
    console.log(`Current Usage: ${(latest.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Heap: ${(latest.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Trend: ${trend}`);
    console.groupEnd();
  }
}

// Export memory monitor instance
export const memoryMonitor = MemoryMonitor.getInstance();

// Auto-start memory monitoring in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    memoryMonitor.measure();
  }, 5000); // Measure every 5 seconds
}