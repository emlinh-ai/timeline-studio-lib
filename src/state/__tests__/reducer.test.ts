import { timelineReducer, createInitialState, timelineActions } from '../reducer';
import { TimelineActionType } from '../types';
import { Clip, Track, TimelineState } from '../../types';

describe('timelineReducer', () => {
  let initialState: ReturnType<typeof createInitialState>;
  
  beforeEach(() => {
    initialState = createInitialState();
  });

  describe('createInitialState', () => {
    it('should create valid initial state with defaults', () => {
      const state = createInitialState();
      
      expect(state.present).toEqual({
        tracks: [],
        currentTime: 0,
        duration: 0,
        zoom: 1,
        selectedClipId: undefined,
        isPlaying: false
      });
      expect(state.past).toEqual([]);
      expect(state.future).toEqual([]);
    });

    it('should merge provided initial state', () => {
      const customState = {
        currentTime: 10,
        duration: 100,
        zoom: 2
      };
      
      const state = createInitialState(customState);
      
      expect(state.present).toEqual({
        tracks: [],
        currentTime: 10,
        duration: 100,
        zoom: 2,
        selectedClipId: undefined,
        isPlaying: false
      });
    });
  });

  describe('ADD_CLIP', () => {
    let track: Track;
    let clip: Clip;

    beforeEach(() => {
      track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      clip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video'
      };

      // Add track first
      initialState = timelineReducer(initialState, timelineActions.addTrack(track));
    });

    it('should add clip to existing track', () => {
      const action = timelineActions.addClip(clip);
      const newState = timelineReducer(initialState, action);

      expect(newState.present.tracks[0].clips).toHaveLength(1);
      expect(newState.present.tracks[0].clips[0]).toEqual(clip);
      expect(newState.past).toHaveLength(2); // addTrack + addClip
    });

    it('should update duration when clip extends beyond current duration', () => {
      const longClip = { ...clip, start: 10, duration: 20 };
      const action = timelineActions.addClip(longClip);
      const newState = timelineReducer(initialState, action);

      expect(newState.present.duration).toBe(30); // start + duration
    });

    it('should sort clips by start time', () => {
      const clip1 = { ...clip, id: 'clip-1', start: 10 };
      const clip2 = { ...clip, id: 'clip-2', start: 5 };
      
      let state = timelineReducer(initialState, timelineActions.addClip(clip1));
      state = timelineReducer(state, timelineActions.addClip(clip2));

      const clips = state.present.tracks[0].clips;
      expect(clips[0].start).toBe(5);
      expect(clips[1].start).toBe(10);
    });

    it('should throw error for non-existent track', () => {
      const invalidClip = { ...clip, trackId: 'non-existent' };
      const action = timelineActions.addClip(invalidClip);
      
      const newState = timelineReducer(initialState, action);
      // Should return original state on error
      expect(newState).toBe(initialState);
    });

    it('should throw error for duplicate clip ID', () => {
      let state = timelineReducer(initialState, timelineActions.addClip(clip));
      const duplicateClip = { ...clip, start: 10 };
      
      const newState = timelineReducer(state, timelineActions.addClip(duplicateClip));
      // Should return current state on error
      expect(newState).toBe(state);
    });

    it('should validate clip data', () => {
      const invalidClip = { ...clip, duration: -1 };
      const action = timelineActions.addClip(invalidClip);
      
      const newState = timelineReducer(initialState, action);
      expect(newState).toBe(initialState);
    });
  });

  describe('REMOVE_CLIP', () => {
    let track: Track;
    let clip: Clip;
    let stateWithClip: ReturnType<typeof createInitialState>;

    beforeEach(() => {
      track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      clip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video'
      };

      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      stateWithClip = timelineReducer(state, timelineActions.addClip(clip));
    });

    it('should remove clip from track', () => {
      const action = timelineActions.removeClip('clip-1');
      const newState = timelineReducer(stateWithClip, action);

      expect(newState.present.tracks[0].clips).toHaveLength(0);
      expect(newState.past).toHaveLength(3); // addTrack + addClip + removeClip
    });

    it('should clear selectedClipId if removed clip was selected', () => {
      let state = timelineReducer(stateWithClip, timelineActions.selectClip('clip-1'));
      expect(state.present.selectedClipId).toBe('clip-1');

      state = timelineReducer(state, timelineActions.removeClip('clip-1'));
      expect(state.present.selectedClipId).toBeUndefined();
    });

    it('should throw error for non-existent clip', () => {
      const action = timelineActions.removeClip('non-existent');
      const newState = timelineReducer(stateWithClip, action);
      
      expect(newState).toBe(stateWithClip);
    });
  });

  describe('UPDATE_CLIP', () => {
    let track: Track;
    let clip: Clip;
    let stateWithClip: ReturnType<typeof createInitialState>;

    beforeEach(() => {
      track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      clip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video'
      };

      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      stateWithClip = timelineReducer(state, timelineActions.addClip(clip));
    });

    it('should update clip properties', () => {
      const updates = { start: 10, duration: 8 };
      const action = timelineActions.updateClip('clip-1', updates);
      const newState = timelineReducer(stateWithClip, action);

      const updatedClip = newState.present.tracks[0].clips[0];
      expect(updatedClip.start).toBe(10);
      expect(updatedClip.duration).toBe(8);
      expect(updatedClip.id).toBe('clip-1'); // Should preserve other properties
    });

    it('should update duration when clip extends beyond current duration', () => {
      const updates = { start: 20, duration: 15 };
      const action = timelineActions.updateClip('clip-1', updates);
      const newState = timelineReducer(stateWithClip, action);

      expect(newState.present.duration).toBe(35); // start + duration
    });

    it('should re-sort clips after update', () => {
      // Add another clip
      const clip2 = { ...clip, id: 'clip-2', start: 15 };
      let state = timelineReducer(stateWithClip, timelineActions.addClip(clip2));

      // Update first clip to start later
      const updates = { start: 20 };
      state = timelineReducer(state, timelineActions.updateClip('clip-1', updates));

      const clips = state.present.tracks[0].clips;
      expect(clips[0].id).toBe('clip-2'); // Should be first now
      expect(clips[1].id).toBe('clip-1'); // Should be second
    });

    it('should throw error for non-existent clip', () => {
      const action = timelineActions.updateClip('non-existent', { start: 10 });
      const newState = timelineReducer(stateWithClip, action);
      
      expect(newState).toBe(stateWithClip);
    });

    it('should validate update data', () => {
      const invalidUpdates = { duration: -1 };
      const action = timelineActions.updateClip('clip-1', invalidUpdates);
      const newState = timelineReducer(stateWithClip, action);
      
      expect(newState).toBe(stateWithClip);
    });

    it('should not allow changing clip ID', () => {
      const updates = { id: 'new-id' };
      const action = timelineActions.updateClip('clip-1', updates);
      const newState = timelineReducer(stateWithClip, action);
      
      expect(newState).toBe(stateWithClip);
    });
  });

  describe('SELECT_CLIP and DESELECT_CLIP', () => {
    let track: Track;
    let clip: Clip;
    let stateWithClip: ReturnType<typeof createInitialState>;

    beforeEach(() => {
      track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      clip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video'
      };

      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      stateWithClip = timelineReducer(state, timelineActions.addClip(clip));
    });

    it('should select clip', () => {
      const action = timelineActions.selectClip('clip-1');
      const newState = timelineReducer(stateWithClip, action);

      expect(newState.present.selectedClipId).toBe('clip-1');
      // Should not add to history for selection changes
      expect(newState.past).toHaveLength(stateWithClip.past.length);
    });

    it('should deselect clip', () => {
      let state = timelineReducer(stateWithClip, timelineActions.selectClip('clip-1'));
      state = timelineReducer(state, timelineActions.deselectClip());

      expect(state.present.selectedClipId).toBeUndefined();
    });

    it('should throw error for non-existent clip selection', () => {
      const action = timelineActions.selectClip('non-existent');
      const newState = timelineReducer(stateWithClip, action);
      
      expect(newState).toBe(stateWithClip);
    });
  });

  describe('ADD_TRACK', () => {
    it('should add track to timeline', () => {
      const track: Track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      const action = timelineActions.addTrack(track);
      const newState = timelineReducer(initialState, action);

      expect(newState.present.tracks).toHaveLength(1);
      expect(newState.present.tracks[0]).toEqual(track);
      expect(newState.past).toHaveLength(1);
    });

    it('should throw error for duplicate track ID', () => {
      const track: Track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      const newState = timelineReducer(state, timelineActions.addTrack(track));
      
      expect(newState).toBe(state);
    });

    it('should validate track data', () => {
      const invalidTrack = {
        id: 'track-1',
        type: 'invalid' as any,
        name: 'Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      const action = timelineActions.addTrack(invalidTrack);
      const newState = timelineReducer(initialState, action);
      
      expect(newState).toBe(initialState);
    });
  });

  describe('REMOVE_TRACK', () => {
    let track: Track;
    let stateWithTrack: ReturnType<typeof createInitialState>;

    beforeEach(() => {
      track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      stateWithTrack = timelineReducer(initialState, timelineActions.addTrack(track));
    });

    it('should remove track from timeline', () => {
      const action = timelineActions.removeTrack('track-1');
      const newState = timelineReducer(stateWithTrack, action);

      expect(newState.present.tracks).toHaveLength(0);
      expect(newState.past).toHaveLength(2); // addTrack + removeTrack
    });

    it('should clear selectedClipId if clip belongs to removed track', () => {
      const clip: Clip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video'
      };

      let state = timelineReducer(stateWithTrack, timelineActions.addClip(clip));
      state = timelineReducer(state, timelineActions.selectClip('clip-1'));
      expect(state.present.selectedClipId).toBe('clip-1');

      state = timelineReducer(state, timelineActions.removeTrack('track-1'));
      expect(state.present.selectedClipId).toBeUndefined();
    });

    it('should throw error for non-existent track', () => {
      const action = timelineActions.removeTrack('non-existent');
      const newState = timelineReducer(stateWithTrack, action);
      
      expect(newState).toBe(stateWithTrack);
    });
  });

  describe('UPDATE_TRACK', () => {
    let track: Track;
    let stateWithTrack: ReturnType<typeof createInitialState>;

    beforeEach(() => {
      track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      stateWithTrack = timelineReducer(initialState, timelineActions.addTrack(track));
    });

    it('should update track properties', () => {
      const updates = { name: 'Updated Track', height: 150 };
      const action = timelineActions.updateTrack('track-1', updates);
      const newState = timelineReducer(stateWithTrack, action);

      const updatedTrack = newState.present.tracks[0];
      expect(updatedTrack.name).toBe('Updated Track');
      expect(updatedTrack.height).toBe(150);
      expect(updatedTrack.id).toBe('track-1'); // Should preserve other properties
    });

    it('should throw error for non-existent track', () => {
      const action = timelineActions.updateTrack('non-existent', { name: 'New Name' });
      const newState = timelineReducer(stateWithTrack, action);
      
      expect(newState).toBe(stateWithTrack);
    });

    it('should validate update data', () => {
      const invalidUpdates = { height: -1 };
      const action = timelineActions.updateTrack('track-1', invalidUpdates);
      const newState = timelineReducer(stateWithTrack, action);
      
      expect(newState).toBe(stateWithTrack);
    });
  });

  describe('REORDER_TRACKS', () => {
    let tracks: Track[];
    let stateWithTracks: ReturnType<typeof createInitialState>;

    beforeEach(() => {
      tracks = [
        {
          id: 'track-1',
          type: 'video',
          name: 'Track 1',
          height: 100,
          isVisible: true,
          clips: []
        },
        {
          id: 'track-2',
          type: 'audio',
          name: 'Track 2',
          height: 80,
          isVisible: true,
          clips: []
        },
        {
          id: 'track-3',
          type: 'text',
          name: 'Track 3',
          height: 60,
          isVisible: true,
          clips: []
        }
      ];

      let state = initialState;
      for (const track of tracks) {
        state = timelineReducer(state, timelineActions.addTrack(track));
      }
      stateWithTracks = state;
    });

    it('should reorder tracks', () => {
      const newOrder = ['track-3', 'track-1', 'track-2'];
      const action = timelineActions.reorderTracks(newOrder);
      const newState = timelineReducer(stateWithTracks, action);

      const reorderedTracks = newState.present.tracks;
      expect(reorderedTracks[0].id).toBe('track-3');
      expect(reorderedTracks[1].id).toBe('track-1');
      expect(reorderedTracks[2].id).toBe('track-2');
    });

    it('should throw error for invalid track IDs', () => {
      const invalidOrder = ['track-1', 'non-existent', 'track-2'];
      const action = timelineActions.reorderTracks(invalidOrder);
      const newState = timelineReducer(stateWithTracks, action);
      
      expect(newState).toBe(stateWithTracks);
    });

    it('should throw error for incomplete track list', () => {
      const incompleteOrder = ['track-1', 'track-2']; // Missing track-3
      const action = timelineActions.reorderTracks(incompleteOrder);
      const newState = timelineReducer(stateWithTracks, action);
      
      expect(newState).toBe(stateWithTracks);
    });
  });

  describe('Timeline state actions', () => {
    it('should set current time', () => {
      // First set duration to allow current time of 10
      let state = timelineReducer(initialState, timelineActions.setDuration(100));
      const action = timelineActions.setCurrentTime(10);
      const newState = timelineReducer(state, action);

      expect(newState.present.currentTime).toBe(10);
      // Should not add to history for time changes
      expect(newState.past).toHaveLength(state.past.length);
    });

    it('should set duration', () => {
      const action = timelineActions.setDuration(100);
      const newState = timelineReducer(initialState, action);

      expect(newState.present.duration).toBe(100);
      expect(newState.past).toHaveLength(1);
    });

    it('should adjust current time when setting smaller duration', () => {
      // First set duration to allow current time of 50
      let state = timelineReducer(initialState, timelineActions.setDuration(100));
      state = timelineReducer(state, timelineActions.setCurrentTime(50));
      state = timelineReducer(state, timelineActions.setDuration(30));

      expect(state.present.currentTime).toBe(30); // Clamped to duration
    });

    it('should set zoom', () => {
      const action = timelineActions.setZoom(2);
      const newState = timelineReducer(initialState, action);

      expect(newState.present.zoom).toBe(2);
      // Should not add to history
      expect(newState.past).toHaveLength(0);
    });

    it('should set playing state', () => {
      const action = timelineActions.setPlaying(true);
      const newState = timelineReducer(initialState, action);

      expect(newState.present.isPlaying).toBe(true);
      // Should not add to history
      expect(newState.past).toHaveLength(0);
    });

    it('should validate current time bounds', () => {
      const action = timelineActions.setCurrentTime(-1);
      const newState = timelineReducer(initialState, action);
      
      expect(newState).toBe(initialState);
    });

    it('should validate zoom value', () => {
      const action = timelineActions.setZoom(0);
      const newState = timelineReducer(initialState, action);
      
      expect(newState).toBe(initialState);
    });
  });

  describe('Undo/Redo functionality', () => {
    let stateWithHistory: ReturnType<typeof createInitialState>;

    beforeEach(() => {
      const track: Track = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      // Create some history
      let state = timelineReducer(initialState, timelineActions.addTrack(track));
      state = timelineReducer(state, timelineActions.setDuration(100));
      stateWithHistory = state;
    });

    it('should undo last action', () => {
      const action = timelineActions.undo();
      const newState = timelineReducer(stateWithHistory, action);

      expect(newState.present.duration).toBe(0); // Back to initial duration
      expect(newState.past).toHaveLength(1); // One less in past
      expect(newState.future).toHaveLength(1); // One in future
    });

    it('should redo undone action', () => {
      let state = timelineReducer(stateWithHistory, timelineActions.undo());
      state = timelineReducer(state, timelineActions.redo());

      expect(state.present.duration).toBe(100); // Back to 100
      expect(state.past).toHaveLength(2); // Back to original past length
      expect(state.future).toHaveLength(0); // Future cleared
    });

    it('should not undo when no history', () => {
      const action = timelineActions.undo();
      const newState = timelineReducer(initialState, action);

      expect(newState).toBe(initialState);
    });

    it('should not redo when no future', () => {
      const action = timelineActions.redo();
      const newState = timelineReducer(stateWithHistory, action);

      expect(newState).toBe(stateWithHistory);
    });

    it('should clear future when new action is performed after undo', () => {
      let state = timelineReducer(stateWithHistory, timelineActions.undo());
      expect(state.future).toHaveLength(1);

      state = timelineReducer(state, timelineActions.setDuration(200));
      expect(state.future).toHaveLength(0);
    });

    it('should clear history', () => {
      const action = timelineActions.clearHistory();
      const newState = timelineReducer(stateWithHistory, action);

      expect(newState.past).toHaveLength(0);
      expect(newState.future).toHaveLength(0);
      expect(newState.present).toBe(stateWithHistory.present);
    });
  });

  describe('State management actions', () => {
    it('should reset state', () => {
      const newState: TimelineState = {
        tracks: [],
        currentTime: 50,
        duration: 200,
        zoom: 3,
        selectedClipId: undefined,
        isPlaying: true
      };

      const action = timelineActions.resetState(newState);
      const result = timelineReducer(initialState, action);

      expect(result.present).toEqual(newState);
      expect(result.past).toHaveLength(0);
      expect(result.future).toHaveLength(0);
    });

    it('should import state', () => {
      const importedState: TimelineState = {
        tracks: [],
        currentTime: 25,
        duration: 150,
        zoom: 2,
        selectedClipId: undefined,
        isPlaying: false
      };

      const action = timelineActions.importState(importedState);
      const result = timelineReducer(initialState, action);

      expect(result.present).toEqual(importedState);
      expect(result.past).toHaveLength(1); // Should add to history
    });

    it('should validate imported state', () => {
      const invalidState = {
        tracks: [],
        currentTime: -1, // Invalid
        duration: 100,
        zoom: 1,
        selectedClipId: undefined,
        isPlaying: false
      } as TimelineState;

      const action = timelineActions.importState(invalidState);
      const result = timelineReducer(initialState, action);

      expect(result).toBe(initialState); // Should not change on invalid state
    });
  });

  describe('Error handling', () => {
    it('should return current state on unknown action type', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' as any };
      const newState = timelineReducer(initialState, unknownAction);

      expect(newState).toBe(initialState);
    });

    it('should handle validation errors gracefully', () => {
      const invalidClip = {
        id: '',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video'
      } as Clip;

      const action = timelineActions.addClip(invalidClip);
      const newState = timelineReducer(initialState, action);

      expect(newState).toBe(initialState);
    });
  });
});