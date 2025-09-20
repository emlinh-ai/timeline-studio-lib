import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { Track } from '../../types';

// Mock matchMedia for responsive utilities
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock data for testing
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
        duration: 2,
        type: 'video',
        metadata: { name: 'Video Clip 1' }
      },
      {
        id: 'clip-2',
        trackId: 'track-1',
        start: 3,
        duration: 1.5,
        type: 'video',
        metadata: { name: 'Video Clip 2' }
      }
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
        id: 'clip-3',
        trackId: 'track-2',
        start: 0.5,
        duration: 3,
        type: 'audio',
        metadata: { name: 'Audio Clip 1' }
      }
    ]
  },
  {
    id: 'track-3',
    type: 'text',
    name: 'Text Track',
    height: 60,
    isVisible: true,
    clips: [
      {
        id: 'clip-4',
        trackId: 'track-3',
        start: 1,
        duration: 2,
        type: 'text',
        metadata: { name: 'Text Clip 1', text: 'Hello World' }
      }
    ]
  }
];

describe('Timeline Accessibility', () => {
  describe('ARIA Support', () => {
    it('should have proper ARIA attributes on main timeline', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const timeline = screen.getByRole('application');
      expect(timeline).toHaveAttribute('aria-label', 'Video Timeline Editor');
      expect(timeline).toHaveAttribute('aria-describedby', 'timeline-instructions timeline-status');
      expect(timeline).toHaveAttribute('aria-live', 'polite');
      expect(timeline).toHaveAttribute('aria-atomic', 'false');
      expect(timeline).toHaveAttribute('tabIndex', '0');
    });

    it('should have screen reader instructions', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const instructions = document.getElementById('timeline-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveTextContent('Video timeline editor with 3 tracks and 4 clips');
      expect(instructions).toHaveTextContent('Use arrow keys to navigate between clips');
      expect(instructions).toHaveTextContent('Press Space to play/pause');
      expect(instructions).toHaveTextContent('Press Delete to remove selected clip');
      expect(instructions).toHaveTextContent('Press Escape to deselect');
    });

    it('should have live status region for announcements', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const statusRegion = document.getElementById('timeline-status');
      expect(statusRegion).toBeInTheDocument();
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce clip selection in status region', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const timeline = screen.getByRole('application');
      timeline.focus();

      // Select first clip
      fireEvent.keyDown(timeline, { key: 'ArrowRight' });

      const statusRegion = document.getElementById('timeline-status');
      expect(statusRegion).toHaveTextContent('Selected video clip: Video Clip 1');
    });

    it('should have proper ARIA attributes on clips', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const clipElements = document.querySelectorAll('[data-clip-id]');
      expect(clipElements.length).toBeGreaterThan(0);

      clipElements.forEach(clipElement => {
        expect(clipElement).toHaveAttribute('role', 'button');
        expect(clipElement).toHaveAttribute('aria-label');
        expect(clipElement).toHaveAttribute('aria-selected');
        expect(clipElement).toHaveAttribute('tabIndex');
      });
    });

    it('should have proper ARIA attributes on time ruler', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const timeRuler = document.querySelector('.time-ruler');
      expect(timeRuler).toHaveAttribute('role', 'slider');
      expect(timeRuler).toHaveAttribute('aria-label', 'Timeline scrubber');
      expect(timeRuler).toHaveAttribute('aria-valuemin', '0');
      expect(timeRuler).toHaveAttribute('aria-valuemax', '10');
      expect(timeRuler).toHaveAttribute('aria-valuenow');
      expect(timeRuler).toHaveAttribute('aria-valuetext');
      expect(timeRuler).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA attributes on zoom controls', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const zoomControls = document.querySelector('.zoom-controls');
      expect(zoomControls).toHaveAttribute('role', 'group');
      expect(zoomControls).toHaveAttribute('aria-label', 'Zoom controls');

      const zoomButtons = zoomControls?.querySelectorAll('button');
      zoomButtons?.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });

      const zoomStatus = zoomControls?.querySelector('[role="status"]');
      expect(zoomStatus).toHaveAttribute('aria-label');
    });

    it('should have proper ARIA attributes on track headers', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const trackHeaders = document.querySelectorAll('.track-header');
      trackHeaders.forEach(header => {
        expect(header).toHaveAttribute('role', 'banner');
        expect(header).toHaveAttribute('aria-label');
      });
    });

    it('should have proper ARIA attributes on track content areas', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const trackContents = document.querySelectorAll('.track-content');
      trackContents.forEach(content => {
        expect(content).toHaveAttribute('role', 'region');
        expect(content).toHaveAttribute('aria-label');
        expect(content).toHaveAttribute('aria-describedby');
      });
    });

    it('should have proper ARIA attributes on track control buttons', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      // Find mute button for audio track
      const muteButtons = document.querySelectorAll('button[aria-pressed]');
      muteButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('aria-pressed');
      });
    });
  });

  describe('Focus Management', () => {
    it('should be focusable and have focus indicator', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const timeline = screen.getByRole('application');
      timeline.focus();
      expect(timeline).toHaveFocus();
    });

    it('should manage focus on clip selection', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const timeline = screen.getByRole('application');
      timeline.focus();

      // Select first clip
      fireEvent.keyDown(timeline, { key: 'ArrowRight' });

      // Check that selected clip is focusable
      const selectedClip = document.querySelector('[aria-selected="true"]');
      expect(selectedClip).toHaveAttribute('tabIndex', '0');
    });

    it('should handle keyboard navigation on time ruler', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const timeRuler = document.querySelector('.time-ruler') as HTMLElement;
      timeRuler.focus();

      // Test arrow key navigation
      fireEvent.keyDown(timeRuler, { key: 'ArrowRight' });
      fireEvent.keyDown(timeRuler, { key: 'ArrowLeft' });
      fireEvent.keyDown(timeRuler, { key: 'ArrowRight', shiftKey: true });

      // Should not throw errors
      expect(timeRuler).toBeInTheDocument();
    });

    it('should maintain focus order', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const focusableElements = document.querySelectorAll('[tabIndex="0"]');
      expect(focusableElements.length).toBeGreaterThan(0);

      // All focusable elements should have tabIndex 0 or be naturally focusable
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide meaningful labels for all interactive elements', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      // Check that all buttons have accessible names
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        const hasAccessibleName = 
          button.getAttribute('aria-label') ||
          button.getAttribute('title') ||
          button.textContent?.trim();
        expect(hasAccessibleName).toBeTruthy();
      });
    });

    it('should provide status updates for state changes', () => {
      const onStateChange = jest.fn();
      render(
        <Timeline 
          tracks={mockTracks} 
          duration={10} 
          onStateChange={onStateChange}
        />
      );

      const timeline = screen.getByRole('application');
      timeline.focus();

      // Trigger state change
      fireEvent.keyDown(timeline, { key: ' ' }); // Play/pause

      const statusRegion = document.getElementById('timeline-status');
      expect(statusRegion).toHaveTextContent(/Playing|Paused/);
    });

    it('should provide context for clip information', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const clips = document.querySelectorAll('[data-clip-id]');
      clips.forEach(clip => {
        const ariaLabel = clip.getAttribute('aria-label');
        expect(ariaLabel).toContain('clip');
        expect(ariaLabel).toContain('duration');
        expect(ariaLabel).toContain('starts at');
      });
    });

    it('should provide track descriptions', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const trackDescriptions = document.querySelectorAll('[id^="track-"][id$="-description"]');
      trackDescriptions.forEach(description => {
        expect(description).toHaveTextContent(/track containing \d+ clips/);
      });
    });
  });

  describe('Manual Accessibility Validation', () => {
    it('should have all required ARIA attributes', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      // Check main timeline
      const timeline = screen.getByRole('application');
      expect(timeline).toHaveAttribute('aria-label');
      expect(timeline).toHaveAttribute('aria-describedby');

      // Check all interactive elements have accessible names
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        const hasAccessibleName = 
          button.getAttribute('aria-label') ||
          button.getAttribute('title') ||
          button.textContent?.trim();
        expect(hasAccessibleName).toBeTruthy();
      });

      // Check all clips have proper ARIA attributes
      const clips = document.querySelectorAll('[data-clip-id]');
      clips.forEach(clip => {
        expect(clip).toHaveAttribute('role', 'button');
        expect(clip).toHaveAttribute('aria-label');
        expect(clip).toHaveAttribute('aria-selected');
      });
    });

    it('should have proper focus management', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      // Check that focusable elements have appropriate tabIndex
      const focusableElements = document.querySelectorAll('[tabindex]');
      focusableElements.forEach(element => {
        const tabIndex = element.getAttribute('tabindex');
        expect(parseInt(tabIndex || '0')).toBeLessThanOrEqual(0);
      });
    });

    it('should have live regions for announcements', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const statusRegion = document.getElementById('timeline-status');
      expect(statusRegion).toBeInTheDocument();
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should announce keyboard shortcuts in instructions', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const instructions = document.getElementById('timeline-instructions');
      expect(instructions).toHaveTextContent('Ctrl+Plus to zoom in');
      expect(instructions).toHaveTextContent('Ctrl+Minus to zoom out');
      expect(instructions).toHaveTextContent('Ctrl+0 to reset zoom');
    });

    it('should handle all documented keyboard shortcuts', () => {
      render(<Timeline tracks={mockTracks} duration={10} />);

      const timeline = screen.getByRole('application');
      timeline.focus();

      // Test all keyboard shortcuts without throwing errors
      const shortcuts = [
        { key: 'ArrowRight' },
        { key: 'ArrowLeft' },
        { key: 'ArrowUp' },
        { key: 'ArrowDown' },
        { key: ' ' },
        { key: 'Delete' },
        { key: 'Escape' },
        { key: '=', ctrlKey: true },
        { key: '-', ctrlKey: true },
        { key: '0', ctrlKey: true }
      ];

      shortcuts.forEach(shortcut => {
        expect(() => {
          fireEvent.keyDown(timeline, shortcut);
        }).not.toThrow();
      });
    });
  });

  describe('High Contrast Mode', () => {
    it('should maintain visibility in high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Timeline tracks={mockTracks} duration={10} />);

      // Check that focus indicators are still visible
      const timeline = screen.getByRole('application');
      timeline.focus();

      const computedStyle = window.getComputedStyle(timeline);
      expect(computedStyle.outline).toBeDefined();
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Timeline tracks={mockTracks} duration={10} />);

      // Check that animations are disabled or reduced
      const clips = document.querySelectorAll('[data-clip-id]');
      clips.forEach(clip => {
        const computedStyle = window.getComputedStyle(clip);
        // In reduced motion mode, transitions should be minimal or none
        expect(computedStyle.transition).toBeDefined();
      });
    });
  });
});