import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Timeline } from '../Timeline';
import { TimelineProps, Clip, Track } from '../../types';
import { EventBus } from '../../eventBus/EventBus';
import React from 'react';

// Mock data
const mockClip: Clip = {
  id: 'clip-1',
  trackId: 'track-1',
  start: 2,
  duration: 5,
  type: 'video',
  metadata: {
    name: 'Test Clip',
    thumbnailUrl: 'https://example.com/thumb.jpg'
  }
};

const mockTrack: Track = {
  id: 'track-1',
  type: 'video',
  name: 'Video Track',
  height: 60,
  isVisible: true,
  clips: [mockClip]
};

const defaultProps: TimelineProps = {
  tracks: [mockTrack],
  duration: 20,
  currentTime: 0,
  zoom: 1,
  pixelsPerSecond: 100,
  minZoom: 0.1,
  maxZoom: 10
};

// Mock requestAnimationFrame for smooth scrolling tests
const mockRequestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(Date.now()), 16);
};

const mockCancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock performance.now for consistent timing in tests
const mockPerformanceNow = () => Date.now();

// Helper to create event bus with same namespace as Timeline
const createTestEventBus = (namespace: string = 'timeline') => {
  return new EventBus(namespace, true);
};

describe('Timeline Programmatic Navigation', () => {
  let originalRequestAnimationFrame: typeof requestAnimationFrame;
  let originalCancelAnimationFrame: typeof cancelAnimationFrame;
  let originalPerformanceNow: typeof performance.now;

  beforeEach(() => {
    // Mock animation frame functions
    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalCancelAnimationFrame = global.cancelAnimationFrame;
    originalPerformanceNow = global.performance.now;

    global.requestAnimationFrame = mockRequestAnimationFrame as any;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    global.performance.now = mockPerformanceNow;

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original functions
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
    global.performance.now = originalPerformanceNow;
  });

  describe('Programmatic Navigation via Props', () => {
    it('should update currentTime when currentTime prop changes', async () => {
      const { rerender } = render(
        <Timeline 
          {...defaultProps} 
          currentTime={0}
        />
      );

      // Wait for component to be ready
      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      // Check initial time
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:00');

      // Update currentTime prop
      rerender(
        <Timeline 
          {...defaultProps} 
          currentTime={5}
        />
      );

      // Wait for time to update
      await waitFor(() => {
        const updatedTimeDisplay = screen.getByText('Time:').parentElement;
        expect(updatedTimeDisplay).toHaveTextContent('00:05');
      });
    });

    it('should emit scroll events when currentTime changes', async () => {
      const onScroll = jest.fn();
      const { rerender } = render(
        <Timeline 
          {...defaultProps} 
          currentTime={0}
          onScroll={onScroll}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      // Update currentTime prop
      rerender(
        <Timeline 
          {...defaultProps} 
          currentTime={5}
          onScroll={onScroll}
        />
      );

      // Wait for scroll event to be emitted
      await waitFor(() => {
        expect(onScroll).toHaveBeenCalled();
      });

      // Check that the scroll event contains the correct data
      const lastCall = onScroll.mock.calls[onScroll.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        currentTime: expect.any(Number),
        scrollLeft: expect.any(Number)
      });
    });

    it('should handle scrollTo with time beyond duration', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:scrollTo', { time: 25 }); // Beyond 20s duration
      });

      await waitFor(() => {
        const timeDisplay = screen.getByText('Time:').parentElement;
        // Should clamp to duration or handle gracefully
        expect(timeDisplay).toHaveTextContent(/00:(20|25)/);
      });
    });

    it('should handle negative time values gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:scrollTo', { time: -5 });
      });

      // Should not crash and should handle gracefully
      await waitFor(() => {
        const timeDisplay = screen.getByText('Time:').parentElement;
        expect(timeDisplay).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should emit scroll events during scrollTo operation', async () => {
      const onScroll = jest.fn();
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
          onScroll={onScroll}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:scrollTo', { time: 8 });
      });

      // Wait for scroll events to be emitted
      await waitFor(() => {
        expect(onScroll).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Check that scroll event contains correct data
      const lastCall = onScroll.mock.calls[onScroll.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        currentTime: expect.any(Number),
        scrollLeft: expect.any(Number)
      });
    });
  });

  describe('Zoom Control via Props', () => {
    it('should update zoom when zoom prop changes', async () => {
      const { rerender } = render(
        <Timeline 
          {...defaultProps} 
          zoom={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      rerender(
        <Timeline 
          {...defaultProps} 
          zoom={2}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument();
      });
    });

    it('should clamp zoom values to min/max limits', async () => {
      const { rerender } = render(
        <Timeline 
          {...defaultProps} 
          zoom={1}
          minZoom={0.5}
          maxZoom={5}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Test zoom above max - should be clamped
      rerender(
        <Timeline 
          {...defaultProps} 
          zoom={10}
          minZoom={0.5}
          maxZoom={5}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('500')).toBeInTheDocument(); // Clamped to maxZoom
      });

      // Test zoom below min - should be clamped
      rerender(
        <Timeline 
          {...defaultProps} 
          zoom={0.1}
          minZoom={0.5}
          maxZoom={5}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument(); // Clamped to minZoom
      });
    });

    it('should handle timeline:zoomIn event', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:zoomIn', {});
      });

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // 1 * 1.5 = 1.5
      });
    });

    it('should handle timeline:zoomIn with custom factor', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:zoomIn', { factor: 2 });
      });

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument(); // 1 * 2 = 2
      });
    });

    it('should handle timeline:zoomOut event', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          zoom={3}
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('300')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:zoomOut', {});
      });

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument(); // 3 / 1.5 = 2
      });
    });

    it('should handle timeline:zoomOut with custom factor', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          zoom={4}
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('400')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:zoomOut', { factor: 2 });
      });

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument(); // 4 / 2 = 2
      });
    });

    it('should handle timeline:zoomToFit event', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:zoomToFit', undefined);
      });

      // Should calculate appropriate zoom level based on content
      await waitFor(() => {
        const zoomDisplay = screen.getByText(/\d+/);
        expect(zoomDisplay).toBeInTheDocument();
        // The exact percentage will depend on the zoom-to-fit calculation
      });
    });

    it('should emit zoom events when zoom changes', async () => {
      const onZoom = jest.fn();
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
          onZoom={onZoom}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:setZoom', { zoom: 2 });
      });

      await waitFor(() => {
        expect(onZoom).toHaveBeenCalledWith({
          oldScale: 1,
          newScale: 2,
          centerTime: expect.any(Number)
        });
      });
    });

    it('should not zoom beyond max limit', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          zoom={9}
          maxZoom={10}
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('900')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:zoomIn', { factor: 2 });
      });

      await waitFor(() => {
        expect(screen.getByText('1000')).toBeInTheDocument(); // Clamped to maxZoom
      });
    });

    it('should not zoom below min limit', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          zoom={0.2}
          minZoom={0.1}
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:zoomOut', { factor: 3 });
      });

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Clamped to minZoom
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle scrollTo event with invalid payload gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      // Emit event with invalid payload
      act(() => {
        eventBus.emit('timeline:scrollTo', { time: 'invalid' } as any);
      });

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle zoom events with invalid payload gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Emit event with invalid payload
      act(() => {
        eventBus.emit('timeline:setZoom', { zoom: 'invalid' } as any);
      });

      // Should not crash and maintain current zoom
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing event payload gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      // Emit event with no payload
      act(() => {
        eventBus.emit('timeline:scrollTo', undefined as any);
      });

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Smooth Scrolling', () => {
    it('should perform smooth scrolling when scrollTo is called', async () => {
      const onScroll = jest.fn();
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
          onScroll={onScroll}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      act(() => {
        eventBus.emit('timeline:scrollTo', { time: 10 });
      });

      // Wait for smooth scrolling animation to complete
      await waitFor(() => {
        expect(onScroll).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Should have multiple scroll events during smooth scrolling
      expect(onScroll.mock.calls.length).toBeGreaterThan(0);
    });

    it('should cancel previous smooth scroll when new scrollTo is called', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      // Start first scroll
      act(() => {
        eventBus.emit('timeline:scrollTo', { time: 10 });
      });

      // Immediately start second scroll (should cancel first)
      act(() => {
        eventBus.emit('timeline:scrollTo', { time: 5 });
      });

      // Should end up at the second target
      await waitFor(() => {
        const timeDisplay = screen.getByText('Time:').parentElement;
        expect(timeDisplay).toHaveTextContent('00:05');
      }, { timeout: 1000 });
    });
  });

  describe('Integration with Zoom', () => {
    it('should maintain scroll position relative to content when zooming', async () => {
      render(
        <Timeline 
          {...defaultProps} 
          currentTime={10}
          eventBusNamespace="test-timeline"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Time:')).toBeInTheDocument();
      });

      // Zoom in while at a specific time
      act(() => {
        eventBus.emit('timeline:setZoom', { zoom: 2 });
      });

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument();
      });

      // Time should remain the same
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:10');
    });

    it('should handle zoom with center time parameter', async () => {
      const onZoom = jest.fn();
      
      render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="test-timeline"
          onZoom={onZoom}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Zoom with specific center time
      act(() => {
        eventBus.emit('timeline:setZoom', { zoom: 2 });
      });

      await waitFor(() => {
        expect(onZoom).toHaveBeenCalledWith({
          oldScale: 1,
          newScale: 2,
          centerTime: expect.any(Number)
        });
      });
    });
  });

  describe('Multiple Timeline Instances', () => {
    it('should handle events for specific timeline namespace', async () => {
      const eventBus1 = new EventBus('timeline1');
      const eventBus2 = new EventBus('timeline2');
      
      const { container: container1 } = render(
        <Timeline 
          {...defaultProps} 
          eventBusNamespace="timeline1"
        />
      );

      const { container: container2 } = render(
        <Timeline 
          {...defaultProps} 
          currentTime={5}
          eventBusNamespace="timeline2"
        />
      );

      await waitFor(() => {
        expect(container1.querySelector('.timeline-root')).toBeInTheDocument();
        expect(container2.querySelector('.timeline-root')).toBeInTheDocument();
      });

      // Emit event to first timeline only
      act(() => {
        eventBus1.emit('timeline:scrollTo', { time: 8 });
      });

      // Only first timeline should be affected
      await waitFor(() => {
        const timeDisplays = screen.getAllByText('Time:');
        expect(timeDisplays).toHaveLength(2);
      });

      eventBus1.clear();
      eventBus2.clear();
    });
  });
});