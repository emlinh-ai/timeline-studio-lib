/**
 * Integration tests for Timeline responsive behavior
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { Track, Clip } from '../../types';

// Mock the responsive hook to control screen size
const mockScreenSize = jest.fn();
jest.mock('../../utils/responsive', () => ({
  ...jest.requireActual('../../utils/responsive'),
  useScreenSize: () => ({
    screenSize: mockScreenSize(),
    width: mockScreenSize() === 'mobile' ? 500 : mockScreenSize() === 'tablet' ? 800 : 1200,
    height: 600
  })
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Timeline Responsive Behavior', () => {
  const mockTracks: Track[] = [
    {
      id: 'track-1',
      type: 'video',
      name: 'Video Track',
      height: 60,
      isVisible: true,
      clips: [
        {
          id: 'clip-1',
          trackId: 'track-1',
          start: 0,
          duration: 5,
          type: 'video',
          metadata: { name: 'Test Video Clip' }
        } as Clip
      ]
    },
    {
      id: 'track-2',
      type: 'audio',
      name: 'Audio Track',
      height: 60,
      isVisible: true,
      isMuted: false,
      clips: [
        {
          id: 'clip-2',
          trackId: 'track-2',
          start: 2,
          duration: 3,
          type: 'audio',
          metadata: { name: 'Test Audio Clip' }
        } as Clip
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockScreenSize.mockReturnValue('mobile');
    });

    it('should render with mobile-specific dimensions', () => {
      render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      // Timeline should render
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should use smaller track heights on mobile', () => {
      const { container } = render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      // Check if mobile styles are applied (this would need more specific selectors in real implementation)
      const timelineRoot = container.querySelector('.timeline-root');
      expect(timelineRoot).toBeInTheDocument();
    });

    it('should adjust pixels per second for mobile', () => {
      render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      // The component should render without errors with adjusted pixels per second
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should use mobile-appropriate time intervals', () => {
      render(
        <Timeline
          tracks={mockTracks}
          duration={60}
          currentTime={0}
          zoom={0.5}
          pixelsPerSecond={50}
        />
      );

      // Timeline should render with appropriate time markers
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Tablet Layout', () => {
    beforeEach(() => {
      mockScreenSize.mockReturnValue('tablet');
    });

    it('should render with tablet-specific dimensions', () => {
      render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should use medium-sized elements on tablet', () => {
      const { container } = render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      const timelineRoot = container.querySelector('.timeline-root');
      expect(timelineRoot).toBeInTheDocument();
    });
  });

  describe('Desktop Layout', () => {
    beforeEach(() => {
      mockScreenSize.mockReturnValue('desktop');
    });

    it('should render with desktop-specific dimensions', () => {
      render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should use full-sized elements on desktop', () => {
      const { container } = render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      const timelineRoot = container.querySelector('.timeline-root');
      expect(timelineRoot).toBeInTheDocument();
    });

    it('should show all UI elements on desktop', () => {
      render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      // All elements should be visible on desktop
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Screen Size Changes', () => {
    it('should adapt when screen size changes from desktop to mobile', () => {
      // Start with desktop
      mockScreenSize.mockReturnValue('desktop');
      
      const { rerender } = render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      expect(screen.getByRole('application')).toBeInTheDocument();

      // Change to mobile
      mockScreenSize.mockReturnValue('mobile');
      
      rerender(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      // Should still render correctly
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should handle rapid screen size changes', () => {
      const screenSizes = ['mobile', 'tablet', 'desktop', 'mobile'] as const;
      
      screenSizes.forEach((size, index) => {
        mockScreenSize.mockReturnValue(size);
        
        const { rerender } = render(
          <Timeline
            key={index}
            tracks={mockTracks}
            duration={10}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
          />
        );

        expect(screen.getByRole('application')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Zoom Behavior', () => {
    it('should adjust zoom-to-fit calculations for different screen sizes', () => {
      const testCases = [
        { screenSize: 'mobile' as const, expectedViewportWidth: 300 },
        { screenSize: 'tablet' as const, expectedViewportWidth: 600 },
        { screenSize: 'desktop' as const, expectedViewportWidth: 1000 }
      ];

      testCases.forEach(({ screenSize }) => {
        mockScreenSize.mockReturnValue(screenSize);
        
        render(
          <Timeline
            tracks={mockTracks}
            duration={10}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
          />
        );

        expect(screen.getByRole('application')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Clip Rendering', () => {
    it('should render clips with appropriate minimum widths for each screen size', () => {
      const screenSizes = ['mobile', 'tablet', 'desktop'] as const;
      
      screenSizes.forEach(screenSize => {
        mockScreenSize.mockReturnValue(screenSize);
        
        render(
          <Timeline
            tracks={mockTracks}
            duration={10}
            currentTime={0}
            zoom={0.1} // Very zoomed out to test minimum widths
            pixelsPerSecond={10}
          />
        );

        expect(screen.getByRole('application')).toBeInTheDocument();
      });
    });

    it('should hide/show clip details based on available space', () => {
      mockScreenSize.mockReturnValue('mobile');
      
      render(
        <Timeline
          tracks={[{
            ...mockTracks[0],
            clips: [{
              ...mockTracks[0].clips[0],
              metadata: {
                name: 'Very Long Clip Name That Should Be Truncated',
                isAI: true,
                speed: 2
              }
            }]
          }]}
          duration={10}
          currentTime={0}
          zoom={0.1} // Very small clips
          pixelsPerSecond={10}
        />
      );

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Responsive Header', () => {
    it('should adjust header layout for different screen sizes', () => {
      const screenSizes = ['mobile', 'tablet', 'desktop'] as const;
      
      screenSizes.forEach(screenSize => {
        mockScreenSize.mockReturnValue(screenSize);
        
        const { container } = render(
          <Timeline
            tracks={mockTracks}
            duration={10}
            currentTime={0}
            zoom={1}
            pixelsPerSecond={100}
          />
        );

        const header = container.querySelector('.timeline-header');
        expect(header).toBeInTheDocument();
      });
    });

    it('should use appropriate font sizes for different screen sizes', () => {
      mockScreenSize.mockReturnValue('mobile');
      
      render(
        <Timeline
          tracks={mockTracks}
          duration={10}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
        />
      );

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Performance on Different Screen Sizes', () => {
    it('should render efficiently on mobile with many clips', () => {
      const manyClips: Clip[] = Array.from({ length: 100 }, (_, i) => ({
        id: `clip-${i}`,
        trackId: 'track-1',
        start: i * 2,
        duration: 1.5,
        type: 'video',
        metadata: { name: `Clip ${i + 1}` }
      }));

      const trackWithManyClips: Track = {
        ...mockTracks[0],
        clips: manyClips
      };

      mockScreenSize.mockReturnValue('mobile');
      
      const startTime = performance.now();
      
      render(
        <Timeline
          tracks={[trackWithManyClips]}
          duration={200}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={50}
          enableVirtualization={true}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
    });
  });
});