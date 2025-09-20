import React from 'react';
import { render } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { Track } from '../../types';

// Mock matchMedia for responsive utilities
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

// Mock ResizeObserver and IntersectionObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

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
      }
    ]
  }
];

describe('Timeline Axe Accessibility Tests', () => {
  // Skip axe tests if axe-core is not available
  const axeAvailable = (() => {
    try {
      require('axe-core');
      return true;
    } catch {
      return false;
    }
  })();

  const runAxeTest = async (container: HTMLElement) => {
    if (!axeAvailable) {
      console.warn('axe-core not available, skipping axe accessibility tests');
      return;
    }

    const axe = require('axe-core');
    const results = await axe.run(container);
    
    if (results.violations.length > 0) {
      const violationMessages = results.violations.map((violation: any) => 
        `${violation.id}: ${violation.description}\n  ${violation.nodes.map((node: any) => node.target).join(', ')}`
      ).join('\n');
      
      throw new Error(`Accessibility violations found:\n${violationMessages}`);
    }
  };

  it('should pass axe accessibility tests', async () => {
    const { container } = render(<Timeline tracks={mockTracks} duration={10} />);
    await runAxeTest(container);
  });

  it('should pass axe tests with empty timeline', async () => {
    const { container } = render(<Timeline tracks={[]} duration={10} />);
    await runAxeTest(container);
  });

  it('should pass axe tests with multiple tracks', async () => {
    const multiTrackData: Track[] = [
      ...mockTracks,
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
            start: 1,
            duration: 3,
            type: 'audio',
            metadata: { name: 'Audio Clip 1' }
          }
        ]
      }
    ];

    const { container } = render(<Timeline tracks={multiTrackData} duration={10} />);
    await runAxeTest(container);
  });
});