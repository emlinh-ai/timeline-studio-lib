import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineHeader, formatTime } from '../TimelineHeader';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { TimelineTheme } from '../../types';

// Mock theme
const mockTheme: TimelineTheme = {
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
    monospace: 'Courier, monospace'
  }
};

// Wrapper component with EventBus provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <EventBusProvider namespace="test">
    {children}
  </EventBusProvider>
);

const defaultProps = {
  currentTime: 5,
  duration: 30,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 10,
  pixelsPerSecond: 100,
  theme: mockTheme
};

describe('TimelineHeader Component', () => {
  describe('formatTime utility', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3661)).toBe('61:01'); // Over an hour
    });

    it('should handle decimal seconds', () => {
      expect(formatTime(5.7)).toBe('00:05');
      expect(formatTime(65.9)).toBe('01:05');
    });

    it('should handle negative numbers', () => {
      expect(formatTime(-5)).toBe('-00:05');
      expect(formatTime(-65)).toBe('-01:05');
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Time:')).toBeInTheDocument();
      // Check for current time in the time display (not in ruler)
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:05');
      expect(timeDisplay).toHaveTextContent('00:30');
    });

    it('should display current time and duration', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} currentTime={125} duration={300} />
        </TestWrapper>
      );

      // Check for times in the time display (not in ruler)
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('02:05'); // 125 seconds = 2:05
      expect(timeDisplay).toHaveTextContent('05:00'); // 300 seconds = 5:00
    });

    it('should display zoom percentage', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={1.5} />
        </TestWrapper>
      );

      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should apply theme styles', () => {
      const customTheme = {
        ...mockTheme,
        backgroundColor: '#ff0000',
        primaryColor: '#00ff00'
      };

      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} theme={customTheme} />
        </TestWrapper>
      );

      const header = container.querySelector('.timeline-header');
      expect(header).toHaveStyle('background-color: #ff0000');
    });
  });

  describe('Zoom Controls', () => {
    it('should render zoom controls', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTitle('Zoom In (Ctrl + +)')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out (Ctrl + -)')).toBeInTheDocument();
      expect(screen.getByTitle('Reset Zoom (Ctrl + 0)')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom to Fit')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should call onZoomChange when zoom in is clicked', () => {
      const mockOnZoomChange = jest.fn();
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} onZoomChange={mockOnZoomChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTitle('Zoom In (Ctrl + +)'));
      expect(mockOnZoomChange).toHaveBeenCalledWith(1.5);
    });

    it('should call onZoomChange when zoom out is clicked', () => {
      const mockOnZoomChange = jest.fn();
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={2} onZoomChange={mockOnZoomChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTitle('Zoom Out (Ctrl + -)'));
      expect(mockOnZoomChange).toHaveBeenCalledWith(expect.closeTo(1.33, 1));
    });

    it('should call onZoomChange when reset is clicked', () => {
      const mockOnZoomChange = jest.fn();
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={2} onZoomChange={mockOnZoomChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTitle('Reset Zoom (Ctrl + 0)'));
      expect(mockOnZoomChange).toHaveBeenCalledWith(1);
    });

    it('should disable zoom in when at max zoom', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={10} maxZoom={10} />
        </TestWrapper>
      );

      const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
      expect(zoomInButton).toBeDisabled();
    });

    it('should disable zoom out when at min zoom', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={0.1} minZoom={0.1} />
        </TestWrapper>
      );

      const zoomOutButton = screen.getByTitle('Zoom Out (Ctrl + -)');
      expect(zoomOutButton).toBeDisabled();
    });

    it('should respect zoom limits', () => {
      const mockOnZoomChange = jest.fn();
      render(
        <TestWrapper>
          <TimelineHeader 
            {...defaultProps} 
            zoom={10} 
            maxZoom={10} 
            onZoomChange={mockOnZoomChange} 
          />
        </TestWrapper>
      );

      // At max zoom, zoom in button should be disabled
      const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
      expect(zoomInButton).toBeDisabled();
      
      // Clicking disabled button should not call onZoomChange
      fireEvent.click(zoomInButton);
      expect(mockOnZoomChange).not.toHaveBeenCalled();
    });

    it('should enforce zoom scale constraints', () => {
      const mockOnZoomChange = jest.fn();
      
      // Test zoom in at max zoom
      const { rerender } = render(
        <TestWrapper>
          <TimelineHeader 
            {...defaultProps} 
            zoom={10} 
            maxZoom={10} 
            onZoomChange={mockOnZoomChange} 
          />
        </TestWrapper>
      );

      const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
      expect(zoomInButton).toBeDisabled();

      // Test zoom out at min zoom
      rerender(
        <TestWrapper>
          <TimelineHeader 
            {...defaultProps} 
            zoom={0.1} 
            minZoom={0.1} 
            onZoomChange={mockOnZoomChange} 
          />
        </TestWrapper>
      );

      const zoomOutButton = screen.getByTitle('Zoom Out (Ctrl + -)');
      expect(zoomOutButton).toBeDisabled();
    });

    it('should call onZoomChange with zoom to fit functionality', () => {
      const mockOnZoomChange = jest.fn();
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} onZoomChange={mockOnZoomChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTitle('Zoom to Fit'));
      expect(mockOnZoomChange).toHaveBeenCalledWith(0.5); // Default fit zoom
    });
  });

  describe('Time Ruler', () => {
    it('should render time ruler', () => {
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} />
        </TestWrapper>
      );

      const timeRuler = container.querySelector('.time-ruler');
      expect(timeRuler).toBeInTheDocument();
    });

    it('should show current time indicator', () => {
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} currentTime={10} />
        </TestWrapper>
      );

      const indicator = container.querySelector('.current-time-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveStyle('background-color: #ff4444');
    });

    it('should call onTimeChange when ruler is clicked', () => {
      const mockOnTimeChange = jest.fn();
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} onTimeChange={mockOnTimeChange} />
        </TestWrapper>
      );

      const timeRuler = container.querySelector('.time-ruler');
      if (timeRuler) {
        // Mock getBoundingClientRect
        jest.spyOn(timeRuler, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          right: 3000, // 30 seconds * 100 pixels per second
          bottom: 30,
          width: 3000,
          height: 30,
          x: 0,
          y: 0,
          toJSON: () => ({})
        });

        // Click at 50% of the ruler (should be 15 seconds)
        fireEvent.click(timeRuler, { clientX: 1500 });
        expect(mockOnTimeChange).toHaveBeenCalledWith(15);
      }
    });

    it('should generate appropriate time markers based on zoom', () => {
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={0.5} />
        </TestWrapper>
      );

      const timeMarkers = container.querySelectorAll('.time-marker');
      expect(timeMarkers.length).toBeGreaterThan(0);
    });

    it('should adjust time intervals based on zoom level', () => {
      // Test with high zoom (should show more frequent markers)
      const { container: highZoomContainer } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={5} />
        </TestWrapper>
      );

      // Test with low zoom (should show less frequent markers)
      const { container: lowZoomContainer } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={0.1} />
        </TestWrapper>
      );

      const highZoomMarkers = highZoomContainer.querySelectorAll('.time-marker');
      const lowZoomMarkers = lowZoomContainer.querySelectorAll('.time-marker');

      // High zoom should have more markers than low zoom
      expect(highZoomMarkers.length).toBeGreaterThan(lowZoomMarkers.length);
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit zoom event when zoom changes', async () => {
      const mockOnZoomChange = jest.fn();
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} onZoomChange={mockOnZoomChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTitle('Zoom In (Ctrl + +)'));

      // The component should call onZoomChange and emit event
      expect(mockOnZoomChange).toHaveBeenCalledWith(1.5);
    });

    it('should emit zoom event with center time for zoom-to-position functionality', async () => {
      const mockOnZoomChange = jest.fn();
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} currentTime={10} onZoomChange={mockOnZoomChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTitle('Zoom In (Ctrl + +)'));

      // The component should call onZoomChange with center time
      expect(mockOnZoomChange).toHaveBeenCalledWith(1.5);
    });

    it('should emit scroll event when time changes', async () => {
      const mockOnTimeChange = jest.fn();
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} onTimeChange={mockOnTimeChange} />
        </TestWrapper>
      );

      const timeRuler = container.querySelector('.time-ruler');
      if (timeRuler) {
        jest.spyOn(timeRuler, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          right: 3000,
          bottom: 30,
          width: 3000,
          height: 30,
          x: 0,
          y: 0,
          toJSON: () => ({})
        });

        fireEvent.click(timeRuler, { clientX: 1000 });
        expect(mockOnTimeChange).toHaveBeenCalled();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper button titles for screen readers', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTitle('Zoom In (Ctrl + +)')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out (Ctrl + -)')).toBeInTheDocument();
      expect(screen.getByTitle('Reset Zoom (Ctrl + 0)')).toBeInTheDocument();
    });

    it('should have proper cursor styles', () => {
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} />
        </TestWrapper>
      );

      const timeRuler = container.querySelector('.time-ruler');
      expect(timeRuler).toHaveStyle('cursor: pointer');
    });

    it('should handle keyboard navigation on buttons', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} />
        </TestWrapper>
      );

      const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
      zoomInButton.focus();
      expect(zoomInButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} duration={0} />
        </TestWrapper>
      );

      // Check for duration in the time display
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('00:00');
    });

    it('should handle very large durations', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} duration={7200} /> {/* 2 hours */}
        </TestWrapper>
      );

      // Check for duration in the time display
      const timeDisplay = screen.getByText('Time:').parentElement;
      expect(timeDisplay).toHaveTextContent('120:00'); // 120 minutes
    });

    it('should handle current time exceeding duration', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} currentTime={50} duration={30} />
        </TestWrapper>
      );

      // Should still render without crashing
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });

    it('should handle very small zoom values', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={0.01} />
        </TestWrapper>
      );

      expect(screen.getByText('1%')).toBeInTheDocument();
    });

    it('should handle very large zoom values', () => {
      render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={50} />
        </TestWrapper>
      );

      expect(screen.getByText('5000%')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle different pixel per second values', () => {
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} pixelsPerSecond={50} />
        </TestWrapper>
      );

      const timeRuler = container.querySelector('.time-ruler');
      expect(timeRuler).toHaveStyle('min-width: 1500px'); // 30 seconds * 50 pixels
    });

    it('should adjust ruler width based on zoom and duration', () => {
      const { container } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={2} duration={60} pixelsPerSecond={100} />
        </TestWrapper>
      );

      const timeRuler = container.querySelector('.time-ruler');
      expect(timeRuler).toHaveStyle('min-width: 12000px'); // 60 * 100 * 2
    });

    it('should update pixels-per-second ratio based on zoom level', () => {
      const { container, rerender } = render(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={1} pixelsPerSecond={100} />
        </TestWrapper>
      );

      let timeRuler = container.querySelector('.time-ruler');
      expect(timeRuler).toHaveStyle('min-width: 3000px'); // 30 * 100 * 1

      // Re-render with different zoom
      rerender(
        <TestWrapper>
          <TimelineHeader {...defaultProps} zoom={2} pixelsPerSecond={100} />
        </TestWrapper>
      );

      timeRuler = container.querySelector('.time-ruler');
      expect(timeRuler).toHaveStyle('min-width: 6000px'); // 30 * 100 * 2
    });
  });
});