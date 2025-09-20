import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VirtualizedTrackContainer } from '../VirtualizedTrackContainer';
import { VirtualizationWrapper } from '../VirtualizationWrapper';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { TimelineTheme } from '../../types';
import {
  generateMockTracks,
  generateRealisticTimeline,
  performanceTestScenarios,
  PerformanceMeasurer,
  measureMemoryUsage
} from '../../utils/testDataGenerator';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => [{ duration: 10 }]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};
Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock requestAnimationFrame for consistent timing
let rafCallbacks: FrameRequestCallback[] = [];
window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
});

const flushRAF = () => {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach(cb => cb(performance.now()));
};

const defaultTheme: TimelineTheme = {
  primaryColor: '#007acc',
  backgroundColor: '#1e1e1e',
  trackBackgroundColor: '#2d2d2d',
  clipBorderRadius: '4px',
  clipColors: {
    video: '#4CAF50',
    audio: '#FF9800',
    text: '#2196F3',
    overlay: '#9C27B0'
  },
  fonts: {
    primary: 'Arial, sans-serif',
    monospace: 'monospace'
  }
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <EventBusProvider namespace="perf-test">
    {children}
  </EventBusProvider>
);

describe('Virtualization Performance Tests', () => {
  let measurer: PerformanceMeasurer;

  beforeEach(() => {
    measurer = new PerformanceMeasurer();
    jest.clearAllMocks();
    rafCallbacks = [];
    
    // Mock console methods to reduce noise
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('VirtualizationWrapper Performance', () => {
    it('renders 1000 items efficiently', () => {
      const renderItem = (index: number, style: React.CSSProperties) => (
        <div style={style} data-testid={`item-${index}`}>
          <div>Item {index}</div>
          <div>Content {index}</div>
        </div>
      );

      measurer.startMeasurement('render-1000-items');
      
      render(
        <VirtualizationWrapper
          itemCount={1000}
          itemHeight={60}
          height={400}
          renderItem={renderItem}
          overscan={5}
        />
      );

      const renderTime = measurer.endMeasurement('render-1000-items');

      // Should render quickly
      expect(renderTime).toBeLessThan(100); // Less than 100ms

      // Should only render visible items
      const renderedItems = screen.getAllByTestId(/item-\d+/);
      expect(renderedItems.length).toBeLessThan(20); // Much less than 1000
    });

    it('handles 10000 items without performance degradation', () => {
      const renderItem = (index: number, style: React.CSSProperties) => (
        <div style={style} data-testid={`item-${index}`}>Item {index}</div>
      );

      measurer.startMeasurement('render-10000-items');
      
      render(
        <VirtualizationWrapper
          itemCount={10000}
          itemHeight={60}
          height={400}
          renderItem={renderItem}
          overscan={3}
        />
      );

      const renderTime = measurer.endMeasurement('render-10000-items');

      // Should still render quickly even with 10x more items
      expect(renderTime).toBeLessThan(200); // Less than 200ms

      const renderedItems = screen.getAllByTestId(/item-\d+/);
      expect(renderedItems.length).toBeLessThan(15); // Still only visible items
    });

    it('maintains smooth scrolling performance', async () => {
      const renderItem = (index: number, style: React.CSSProperties) => (
        <div style={style} data-testid={`item-${index}`}>Item {index}</div>
      );

      const { container } = render(
        <VirtualizationWrapper
          itemCount={5000}
          itemHeight={60}
          height={400}
          renderItem={renderItem}
          overscan={5}
        />
      );

      const scrollContainer = container.firstChild as HTMLElement;

      // Measure scroll performance
      measurer.startMeasurement('scroll-performance');

      // Simulate rapid scrolling
      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.scroll(scrollContainer, {
            target: { scrollTop: i * 20, scrollLeft: 0 }
          });
        });
      }

      const scrollTime = measurer.endMeasurement('scroll-performance');

      // Should handle rapid scrolling efficiently
      expect(scrollTime).toBeLessThan(100); // Less than 100ms for 50 scroll events
    });
  });

  describe('VirtualizedTrackContainer Performance', () => {
    Object.entries(performanceTestScenarios).forEach(([scenarioName, scenario]) => {
      it(`handles ${scenarioName} dataset (${scenario.description})`, () => {
        const tracks = generateMockTracks({
          trackCount: scenario.trackCount,
          clipsPerTrack: scenario.clipsPerTrack,
          clipSpacing: (scenario as any).clipSpacing || 2
        });

        measurer.startMeasurement(`render-${scenarioName}`);

        render(
          <TestWrapper>
            <VirtualizedTrackContainer
              tracks={tracks}
              currentTime={0}
              zoom={1}
              pixelsPerSecond={100}
              theme={defaultTheme}
              estimatedItemSize={60}
              containerHeight={400}
            />
          </TestWrapper>
        );

        const renderTime = measurer.endMeasurement(`render-${scenarioName}`);

        // Performance expectations based on dataset size
        const expectedMaxTime = scenario.trackCount > 1000 ? 500 : 200;
        expect(renderTime).toBeLessThan(expectedMaxTime);

        // Should render the container
        expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
      });
    });

    it('maintains performance during playback simulation', () => {
      const tracks = generateMockTracks({
        trackCount: 1000,
        clipsPerTrack: 10
      });

      const { rerender } = render(
        <TestWrapper>
          <VirtualizedTrackContainer
            tracks={tracks}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={defaultTheme}
            estimatedItemSize={60}
            containerHeight={400}
          />
        </TestWrapper>
      );

      // Simulate 60fps playback for 2 seconds (120 frames)
      measurer.startMeasurement('playback-simulation');

      for (let frame = 0; frame < 120; frame++) {
        const currentTime = frame / 60; // 60fps
        
        act(() => {
          rerender(
            <TestWrapper>
              <VirtualizedTrackContainer
                tracks={tracks}
                currentTime={currentTime}
                zoom={1}
                pixelsPerSecond={100}
                theme={defaultTheme}
                estimatedItemSize={60}
                containerHeight={400}
              />
            </TestWrapper>
          );
        });

        // Flush any pending RAF callbacks
        act(() => {
          flushRAF();
        });
      }

      const playbackTime = measurer.endMeasurement('playback-simulation');

      // Should handle 2 seconds of 60fps updates efficiently
      expect(playbackTime).toBeLessThan(2000); // Less than 2 seconds real time

      // Average frame time should be reasonable
      const avgFrameTime = playbackTime / 120;
      expect(avgFrameTime).toBeLessThan(16); // Less than 16ms per frame (60fps)
    });

    it('handles zoom operations efficiently with large datasets', () => {
      const tracks = generateMockTracks({
        trackCount: 2000,
        clipsPerTrack: 15
      });

      const { rerender } = render(
        <TestWrapper>
          <VirtualizedTrackContainer
            tracks={tracks}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={defaultTheme}
            estimatedItemSize={60}
            containerHeight={400}
          />
        </TestWrapper>
      );

      const zoomLevels = [0.1, 0.5, 1, 2, 5, 10, 0.25, 1.5, 3];

      measurer.startMeasurement('zoom-operations');

      zoomLevels.forEach(zoom => {
        act(() => {
          rerender(
            <TestWrapper>
              <VirtualizedTrackContainer
                tracks={tracks}
                currentTime={0}
                zoom={zoom}
                pixelsPerSecond={100}
                theme={defaultTheme}
                estimatedItemSize={60}
                containerHeight={400}
              />
            </TestWrapper>
          );
        });
      });

      const zoomTime = measurer.endMeasurement('zoom-operations');

      // Should handle all zoom operations quickly
      expect(zoomTime).toBeLessThan(200); // Less than 200ms for all zoom changes
    });
  });

  describe('Memory Usage Tests', () => {
    it('maintains stable memory usage with large datasets', () => {
      const initialMemory = measureMemoryUsage();

      // Render increasingly large datasets
      const datasets = [100, 500, 1000, 2000, 5000];
      
      datasets.forEach(trackCount => {
        const tracks = generateMockTracks({
          trackCount,
          clipsPerTrack: 10
        });

        const { unmount } = render(
          <TestWrapper>
            <VirtualizedTrackContainer
              tracks={tracks}
              currentTime={0}
              zoom={1}
              pixelsPerSecond={100}
              theme={defaultTheme}
              estimatedItemSize={60}
              containerHeight={400}
            />
          </TestWrapper>
        );

        // Unmount to clean up
        unmount();
      });

      const finalMemory = measureMemoryUsage();
      
      // Memory usage should not grow excessively
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        const memoryGrowthMB = memoryGrowth / (1024 * 1024);
        
        // Should not use more than 50MB additional memory
        expect(memoryGrowthMB).toBeLessThan(50);
      }
    });

    it('cleans up properly on unmount', () => {
      const tracks = generateMockTracks({
        trackCount: 1000,
        clipsPerTrack: 20
      });

      const { unmount } = render(
        <TestWrapper>
          <VirtualizedTrackContainer
            tracks={tracks}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={defaultTheme}
            estimatedItemSize={60}
            containerHeight={400}
          />
        </TestWrapper>
      );

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Realistic Timeline Performance', () => {
    it('handles realistic video editing timeline', () => {
      const realisticTracks = generateRealisticTimeline({
        trackCount: 50,
        timelineDuration: 300, // 5 minutes
        averageClipDuration: 4,
        clipDensity: 0.8
      });

      measurer.startMeasurement('realistic-timeline');

      render(
        <TestWrapper>
          <VirtualizedTrackContainer
            tracks={realisticTracks}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
            theme={defaultTheme}
            estimatedItemSize={60}
            containerHeight={600}
          />
        </TestWrapper>
      );

      const renderTime = measurer.endMeasurement('realistic-timeline');

      // Should handle realistic timeline efficiently
      expect(renderTime).toBeLessThan(300); // Less than 300ms

      expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
    });

    it('handles complex timeline with many overlapping clips', () => {
      const complexTracks = generateRealisticTimeline({
        trackCount: 20,
        timelineDuration: 600, // 10 minutes
        averageClipDuration: 2,
        clipDensity: 0.95 // Very dense
      });

      measurer.startMeasurement('complex-timeline');

      render(
        <TestWrapper>
          <VirtualizedTrackContainer
            tracks={complexTracks}
            currentTime={0}
            zoom={2} // Zoomed in
            pixelsPerSecond={200}
            theme={defaultTheme}
            estimatedItemSize={80}
            containerHeight={800}
          />
        </TestWrapper>
      );

      const renderTime = measurer.endMeasurement('complex-timeline');

      // Should handle complex timeline
      expect(renderTime).toBeLessThan(400); // Less than 400ms

      expect(document.querySelector('.virtualized-track-container')).toBeInTheDocument();
    });
  });

  describe('Performance Regression Tests', () => {
    it('performance does not degrade with repeated renders', () => {
      const tracks = generateMockTracks({
        trackCount: 500,
        clipsPerTrack: 8
      });

      const renderTimes: number[] = [];

      // Perform multiple renders and measure each
      for (let i = 0; i < 10; i++) {
        measurer.startMeasurement(`render-${i}`);
        
        const { unmount } = render(
          <TestWrapper>
            <VirtualizedTrackContainer
              tracks={tracks}
              currentTime={i}
              zoom={1 + i * 0.1}
              pixelsPerSecond={100}
              theme={defaultTheme}
              estimatedItemSize={60}
              containerHeight={400}
            />
          </TestWrapper>
        );

        const renderTime = measurer.endMeasurement(`render-${i}`);
        renderTimes.push(renderTime);

        unmount();
      }

      // Performance should not degrade significantly
      const firstRender = renderTimes[0];
      const lastRender = renderTimes[renderTimes.length - 1];
      
      // Last render should not be more than 2x slower than first
      expect(lastRender).toBeLessThan(firstRender * 2);

      // Average render time should be reasonable
      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(200);
    });
  });

  afterAll(() => {
    // Log performance summary
    const measurements = measurer.getAllMeasurements();
    console.log('Performance Test Summary:', measurements);
  });
});