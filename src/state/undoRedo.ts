import { TimelineState } from '../types';
import { TimelineStateWithHistory } from './types';

/**
 * Utility functions for undo/redo functionality
 */

/**
 * Checks if undo is possible
 */
export function canUndo(state: TimelineStateWithHistory): boolean {
  return state.past.length > 0;
}

/**
 * Checks if redo is possible
 */
export function canRedo(state: TimelineStateWithHistory): boolean {
  return state.future.length > 0;
}

/**
 * Gets the number of available undo steps
 */
export function getUndoCount(state: TimelineStateWithHistory): number {
  return state.past.length;
}

/**
 * Gets the number of available redo steps
 */
export function getRedoCount(state: TimelineStateWithHistory): number {
  return state.future.length;
}

/**
 * Serializes the history state for persistence
 */
export function serializeHistory(state: TimelineStateWithHistory): string {
  try {
    return JSON.stringify({
      past: state.past,
      present: state.present,
      future: state.future
    });
  } catch (error) {
    throw new Error(`Failed to serialize history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deserializes the history state from persistence
 */
export function deserializeHistory(serializedState: string): TimelineStateWithHistory {
  try {
    const parsed = JSON.parse(serializedState);
    
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid serialized state format');
    }
    
    if (!Array.isArray(parsed.past) || !Array.isArray(parsed.future)) {
      throw new Error('Invalid history arrays in serialized state');
    }
    
    if (!parsed.present || typeof parsed.present !== 'object') {
      throw new Error('Invalid present state in serialized state');
    }
    
    // Basic validation of the present state structure
    const present = parsed.present as TimelineState;
    if (!Array.isArray(present.tracks) || 
        typeof present.currentTime !== 'number' ||
        typeof present.duration !== 'number' ||
        typeof present.zoom !== 'number' ||
        typeof present.isPlaying !== 'boolean') {
      throw new Error('Invalid present state structure');
    }
    
    return {
      past: parsed.past as TimelineState[],
      present: present,
      future: parsed.future as TimelineState[]
    };
  } catch (error) {
    throw new Error(`Failed to deserialize history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compresses history by removing old states beyond a limit
 */
export function compressHistory(
  state: TimelineStateWithHistory, 
  maxHistorySize: number = 50
): TimelineStateWithHistory {
  if (maxHistorySize <= 0) {
    throw new Error('Max history size must be positive');
  }
  
  if (state.past.length <= maxHistorySize) {
    return state;
  }
  
  // Keep only the most recent states
  const compressedPast = state.past.slice(-maxHistorySize);
  
  return {
    ...state,
    past: compressedPast
  };
}

/**
 * Creates a snapshot of the current state for manual history management
 */
export function createSnapshot(state: TimelineStateWithHistory): TimelineState {
  return JSON.parse(JSON.stringify(state.present));
}

/**
 * Calculates memory usage of the history (approximate)
 */
export function getHistoryMemoryUsage(state: TimelineStateWithHistory): {
  totalStates: number;
  estimatedBytes: number;
  pastStates: number;
  futureStates: number;
} {
  const totalStates = state.past.length + 1 + state.future.length;
  
  // Rough estimation: JSON.stringify length as bytes approximation
  const serialized = JSON.stringify(state);
  const estimatedBytes = serialized.length;
  
  return {
    totalStates,
    estimatedBytes,
    pastStates: state.past.length,
    futureStates: state.future.length
  };
}

/**
 * Optimizes history by removing duplicate consecutive states
 */
export function optimizeHistory(state: TimelineStateWithHistory): TimelineStateWithHistory {
  // Remove consecutive duplicate states from past
  const optimizedPast: TimelineState[] = [];
  
  for (let i = 0; i < state.past.length; i++) {
    const currentState = state.past[i];
    const nextState = i < state.past.length - 1 ? state.past[i + 1] : state.present;
    
    // Simple comparison - in a real implementation, you might want more sophisticated comparison
    if (JSON.stringify(currentState) !== JSON.stringify(nextState)) {
      optimizedPast.push(currentState);
    }
  }
  
  // Remove consecutive duplicate states from future
  const optimizedFuture: TimelineState[] = [];
  let previousState = state.present;
  
  for (const futureState of state.future) {
    if (JSON.stringify(previousState) !== JSON.stringify(futureState)) {
      optimizedFuture.push(futureState);
    }
    previousState = futureState;
  }
  
  return {
    past: optimizedPast,
    present: state.present,
    future: optimizedFuture
  };
}

/**
 * Gets a preview of what would be undone/redone without actually performing the action
 */
export function getUndoPreview(state: TimelineStateWithHistory): TimelineState | null {
  return state.past.length > 0 ? state.past[state.past.length - 1] : null;
}

export function getRedoPreview(state: TimelineStateWithHistory): TimelineState | null {
  return state.future.length > 0 ? state.future[0] : null;
}

/**
 * Utility to create a diff between two timeline states for debugging
 */
export function createStateDiff(
  oldState: TimelineState, 
  newState: TimelineState
): {
  tracksChanged: boolean;
  currentTimeChanged: boolean;
  durationChanged: boolean;
  zoomChanged: boolean;
  selectedClipChanged: boolean;
  playingStateChanged: boolean;
  changes: string[];
} {
  const changes: string[] = [];
  
  const tracksChanged = JSON.stringify(oldState.tracks) !== JSON.stringify(newState.tracks);
  if (tracksChanged) changes.push('tracks');
  
  const currentTimeChanged = oldState.currentTime !== newState.currentTime;
  if (currentTimeChanged) changes.push('currentTime');
  
  const durationChanged = oldState.duration !== newState.duration;
  if (durationChanged) changes.push('duration');
  
  const zoomChanged = oldState.zoom !== newState.zoom;
  if (zoomChanged) changes.push('zoom');
  
  const selectedClipChanged = oldState.selectedClipId !== newState.selectedClipId;
  if (selectedClipChanged) changes.push('selectedClipId');
  
  const playingStateChanged = oldState.isPlaying !== newState.isPlaying;
  if (playingStateChanged) changes.push('isPlaying');
  
  return {
    tracksChanged,
    currentTimeChanged,
    durationChanged,
    zoomChanged,
    selectedClipChanged,
    playingStateChanged,
    changes
  };
}