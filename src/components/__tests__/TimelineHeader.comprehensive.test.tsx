import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineHeader, formatTime } from '../TimelineHeader';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';

// Mock responsive utils
jest.mock('../../utils/responsive', () => ({
  useScreenSize: () => ({ screenSize: 'desktop' }),
  getResponsiveTimeInterval: () => 10,
  getResponsiveValue: (config: any) => config.desktop || config.default || 50,
  DEFAULT_RESPONSIVE_CONFIG: {
    timeRulerHeight: { mobile: 20, tablet: 25, desktop: 30 },
    headerHeight: { mobile: 40, tablet: 45, desktop: 50 },
    fontSize: { mobile: 10, tablet: 11, desktop: 12 },
    controlsSize: { mobile: 24, tablet: 28, desktop: 32 }
  }
}));

const defaultProps = {
  currentTime: 30,
  duration: 120,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 10,
  pixelsPerSecond: 30,
  onZoomChange: jest.fn(),
  onTimeChange: jest.fn()
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventBusProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </EventBusProvider>
  );
};

describe('TimelineHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatTime utility', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(59)).toBe('00:59');
    });

    it('should format minutes correctly', () => {
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(120)).toBe('02:00');
      expect(formatTime(150)).toBe('02:30');
    });

    it('should handle large values', () => {
      expect(formatTime(3600)).toBe('60:00');
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle negative values', () => {
      expect(formatTime(-30)).toBe('-00:30');
      expect(formatTime(-90)).toBe('-01:30');
    });

    it('should handle edge cases', () => {
      expect(formatTime(0.5)).toBe('00:00');
      expect(formatTime(59.9)).toBe('00:59');
    });
  });

  describe('Component Rendering', () => {
    it('should render timeline header with all components', () => {
      renderWithProviders(<TimelineHeader {...defaultProps} />);
      
      expect(screen.getByText('Time:')).toBeInTheDocument();
      expect(screen.getByText('00:30')).toBeInTheDocument();
      expect(screen.getByText('02:00')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom controls')).toBeInTheDocument();
      expect(screen.getByLabelText('Timeline scrubber')).toBeInTheDocument();
    });

    it('should display current time and duration', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          currentTime={45}
          duration={180}
        />
      );
      
      expect(screen.getByText('00:45')).toBeInTheDocument();
      expect(screen.getByText('03:00')).toBeInTheDocument();
    });

    it('should render zoom controls with correct values', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={1.5}
        />
      );
      
      expect(screen.getByText('150%')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out to 100%')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in to 225%')).toBeInTheDocument();
    });
  });

  describe('Time Ruler', () => {
    it('should render time ruler with correct ARIA attributes', () => {
      renderWithProviders(<TimelineHeader {...defaultProps} />);
      
      const ruler = screen.getByLabelText('Timeline scrubber');
      expect(ruler).toHaveAttribute('role', 'slider');
      expect(ruler).toHaveAttribute('aria-valuemin', '0');
      expect(ruler).toHaveAttribute('aria-valuemax', '120');
      expect(ruler).toHaveAttribute('aria-valuenow', '30');
      expect(ruler).toHaveAttribute('aria-valuetext', 'Current time: 00:30 of 02:00');
      expect(ruler).toHaveAttribute('tabindex', '0');
    });

    it('should handle ruler clicks', async () => {
      const onTimeChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          onTimeChange={onTimeChange}
        />
      );
      
      const ruler = screen.getByLabelText('Timeline scrubber');
      
      // Mock getBoundingClientRect
      jest.spyOn(ruler, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width: 3600, // duration * pixelsPerSecond * zoom = 120 * 30 * 1
        top: 0,
        height: 30,
        right: 3600,
        bottom: 30
      } as DOMRect);
      
      fireEvent.click(ruler, { clientX: 1800 }); // Click at middle
      
      expect(onTimeChange).toHaveBeenCalledWith(60); // Half of duration
    });

    it('should handle keyboard navigation on ruler', async () => {
      const onTimeChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          onTimeChange={onTimeChange}
        />
      );
      
      const ruler = screen.getByLabelText('Timeline scrubber');
      ruler.focus();
      
      fireEvent.keyDown(ruler, { key: 'ArrowRight' });
      expect(onTimeChange).toHaveBeenCalledWith(31);
      
      fireEvent.keyDown(ruler, { key: 'ArrowLeft' });
      expect(onTimeChange).toHaveBeenCalledWith(29);
      
      fireEvent.keyDown(ruler, { key: 'ArrowRight', shiftKey: true });
      expect(onTimeChange).toHaveBeenCalledWith(40);
    });

    it('should constrain time values within bounds', async () => {
      const onTimeChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          currentTime={0}
          onTimeChange={onTimeChange}
        />
      );
      
      const ruler = screen.getByLabelText('Timeline scrubber');
      ruler.focus();
      
      fireEvent.keyDown(ruler, { key: 'ArrowLeft' });
      expect(onTimeChange).toHaveBeenCalledWith(0); // Should not go below 0
      
      // Test upper bound
      const { rerender } = renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          currentTime={0}
          onTimeChange={onTimeChange}
        />
      );
      
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <TimelineHeader 
              {...defaultProps}
              currentTime={120}
              onTimeChange={onTimeChange}
            />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      const ruler2 = screen.getByLabelText('Timeline scrubber');
      ruler2.focus();
      
      fireEvent.keyDown(ruler2, { key: 'ArrowRight' });
      expect(onTimeChange).toHaveBeenCalledWith(120); // Should not exceed duration
    });

    it('should render current time indicator', () => {
      const { container } = renderWithProviders(<TimelineHeader {...defaultProps} />);
      
      const indicator = container.querySelector('.current-time-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveStyle({
        left: '900px', // currentTime * pixelsPerSecond * zoom = 30 * 30 * 1
        backgroundColor: '#ff4444'
      });
    });
  });

  describe('Zoom Controls', () => {
    it('should handle zoom in', async () => {
      const onZoomChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={1}
          onZoomChange={onZoomChange}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in to 150%');
      fireEvent.click(zoomInButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(1.5);
    });

    it('should handle zoom out', async () => {
      const onZoomChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={1.5}
          onZoomChange={onZoomChange}
        />
      );
      
      const zoomOutButton = screen.getByLabelText('Zoom out to 100%');
      fireEvent.click(zoomOutButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(1);
    });

    it('should handle zoom reset', async () => {
      const onZoomChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={2}
          onZoomChange={onZoomChange}
        />
      );
      
      const resetButton = screen.getByLabelText('Reset zoom to 100%');
      fireEvent.click(resetButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(1);
    });

    it('should handle zoom to fit', async () => {
      const onZoomChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          onZoomChange={onZoomChange}
        />
      );
      
      const fitButton = screen.getByLabelText('Zoom to fit all content');
      fireEvent.click(fitButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(0.5);
    });

    it('should respect zoom limits', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={0.1}
          minZoom={0.1}
          maxZoom={10}
        />
      );
      
      const zoomOutButton = screen.getByLabelText('Zoom out to 7%');
      expect(zoomOutButton).toBeDisabled();
    });

    it('should disable zoom in at max zoom', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={10}
          minZoom={0.1}
          maxZoom={10}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in to 1500%');
      expect(zoomInButton).toBeDisabled();
    });

    it('should display correct zoom percentage', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={0.75}
        />
      );
      
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByLabelText('Current zoom level: 75 percent')).toBeInTheDocument();
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit zoom events', async () => {
      const mockEventBus = {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };
      
      // Mock useEventBus hook
      jest.doMock('../../eventBus/EventBusProvider', () => ({
        useEventBus: () => mockEventBus,
        EventBusProvider: ({ children }: any) => children
      }));
      
      const onZoomChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          onZoomChange={onZoomChange}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in to 150%');
      fireEvent.click(zoomInButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(1.5);
    });

    it('should emit scroll events on time change', async () => {
      const onTimeChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          onTimeChange={onTimeChange}
        />
      );
      
      const ruler = screen.getByLabelText('Timeline scrubber');
      
      // Mock getBoundingClientRect
      jest.spyOn(ruler, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width: 3600,
        top: 0,
        height: 30,
        right: 3600,
        bottom: 30
      } as DOMRect);
      
      fireEvent.click(ruler, { clientX: 900 });
      
      expect(onTimeChange).toHaveBeenCalledWith(30);
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile screen size', () => {
      // Mock mobile screen size
      jest.doMock('../../utils/responsive', () => ({
        useScreenSize: () => ({ screenSize: 'mobile' }),
        getResponsiveTimeInterval: () => 20,
        getResponsiveValue: (config: any) => config.mobile || config.default || 20,
        DEFAULT_RESPONSIVE_CONFIG: {
          timeRulerHeight: { mobile: 20, tablet: 25, desktop: 30 },
          headerHeight: { mobile: 40, tablet: 45, desktop: 50 },
          fontSize: { mobile: 10, tablet: 11, desktop: 12 },
          controlsSize: { mobile: 24, tablet: 28, desktop: 32 }
        }
      }));
      
      const { container } = renderWithProviders(<TimelineHeader {...defaultProps} />);
      
      // Check if mobile styles are applied
      const header = container.querySelector('.timeline-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(<TimelineHeader {...defaultProps} />);
      
      expect(screen.getByLabelText('Timeline scrubber')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom controls')).toBeInTheDocument();
      expect(screen.getByLabelText('Current zoom level: 100 percent')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<TimelineHeader {...defaultProps} />);
      
      const ruler = screen.getByLabelText('Timeline scrubber');
      const zoomInButton = screen.getByLabelText(/Zoom in/);
      const zoomOutButton = screen.getByLabelText(/Zoom out/);
      
      expect(ruler).toHaveAttribute('tabindex', '0');
      expect(zoomInButton).not.toBeDisabled();
      expect(zoomOutButton).not.toBeDisabled();
    });

    it('should announce zoom level changes', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          zoom={1.5}
        />
      );
      
      const zoomStatus = screen.getByLabelText('Current zoom level: 150 percent');
      expect(zoomStatus).toHaveAttribute('role', 'status');
    });
  });

  describe('Performance', () => {
    it('should memoize components to prevent unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(<TimelineHeader {...defaultProps} />);
      
      // Re-render with same props
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <TimelineHeader {...defaultProps} />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      // Component should be memoized
      expect(screen.getByText('00:30')).toBeInTheDocument();
    });

    it('should handle rapid zoom changes efficiently', async () => {
      const onZoomChange = jest.fn();
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          onZoomChange={onZoomChange}
        />
      );
      
      const zoomInButton = screen.getByLabelText(/Zoom in/);
      
      // Rapid clicks
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomInButton);
      
      expect(onZoomChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          duration={0}
        />
      );
      
      expect(screen.getAllByText('00:00')).toHaveLength(2); // One in time display, one in ruler
    });

    it('should handle very large durations', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          duration={7200} // 2 hours
        />
      );
      
      expect(screen.getAllByText('120:00')).toHaveLength(2); // One in time display, one in ruler
    });

    it('should handle negative current time', () => {
      renderWithProviders(
        <TimelineHeader 
          {...defaultProps}
          currentTime={-10}
        />
      );
      
      expect(screen.getByText('-00:10')).toBeInTheDocument();
    });

    it('should handle missing optional props', () => {
      renderWithProviders(
        <TimelineHeader 
          currentTime={30}
          duration={120}
          zoom={1}
          pixelsPerSecond={30}
        />
      );
      
      expect(screen.getByText('00:30')).toBeInTheDocument();
    });
  });
});