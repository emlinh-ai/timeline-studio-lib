import { TimelineState } from '../types';
import { 
  TimelineAction, 
  TimelineActionType, 
  TimelineStateWithHistory 
} from './types';
import { 
  validateClip, 
  validateTrack, 
  validateTimelineState, 
  validateClipUpdates, 
  validateTrackUpdates 
} from './validation';

/**
 * Creates initial timeline state
 */
export function createInitialState(initialState?: Partial<TimelineState>): TimelineStateWithHistory {
  const defaultState: TimelineState = {
    tracks: [],
    currentTime: 0,
    duration: 0,
    zoom: 1,
    selectedClipId: undefined,
    isPlaying: false,
    ...initialState
  };

  // Validate the initial state
  validateTimelineState(defaultState);

  return {
    past: [],
    present: defaultState,
    future: []
  };
}

/**
 * Adds a new state to history (for undo/redo functionality)
 */
function addToHistory(
  state: TimelineStateWithHistory, 
  newPresent: TimelineState
): TimelineStateWithHistory {
  return {
    past: [...state.past, state.present],
    present: newPresent,
    future: [] // Clear future when new action is performed
  };
}

/**
 * Timeline reducer with history management
 */
export function timelineReducer(
  state: TimelineStateWithHistory, 
  action: TimelineAction
): TimelineStateWithHistory {
  try {
    switch (action.type) {
      case TimelineActionType.ADD_CLIP: {
        const { clip } = action.payload;
        
        // Validate the clip
        validateClip(clip);
        
        // Check if track exists
        const trackExists = state.present.tracks.some(track => track.id === clip.trackId);
        if (!trackExists) {
          throw new Error(`Track with ID "${clip.trackId}" does not exist`);
        }
        
        // Check if clip ID already exists
        const clipExists = state.present.tracks.some(track => 
          track.clips.some(existingClip => existingClip.id === clip.id)
        );
        if (clipExists) {
          throw new Error(`Clip with ID "${clip.id}" already exists`);
        }
        
        const newState: TimelineState = {
          ...state.present,
          tracks: state.present.tracks.map(track => 
            track.id === clip.trackId
              ? {
                  ...track,
                  clips: [...track.clips, clip].sort((a, b) => a.start - b.start)
                }
              : track
          )
        };
        
        // Update duration if clip extends beyond current duration
        const clipEnd = clip.start + clip.duration;
        if (clipEnd > newState.duration) {
          newState.duration = clipEnd;
        }
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.REMOVE_CLIP: {
        const { clipId } = action.payload;
        
        // Find and remove the clip
        let clipFound = false;
        const newState: TimelineState = {
          ...state.present,
          tracks: state.present.tracks.map(track => ({
            ...track,
            clips: track.clips.filter(clip => {
              if (clip.id === clipId) {
                clipFound = true;
                return false;
              }
              return true;
            })
          })),
          selectedClipId: state.present.selectedClipId === clipId 
            ? undefined 
            : state.present.selectedClipId
        };
        
        if (!clipFound) {
          throw new Error(`Clip with ID "${clipId}" not found`);
        }
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.UPDATE_CLIP: {
        const { clipId, updates } = action.payload;
        
        // Validate updates
        validateClipUpdates(clipId, updates);
        
        // Find and update the clip
        let clipFound = false;
        const newState: TimelineState = {
          ...state.present,
          tracks: state.present.tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                clipFound = true;
                const updatedClip = { ...clip, ...updates };
                validateClip(updatedClip);
                return updatedClip;
              }
              return clip;
            }).sort((a, b) => a.start - b.start)
          }))
        };
        
        if (!clipFound) {
          throw new Error(`Clip with ID "${clipId}" not found`);
        }
        
        // Update duration if necessary
        const maxClipEnd = Math.max(
          ...newState.tracks.flatMap(track => 
            track.clips.map(clip => clip.start + clip.duration)
          ),
          0
        );
        newState.duration = Math.max(newState.duration, maxClipEnd);
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.SELECT_CLIP: {
        const { clipId } = action.payload;
        
        // Verify clip exists
        const clipExists = state.present.tracks.some(track => 
          track.clips.some(clip => clip.id === clipId)
        );
        
        if (!clipExists) {
          throw new Error(`Clip with ID "${clipId}" does not exist`);
        }
        
        const newState: TimelineState = {
          ...state.present,
          selectedClipId: clipId
        };
        
        // Don't add to history for selection changes
        return {
          ...state,
          present: newState
        };
      }

      case TimelineActionType.DESELECT_CLIP: {
        const newState: TimelineState = {
          ...state.present,
          selectedClipId: undefined
        };
        
        // Don't add to history for selection changes
        return {
          ...state,
          present: newState
        };
      }

      case TimelineActionType.ADD_TRACK: {
        const { track } = action.payload;
        
        // Validate the track
        validateTrack(track);
        
        // Check if track ID already exists
        const trackExists = state.present.tracks.some(existingTrack => existingTrack.id === track.id);
        if (trackExists) {
          throw new Error(`Track with ID "${track.id}" already exists`);
        }
        
        const newState: TimelineState = {
          ...state.present,
          tracks: [...state.present.tracks, track]
        };
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.REMOVE_TRACK: {
        const { trackId } = action.payload;
        
        const trackIndex = state.present.tracks.findIndex(track => track.id === trackId);
        if (trackIndex === -1) {
          throw new Error(`Track with ID "${trackId}" not found`);
        }
        
        // Clear selected clip if it belongs to the removed track
        const removedTrack = state.present.tracks[trackIndex];
        const selectedClipInRemovedTrack = removedTrack.clips.some(
          clip => clip.id === state.present.selectedClipId
        );
        
        const newState: TimelineState = {
          ...state.present,
          tracks: state.present.tracks.filter(track => track.id !== trackId),
          selectedClipId: selectedClipInRemovedTrack ? undefined : state.present.selectedClipId
        };
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.UPDATE_TRACK: {
        const { trackId, updates } = action.payload;
        
        // Validate updates
        validateTrackUpdates(trackId, updates);
        
        // Find and update the track
        const trackIndex = state.present.tracks.findIndex(track => track.id === trackId);
        if (trackIndex === -1) {
          throw new Error(`Track with ID "${trackId}" not found`);
        }
        
        const updatedTrack = { ...state.present.tracks[trackIndex], ...updates };
        validateTrack(updatedTrack);
        
        const newState: TimelineState = {
          ...state.present,
          tracks: state.present.tracks.map(track => 
            track.id === trackId ? updatedTrack : track
          )
        };
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.REORDER_TRACKS: {
        const { trackIds } = action.payload;
        
        // Validate that all track IDs exist and no duplicates
        const currentTrackIds = state.present.tracks.map(track => track.id);
        const trackIdSet = new Set(trackIds);
        
        if (trackIds.length !== currentTrackIds.length || trackIdSet.size !== trackIds.length) {
          throw new Error('Invalid track reordering: track IDs must match existing tracks exactly');
        }
        
        for (const trackId of trackIds) {
          if (!currentTrackIds.includes(trackId)) {
            throw new Error(`Track with ID "${trackId}" does not exist`);
          }
        }
        
        // Reorder tracks
        const trackMap = new Map(state.present.tracks.map(track => [track.id, track]));
        const reorderedTracks = trackIds.map(trackId => trackMap.get(trackId)!);
        
        const newState: TimelineState = {
          ...state.present,
          tracks: reorderedTracks
        };
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.SET_CURRENT_TIME: {
        const { currentTime } = action.payload;
        
        if (typeof currentTime !== 'number' || currentTime < 0) {
          throw new Error('Current time must be a non-negative number');
        }
        
        // Clamp currentTime to valid range instead of throwing error
        const clampedTime = Math.min(Math.max(0, currentTime), state.present.duration);
        
        const newState: TimelineState = {
          ...state.present,
          currentTime: clampedTime
        };
        
        // Don't add to history for time changes
        return {
          ...state,
          present: newState
        };
      }

      case TimelineActionType.SET_DURATION: {
        const { duration } = action.payload;
        
        if (typeof duration !== 'number' || duration < 0) {
          throw new Error('Duration must be a non-negative number');
        }
        
        const newState: TimelineState = {
          ...state.present,
          duration,
          currentTime: Math.min(state.present.currentTime, duration)
        };
        
        validateTimelineState(newState);
        return addToHistory(state, newState);
      }

      case TimelineActionType.SET_ZOOM: {
        const { zoom } = action.payload;
        
        if (typeof zoom !== 'number' || zoom <= 0) {
          throw new Error('Zoom must be a positive number');
        }
        
        const newState: TimelineState = {
          ...state.present,
          zoom
        };
        
        // Don't add to history for zoom changes
        return {
          ...state,
          present: newState
        };
      }

      case TimelineActionType.SET_PLAYING: {
        const { isPlaying } = action.payload;
        
        if (typeof isPlaying !== 'boolean') {
          throw new Error('isPlaying must be a boolean');
        }
        
        const newState: TimelineState = {
          ...state.present,
          isPlaying
        };
        
        // Don't add to history for playback state changes
        return {
          ...state,
          present: newState
        };
      }

      case TimelineActionType.UNDO: {
        if (state.past.length === 0) {
          return state; // Nothing to undo
        }
        
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        
        return {
          past: newPast,
          present: previous,
          future: [state.present, ...state.future]
        };
      }

      case TimelineActionType.REDO: {
        if (state.future.length === 0) {
          return state; // Nothing to redo
        }
        
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        
        return {
          past: [...state.past, state.present],
          present: next,
          future: newFuture
        };
      }

      case TimelineActionType.CLEAR_HISTORY: {
        return {
          past: [],
          present: state.present,
          future: []
        };
      }

      case TimelineActionType.RESET_STATE: {
        const { state: newState } = action.payload;
        validateTimelineState(newState);
        
        return {
          past: [],
          present: newState,
          future: []
        };
      }

      case TimelineActionType.IMPORT_STATE: {
        const { state: importedState } = action.payload;
        validateTimelineState(importedState);
        
        return addToHistory(state, importedState);
      }

      default:
        return state;
    }
  } catch (error) {
    // Log error and return current state to prevent crashes
    console.error('Timeline reducer error:', error);
    return state;
  }
}

/**
 * Action creators for better type safety and convenience
 */
export const timelineActions = {
  addClip: (clip: import('../types').Clip) => ({
    type: TimelineActionType.ADD_CLIP as const,
    payload: { clip }
  }),
  
  removeClip: (clipId: string) => ({
    type: TimelineActionType.REMOVE_CLIP as const,
    payload: { clipId }
  }),
  
  updateClip: (clipId: string, updates: Partial<import('../types').Clip>) => ({
    type: TimelineActionType.UPDATE_CLIP as const,
    payload: { clipId, updates }
  }),
  
  selectClip: (clipId: string) => ({
    type: TimelineActionType.SELECT_CLIP as const,
    payload: { clipId }
  }),
  
  deselectClip: () => ({
    type: TimelineActionType.DESELECT_CLIP as const
  }),
  
  addTrack: (track: import('../types').Track) => ({
    type: TimelineActionType.ADD_TRACK as const,
    payload: { track }
  }),
  
  removeTrack: (trackId: string) => ({
    type: TimelineActionType.REMOVE_TRACK as const,
    payload: { trackId }
  }),
  
  updateTrack: (trackId: string, updates: Partial<import('../types').Track>) => ({
    type: TimelineActionType.UPDATE_TRACK as const,
    payload: { trackId, updates }
  }),
  
  reorderTracks: (trackIds: string[]) => ({
    type: TimelineActionType.REORDER_TRACKS as const,
    payload: { trackIds }
  }),
  
  setCurrentTime: (currentTime: number) => ({
    type: TimelineActionType.SET_CURRENT_TIME as const,
    payload: { currentTime }
  }),
  
  setDuration: (duration: number) => ({
    type: TimelineActionType.SET_DURATION as const,
    payload: { duration }
  }),
  
  setZoom: (zoom: number) => ({
    type: TimelineActionType.SET_ZOOM as const,
    payload: { zoom }
  }),
  
  setPlaying: (isPlaying: boolean) => ({
    type: TimelineActionType.SET_PLAYING as const,
    payload: { isPlaying }
  }),
  
  undo: () => ({
    type: TimelineActionType.UNDO as const
  }),
  
  redo: () => ({
    type: TimelineActionType.REDO as const
  }),
  
  clearHistory: () => ({
    type: TimelineActionType.CLEAR_HISTORY as const
  }),
  
  resetState: (state: import('../types').TimelineState) => ({
    type: TimelineActionType.RESET_STATE as const,
    payload: { state }
  }),
  
  importState: (state: import('../types').TimelineState) => ({
    type: TimelineActionType.IMPORT_STATE as const,
    payload: { state }
  })
};