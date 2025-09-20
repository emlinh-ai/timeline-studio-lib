import { timelineReducer, createInitialState, timelineActions } from '../reducer';
import { TimelineState, Clip, Track } from '../../types';
import { serializeTimelineState, deserializeTimelineState, areStatesEqual } from '../serialization';

describe('Undo/Redo State Consistency', () => {
  let initialState: ReturnType<typeof createInitialState>;
  let track: Track;
  let clip1: Clip;
  let clip2: Clip;

  beforeEach(() => {
    track = {
      id: 'track-1',
      type: 'video',
      name: 'Video Track',
      height: 100,
      isVisible: true,
      clips: []
    };

    clip1 = {
      id: 'clip-1',
      trackId: 'track-1',
      start: 0,
      duration: 5,
      type: 'video',
      metadata: {
        name: 'Clip 1'
      }
    };

    clip2 = {
      id: 'clip-2',
      trackId: 'track-1',
      start: 10,
      duration: 3,
      type: 'video',
      metadata: {
        name: 'Clip 2'
      }
    };

    initialState = createInitialState();
  });

  describe('Complex undo/redo scenarios', () => {
    it('should maintain state consistency through multiple operations', () => {
      // Build up a complex state
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.addClip(clip2));
      state = timelineReducer(state, timelineActions.selectClip(clip1.id));
      state = timelineReducer(state, timelineActions.updateClip(clip1.id, { start: 2 }));
      state = timelineReducer(state, timelineActions.setDuration(20));

      const complexState = state;

      // Undo all operations
      state = timelineReducer(state, timelineActions.undo()); // Undo setDuration
      state = timelineReducer(state, timelineActions.undo()); // Undo updateClip
      state = timelineReducer(state, timelineActions.undo()); // Undo addClip(clip2)
      state = timelineReducer(state, timelineActions.undo()); // Undo addClip(clip1)
      state = timelineReducer(state, timelineActions.undo()); // Undo addTrack

      // Should be back to initial state
      expect(state.present).toEqual(initialState.present);

      // Redo all operations
      state = timelineReducer(state, timelineActions.redo()); // Redo addTrack
      state = timelineReducer(state, timelineActions.redo()); // Redo addClip(clip1)
      state = timelineReducer(state, timelineActions.redo()); // Redo addClip(clip2)
      state = timelineReducer(state, timelineActions.redo()); // Redo updateClip
      state = timelineReducer(state, timelineActions.redo()); // Redo setDuration

      // Should be back to complex state
      expect(state.present).toEqual(complexState.present);
    });

    it('should handle interleaved undo/redo operations', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      const stateAfterTrack = state;

      state = timelineReducer(state, timelineActions.addClip(clip1));
      const stateAfterClip1 = state;

      state = timelineReducer(state, timelineActions.addClip(clip2));
      const stateAfterClip2 = state;

      // Undo twice
      state = timelineReducer(state, timelineActions.undo());
      state = timelineReducer(state, timelineActions.undo());
      expect(state.present).toEqual(stateAfterTrack.present);

      // Redo once
      state = timelineReducer(state, timelineActions.redo());
      expect(state.present).toEqual(stateAfterClip1.present);

      // Add new operation (should clear redo stack)
      state = timelineReducer(state, timelineActions.updateClip(clip1.id, { duration: 8 }));
      expect(state.future).toHaveLength(0);

      // Try to redo (should do nothing)
      const stateBeforeRedo = state;
      state = timelineReducer(state, timelineActions.redo());
      expect(state).toBe(stateBeforeRedo);
    });

    it('should preserve state integrity during undo/redo', () => {
      // Create a state with multiple tracks and clips
      const track2: Track = {
        id: 'track-2',
        type: 'audio',
        name: 'Audio Track',
        height: 80,
        isVisible: true,
        clips: []
      };

      const audioClip: Clip = {
        id: 'audio-clip',
        trackId: 'track-2',
        start: 5,
        duration: 10,
        type: 'audio'
      };

      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addTrack(track2));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.addClip(audioClip));
      state = timelineReducer(state, timelineActions.selectClip(clip1.id));

      const complexState = state;

      // Verify state integrity
      expect(complexState.present.tracks).toHaveLength(2);
      expect(complexState.present.tracks[0].clips).toHaveLength(1);
      expect(complexState.present.tracks[1].clips).toHaveLength(1);
      expect(complexState.present.selectedClipId).toBe(clip1.id);

      // Undo and verify each step
      state = timelineReducer(state, timelineActions.undo()); // Undo addClip(audioClip)
      expect(state.present.tracks[1].clips).toHaveLength(0);
      expect(state.present.tracks[0].clips).toHaveLength(1);

      state = timelineReducer(state, timelineActions.undo()); // Undo addClip(clip1)
      expect(state.present.tracks[0].clips).toHaveLength(0);
      expect(state.present.tracks[1].clips).toHaveLength(0);

      state = timelineReducer(state, timelineActions.undo()); // Undo addTrack(track2)
      expect(state.present.tracks).toHaveLength(1);
      expect(state.present.tracks[0].id).toBe(track.id);

      // Redo and verify
      state = timelineReducer(state, timelineActions.redo()); // Redo addTrack(track2)
      expect(state.present.tracks).toHaveLength(2);

      state = timelineReducer(state, timelineActions.redo()); // Redo addClip(clip1)
      expect(state.present.tracks[0].clips).toHaveLength(1);

      state = timelineReducer(state, timelineActions.redo()); // Redo addClip(audioClip)
      expect(state.present.tracks[1].clips).toHaveLength(1);
      expect(state.present).toEqual(complexState.present);
    });
  });

  describe('State serialization consistency', () => {
    it('should maintain consistency after serialization/deserialization', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.addClip(clip2));

      // Serialize and deserialize the present state
      const serialized = serializeTimelineState(state.present);
      const deserialized = deserializeTimelineState(serialized);

      expect(areStatesEqual(state.present, deserialized)).toBe(true);

      // Import the deserialized state
      const importedState = timelineReducer(state, timelineActions.importState(deserialized));

      // Should be able to undo to previous state
      const undoneState = timelineReducer(importedState, timelineActions.undo());
      expect(undoneState.present).toEqual(state.present);
    });

    it('should handle undo/redo after state import', () => {
      // Create initial state with history
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));

      const stateBeforeImport = state;

      // Create a different state to import
      const importState: TimelineState = {
        tracks: [{
          ...track,
          clips: [clip2]
        }],
        currentTime: 15,
        duration: 30,
        zoom: 2,
        isPlaying: true
      };

      // Import the state
      state = timelineReducer(state, timelineActions.importState(importState));

      // Should be able to undo to previous state
      const undoneState = timelineReducer(state, timelineActions.undo());
      expect(undoneState.present).toEqual(stateBeforeImport.present);

      // Should be able to redo to imported state
      const redoneState = timelineReducer(undoneState, timelineActions.redo());
      expect(redoneState.present).toEqual(importState);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle undo when clip is selected and then removed', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.selectClip(clip1.id));
      
      expect(state.present.selectedClipId).toBe(clip1.id);

      state = timelineReducer(state, timelineActions.removeClip(clip1.id));
      expect(state.present.selectedClipId).toBeUndefined();

      // Undo remove clip
      state = timelineReducer(state, timelineActions.undo());
      expect(state.present.selectedClipId).toBe(clip1.id);
      expect(state.present.tracks[0].clips).toHaveLength(1);
    });

    it('should handle undo when track is removed with selected clip', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.selectClip(clip1.id));
      
      expect(state.present.selectedClipId).toBe(clip1.id);

      state = timelineReducer(state, timelineActions.removeTrack(track.id));
      expect(state.present.selectedClipId).toBeUndefined();
      expect(state.present.tracks).toHaveLength(0);

      // Undo remove track
      state = timelineReducer(state, timelineActions.undo());
      expect(state.present.selectedClipId).toBe(clip1.id);
      expect(state.present.tracks).toHaveLength(1);
      expect(state.present.tracks[0].clips).toHaveLength(1);
    });

    it('should handle duration updates correctly in undo/redo', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1)); // duration becomes 5
      
      expect(state.present.duration).toBe(5);

      state = timelineReducer(state, timelineActions.addClip(clip2)); // duration becomes 13 (clip2.start + clip2.duration)
      expect(state.present.duration).toBe(13);

      // Undo adding clip2
      state = timelineReducer(state, timelineActions.undo());
      expect(state.present.duration).toBe(5); // Should revert to previous duration

      // Redo adding clip2
      state = timelineReducer(state, timelineActions.redo());
      expect(state.present.duration).toBe(13); // Should restore duration
    });

    it('should handle clip updates that affect duration', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      
      expect(state.present.duration).toBe(5);

      // Update clip to extend beyond current duration
      state = timelineReducer(state, timelineActions.updateClip(clip1.id, { 
        start: 10, 
        duration: 20 
      }));
      expect(state.present.duration).toBe(30);

      // Undo update
      state = timelineReducer(state, timelineActions.undo());
      expect(state.present.duration).toBe(5);
      expect(state.present.tracks[0].clips[0].start).toBe(0);
      expect(state.present.tracks[0].clips[0].duration).toBe(5);

      // Redo update
      state = timelineReducer(state, timelineActions.redo());
      expect(state.present.duration).toBe(30);
      expect(state.present.tracks[0].clips[0].start).toBe(10);
      expect(state.present.tracks[0].clips[0].duration).toBe(20);
    });

    it('should maintain clip sorting after undo/redo', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1)); // start: 0
      state = timelineReducer(state, timelineActions.addClip(clip2)); // start: 10
      
      // Clips should be sorted
      expect(state.present.tracks[0].clips[0].start).toBe(0);
      expect(state.present.tracks[0].clips[1].start).toBe(10);

      // Update first clip to start later
      state = timelineReducer(state, timelineActions.updateClip(clip1.id, { start: 15 }));
      
      // Clips should be re-sorted
      expect(state.present.tracks[0].clips[0].id).toBe(clip2.id); // start: 10
      expect(state.present.tracks[0].clips[1].id).toBe(clip1.id); // start: 15

      // Undo update
      state = timelineReducer(state, timelineActions.undo());
      
      // Should restore original sorting
      expect(state.present.tracks[0].clips[0].id).toBe(clip1.id); // start: 0
      expect(state.present.tracks[0].clips[1].id).toBe(clip2.id); // start: 10
    });
  });

  describe('History limits and memory management', () => {
    it('should not add non-historical actions to history', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      const historyLengthAfterTrack = state.past.length;

      // These actions should not add to history
      state = timelineReducer(state, timelineActions.selectClip('non-existent')); // Error case
      state = timelineReducer(state, timelineActions.setCurrentTime(10));
      state = timelineReducer(state, timelineActions.setZoom(2));
      state = timelineReducer(state, timelineActions.setPlaying(true));

      expect(state.past.length).toBe(historyLengthAfterTrack);
    });

    it('should clear future when new historical action is performed', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.addClip(clip2));

      // Undo twice to create future history
      state = timelineReducer(state, timelineActions.undo());
      state = timelineReducer(state, timelineActions.undo());
      
      expect(state.future.length).toBe(2);

      // Perform new action
      state = timelineReducer(state, timelineActions.setDuration(100));
      
      expect(state.future.length).toBe(0);
    });

    it('should handle state reset correctly', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      
      expect(state.past.length).toBeGreaterThan(0);

      const newState: TimelineState = {
        tracks: [],
        currentTime: 50,
        duration: 200,
        zoom: 3,
        isPlaying: true
      };

      state = timelineReducer(state, timelineActions.resetState(newState));
      
      expect(state.present).toEqual(newState);
      expect(state.past.length).toBe(0);
      expect(state.future.length).toBe(0);
    });

    it('should handle clear history action', () => {
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.undo());
      
      expect(state.past.length).toBeGreaterThan(0);
      expect(state.future.length).toBeGreaterThan(0);

      state = timelineReducer(state, timelineActions.clearHistory());
      
      expect(state.past.length).toBe(0);
      expect(state.future.length).toBe(0);
      // Present state should remain unchanged
      expect(state.present.tracks).toHaveLength(1);
      expect(state.present.tracks[0].clips).toHaveLength(0);
    });
  });
});