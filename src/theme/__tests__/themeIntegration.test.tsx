import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Timeline } from '../../components/Timeline';
import { ThemeProvider } from '../ThemeProvider';
import { TimelineTheme } from '../../types';
import { EventBusProvider } from '../../eventBus/EventBusProvider';

// Helper function to convert hex to RGB for testing
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgb(${r}, ${g}, ${b})`;
};

// Mock the components that might not be fully implemented
jest.mock('../../components/TimelineErrorBoundary', () => ({
  TimelineErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../../components/TimelineHeader', () => ({
  TimelineHeader: () => <div data-testid="timeline-header">Header</div>
}));

jest.mock('../../components/TrackContainer', () => ({
  TrackContainer: () => <div data-testid="track-container">Tracks</div>
}));

jest.mock('../../components/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {}
}));

describe('Theme Integration', () => {
  const mockTracks = [
    {
      id: 'track-1',
      type: 'video' as const,
      name: 'Video Track',
      height: 60,
      isVisible: true,
      clips: []
    }
  ];

  it('should apply theme to Timeline component', () => {
    const customTheme = {
      backgroundColor: '#ff0000',
      primaryColor: '#00ff00'
    };

    render(
      <Timeline
        tracks={mockTracks}
        duration={100}
        theme={customTheme}
      />
    );

    const timelineRoot = document.querySelector('.timeline-root');
    expect(timelineRoot).toBeInTheDocument();
    
    if (timelineRoot) {
      const computedStyle = window.getComputedStyle(timelineRoot);
      expect(computedStyle.backgroundColor).toBe(hexToRgb('#ff0000'));
    }
  });

  it('should use default theme when no theme is provided', () => {
    render(
      <Timeline
        tracks={mockTracks}
        duration={100}
      />
    );

    const timelineRoot = document.querySelector('.timeline-root');
    expect(timelineRoot).toBeInTheDocument();
  });

  it('should allow theme override through external ThemeProvider', () => {
    const externalTheme = {
      backgroundColor: '#0000ff',
      primaryColor: '#ffff00'
    };

    const timelineTheme = {
      backgroundColor: '#ff0000'
    };

    render(
      <ThemeProvider theme={externalTheme}>
        <Timeline
          tracks={mockTracks}
          duration={100}
          theme={timelineTheme}
        />
      </ThemeProvider>
    );

    // Timeline's internal ThemeProvider should take precedence
    const timelineRoot = document.querySelector('.timeline-root');
    expect(timelineRoot).toBeInTheDocument();
  });

  it('should handle theme changes dynamically', () => {
    const TestWrapper: React.FC = () => {
      const [theme, setTheme] = React.useState({
        backgroundColor: '#ff0000'
      });

      return (
        <div>
          <button
            data-testid="change-theme"
            onClick={() => setTheme({ backgroundColor: '#00ff00' })}
          >
            Change Theme
          </button>
          <Timeline
            tracks={mockTracks}
            duration={100}
            theme={theme}
          />
        </div>
      );
    };

    render(<TestWrapper />);

    const changeButton = screen.getByTestId('change-theme');
    const timelineRoot = document.querySelector('.timeline-root');

    expect(timelineRoot).toBeInTheDocument();

    // Change theme
    act(() => {
      changeButton.click();
    });

    // Theme should be updated
    if (timelineRoot) {
      const computedStyle = window.getComputedStyle(timelineRoot);
      expect(computedStyle.backgroundColor).toBe(hexToRgb('#00ff00'));
    }
  });

  it('should propagate theme to child components', () => {
    const customTheme = {
      backgroundColor: '#ff0000',
      primaryColor: '#00ff00'
    };

    render(
      <Timeline
        tracks={mockTracks}
        duration={100}
        theme={customTheme}
      />
    );

    // Check that header and track container are rendered (they should receive theme through context)
    expect(screen.getByTestId('timeline-header')).toBeInTheDocument();
    expect(screen.getByTestId('track-container')).toBeInTheDocument();
  });

  it('should handle theme with partial clip colors', () => {
    const customTheme = {
      clipColors: {
        video: '#ff0000'
      }
    };

    render(
      <Timeline
        tracks={mockTracks}
        duration={100}
        theme={customTheme}
      />
    );

    const timelineRoot = document.querySelector('.timeline-root');
    expect(timelineRoot).toBeInTheDocument();
  });

  it('should handle theme with partial fonts', () => {
    const customTheme = {
      fonts: {
        primary: 'Custom Font, sans-serif'
      }
    };

    render(
      <Timeline
        tracks={mockTracks}
        duration={100}
        theme={customTheme}
      />
    );

    const timelineRoot = document.querySelector('.timeline-root');
    expect(timelineRoot).toBeInTheDocument();
    
    if (timelineRoot) {
      const computedStyle = window.getComputedStyle(timelineRoot);
      expect(computedStyle.fontFamily).toBe('Custom Font, sans-serif');
    }
  });

  it('should work with EventBus namespace and theme together', () => {
    const customTheme = {
      backgroundColor: '#ff0000'
    };

    render(
      <Timeline
        tracks={mockTracks}
        duration={100}
        theme={customTheme}
        eventBusNamespace="custom-timeline"
      />
    );

    const timelineRoot = document.querySelector('.timeline-root');
    expect(timelineRoot).toBeInTheDocument();
  });

  it('should maintain theme consistency across re-renders', () => {
    const customTheme = {
      backgroundColor: '#ff0000',
      primaryColor: '#00ff00'
    };

    const { rerender } = render(
      <Timeline
        tracks={mockTracks}
        duration={100}
        theme={customTheme}
      />
    );

    const timelineRoot = document.querySelector('.timeline-root');
    expect(timelineRoot).toBeInTheDocument();

    // Re-render with same theme
    rerender(
      <Timeline
        tracks={mockTracks}
        duration={200} // Different duration
        theme={customTheme}
      />
    );

    // Theme should still be applied
    if (timelineRoot) {
      const computedStyle = window.getComputedStyle(timelineRoot);
      expect(computedStyle.backgroundColor).toBe(hexToRgb('#ff0000'));
    }
  });
});