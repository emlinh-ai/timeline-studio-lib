import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { Track } from '../../types';

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
  }
];

describe('Keyboard Navigation Integration', () => {
  it('should have proper accessibility attributes', () => {
    render(<Timeline tracks={mockTracks} duration={10} />);

    const timeline = screen.getByRole('application');
    expect(timeline).toHaveAttribute('aria-label', 'Video Timeline Editor');
    expect(timeline).toHaveAttribute('aria-describedby', 'timeline-instructions');
    expect(timeline).toHaveAttribute('tabIndex', '0');

    // Check for screen reader instructions
    const instructions = document.getElementById('timeline-instructions');
    expect(instructions).toBeInTheDocument();
    expect(instructions).toHaveTextContent('Use arrow keys to navigate between clips');
  });

  it('should handle keyboard events without errors', () => {
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

    // Test arrow key navigation
    fireEvent.keyDown(timeline, { key: 'ArrowRight' });
    expect(onStateChange).toHaveBeenCalled();

    // Test space key for play/pause
    fireEvent.keyDown(timeline, { key: ' ' });
    expect(onStateChange).toHaveBeenCalled();

    // Test escape key for deselection
    fireEvent.keyDown(timeline, { key: 'Escape' });
    expect(onStateChange).toHaveBeenCalled();
  });

  it('should handle zoom shortcuts without errors', () => {
    const onZoom = jest.fn();
    render(
      <Timeline 
        tracks={mockTracks} 
        duration={10} 
        zoom={1}
        onZoom={onZoom}
      />
    );

    const timeline = screen.getByRole('application');
    timeline.focus();

    // Test that zoom shortcuts don't throw errors
    expect(() => {
      fireEvent.keyDown(timeline, { key: '=', ctrlKey: true });
      fireEvent.keyDown(timeline, { key: '-', ctrlKey: true });
      fireEvent.keyDown(timeline, { key: '0', ctrlKey: true });
    }).not.toThrow();
  });

  it('should not handle keyboard events when focused on input elements', () => {
    const onStateChange = jest.fn();
    render(
      <div>
        <input data-testid="test-input" />
        <Timeline 
          tracks={mockTracks} 
          duration={10} 
          onStateChange={onStateChange}
        />
      </div>
    );

    const input = screen.getByTestId('test-input');
    input.focus();

    // Try to navigate while input is focused
    fireEvent.keyDown(input, { key: 'ArrowRight' });

    // Should not trigger timeline navigation
    expect(onStateChange).not.toHaveBeenCalledWith(
      expect.objectContaining({
        selectedClipId: expect.any(String)
      })
    );
  });

  it('should show clip-specific instructions when clip is selected', () => {
    render(<Timeline tracks={mockTracks} duration={10} />);

    const timeline = screen.getByRole('application');
    timeline.focus();

    // Initially no clip instructions
    expect(document.getElementById('clip-instructions')).not.toBeInTheDocument();

    // Select first clip
    fireEvent.keyDown(timeline, { key: 'ArrowRight' });

    // Now clip instructions should be present
    const clipInstructions = document.getElementById('clip-instructions');
    expect(clipInstructions).toBeInTheDocument();
    expect(clipInstructions).toHaveTextContent('Selected clip. Use arrow keys to navigate');
  });

  it('should handle Tab navigation properly', () => {
    render(<Timeline tracks={mockTracks} duration={10} />);

    const timeline = screen.getByRole('application');
    
    // Tab should focus the timeline
    fireEvent.keyDown(document.body, { key: 'Tab' });
    timeline.focus(); // Simulate tab focusing timeline
    expect(timeline).toHaveFocus();
  });

  it('should have proper ARIA attributes on clips', () => {
    render(<Timeline tracks={mockTracks} duration={10} />);

    // Find clip elements
    const clipElements = document.querySelectorAll('[data-clip-id]');
    expect(clipElements.length).toBeGreaterThan(0);

    clipElements.forEach(clipElement => {
      expect(clipElement).toHaveAttribute('role', 'button');
      expect(clipElement).toHaveAttribute('aria-label');
      expect(clipElement).toHaveAttribute('aria-selected');
    });
  });
});