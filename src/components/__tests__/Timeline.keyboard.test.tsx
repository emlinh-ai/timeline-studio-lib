import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      },
      {
        id: 'clip-4',
        trackId: 'track-2',
        start: 4,
        duration: 2,
        type: 'audio',
        metadata: { name: 'Audio Clip 2' }
      }
    ]
  }
];

describe('Timeline Keyboard Navigation', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(<Timeline tracks={mockTracks} duration={10} />);

    const timeline = screen.getByRole('application');
    expect(timeline).toHaveAttribute('aria-label', 'Video Timeline Editor');
    expect(timeline).toHaveAttribute('aria-describedby', 'timeline-instructions timeline-status');
    expect(timeline).toHaveAttribute('tabIndex', '0');

    // Check for screen reader instructions
    const instructions = document.getElementById('timeline-instructions');
    expect(instructions).toBeInTheDocument();
    expect(instructions).toHaveTextContent('Use arrow keys to navigate between clips');
  });

  it('should focus timeline container when clicked', async () => {
    render(<Timeline tracks={mockTracks} duration={10} />);

    const timeline = screen.getByRole('application');
    await user.click(timeline);

    expect(timeline).toHaveFocus();
  });

  it('should select first clip when pressing right arrow with no selection', async () => {
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

    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });
  });

  it('should navigate between clips using arrow keys', async () => {
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

    // Select first clip
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });

    // Navigate to next clip in same track
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-2'
        })
      );
    });

    // Navigate back to previous clip
    await act(async () => {
      await user.keyboard('{ArrowLeft}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });
  });

  it('should navigate vertically between tracks', async () => {
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

    // Select first clip (clip-1 at start time 0)
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });

    // Navigate down to clip in same column (clip-3 at start time 0.5, close to 0)
    await act(async () => {
      await user.keyboard('{ArrowDown}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-3'
        })
      );
    });

    // Navigate back up
    await act(async () => {
      await user.keyboard('{ArrowUp}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });
  });

  it('should toggle play/pause with space key', async () => {
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

    await act(async () => {
      await user.keyboard('{ }'); // Space key
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isPlaying: true
        })
      );
    });

    // Press space again to pause
    await act(async () => {
      await user.keyboard('{ }');
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isPlaying: false
        })
      );
    });
  });

  it('should remove selected clip with Delete key', async () => {
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

    // Select first clip
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });

    // Remove the clip
    await act(async () => {
      await user.keyboard('{Delete}');
    });

    await waitFor(() => {
      // Check that the clip was removed from the tracks
      const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1];
      const updatedState = lastCall[0];
      const videoTrack = updatedState.tracks.find((t: Track) => t.id === 'track-1');
      expect(videoTrack?.clips).not.toContainEqual(
        expect.objectContaining({ id: 'clip-1' })
      );
    });
  });

  it('should remove selected clip with Backspace key', async () => {
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

    // Select first clip
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });

    // Remove the clip with Backspace
    await act(async () => {
      await user.keyboard('{Backspace}');
    });

    await waitFor(() => {
      // Check that the clip was removed from the tracks
      const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1];
      const updatedState = lastCall[0];
      const videoTrack = updatedState.tracks.find((t: Track) => t.id === 'track-1');
      expect(videoTrack?.clips).not.toContainEqual(
        expect.objectContaining({ id: 'clip-1' })
      );
    });
  });

  it('should deselect clip with Escape key', async () => {
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

    // Select first clip
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });

    // Deselect with Escape
    await act(async () => {
      await user.keyboard('{Escape}');
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: undefined
        })
      );
    });
  });

  it('should handle zoom shortcuts', async () => {
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

    // Zoom in
    await act(async () => {
      await user.keyboard('{Control>}={/Control}');
    });
    
    await waitFor(() => {
      expect(onZoom).toHaveBeenCalledWith(
        expect.objectContaining({
          newScale: 1.5,
          oldScale: 1
        })
      );
    });

    // Zoom out
    await act(async () => {
      await user.keyboard('{Control>}-{/Control}');
    });
    
    await waitFor(() => {
      expect(onZoom).toHaveBeenCalledWith(
        expect.objectContaining({
          oldScale: expect.any(Number)
        })
      );
    });

    // Zoom reset
    await act(async () => {
      await user.keyboard('{Control>}0{/Control}');
    });
    
    await waitFor(() => {
      expect(onZoom).toHaveBeenCalledWith(
        expect.objectContaining({
          newScale: 1
        })
      );
    });
  });

  it('should not handle keyboard events when focused on input elements', async () => {
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
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });

    // Should not select any clip
    expect(onStateChange).not.toHaveBeenCalledWith(
      expect.objectContaining({
        selectedClipId: expect.any(String)
      })
    );
  });

  it('should show clip-specific instructions when clip is selected', async () => {
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

    // Initially no clip instructions
    expect(document.getElementById('clip-instructions')).not.toBeInTheDocument();

    // Select first clip
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });

    // Now clip instructions should be present
    await waitFor(() => {
      const clipInstructions = document.getElementById('clip-instructions');
      expect(clipInstructions).toBeInTheDocument();
      expect(clipInstructions).toHaveTextContent('Selected clip. Use arrow keys to navigate');
    });
  });

  it('should focus selected clip element', async () => {
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

    // Select first clip
    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });
    
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedClipId: 'clip-1'
        })
      );
    });

    // Check that the clip element gets focus
    await waitFor(() => {
      const clipElement = document.querySelector('[data-clip-id="clip-1"]');
      expect(clipElement).toHaveFocus();
    });
  });

  it('should handle Tab navigation properly', async () => {
    render(<Timeline tracks={mockTracks} duration={10} />);

    const timeline = screen.getByRole('application');
    
    // Tab should focus the timeline
    await user.tab();
    expect(timeline).toHaveFocus();

    // Additional tabs should move focus away from timeline
    await user.tab();
    expect(timeline).not.toHaveFocus();
  });
});