import { useCallback, useMemo } from 'react';
import { TimelineStateWithHistory } from './types';
import { timelineActions } from './reducer';
import { serializeTimelineState, deserializeTimelineState } from './serialization';

/**
 * Hook for undo/redo functionality
 */
export function useUndoRedo(
  state: TimelineStateWithHistory,
  dispatch: (action: any) => void
) {
  const canUndo = useMemo(() => state.past.length > 0, [state.past.length]);
  const canRedo = useMemo(() => state.future.length > 0, [state.future.length]);
  
  const undo = useCallback(() => {
    if (canUndo) {
      dispatch(timelineActions.undo());
    }
  }, [canUndo, dispatch]);
  
  const redo = useCallback(() => {
    if (canRedo) {
      dispatch(timelineActions.redo());
    }
  }, [canRedo, dispatch]);
  
  const clearHistory = useCallback(() => {
    dispatch(timelineActions.clearHistory());
  }, [dispatch]);
  
  const getUndoDescription = useCallback(() => {
    if (!canUndo) return null;
    // This would need to be enhanced to track action descriptions
    return 'Undo last action';
  }, [canUndo]);
  
  const getRedoDescription = useCallback(() => {
    if (!canRedo) return null;
    // This would need to be enhanced to track action descriptions
    return 'Redo last action';
  }, [canRedo]);
  
  const getHistorySize = useCallback(() => ({
    undo: state.past.length,
    redo: state.future.length
  }), [state.past.length, state.future.length]);
  
  return {
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
    getUndoDescription,
    getRedoDescription,
    getHistorySize
  };
}

/**
 * Hook for state serialization functionality
 */
export function useStateSerialization(
  state: TimelineStateWithHistory,
  dispatch: (action: any) => void
) {
  const exportState = useCallback(() => {
    try {
      const serialized = serializeTimelineState(state.present);
      return serialized;
    } catch (error) {
      console.error('Failed to export state:', error);
      throw error;
    }
  }, [state.present]);
  
  const importState = useCallback((serializedState: string) => {
    try {
      const deserializedState = deserializeTimelineState(serializedState);
      dispatch(timelineActions.importState(deserializedState));
    } catch (error) {
      console.error('Failed to import state:', error);
      throw error;
    }
  }, [dispatch]);
  
  const resetState = useCallback((newState: import('../types').TimelineState) => {
    dispatch(timelineActions.resetState(newState));
  }, [dispatch]);
  
  const getStateSize = useCallback(() => {
    try {
      const serialized = serializeTimelineState(state.present, { compress: true });
      return new Blob([serialized]).size;
    } catch (error) {
      console.error('Failed to calculate state size:', error);
      return 0;
    }
  }, [state.present]);
  
  return {
    exportState,
    importState,
    resetState,
    getStateSize
  };
}

/**
 * Hook for enhanced timeline state management with undo/redo and serialization
 */
export function useTimelineState(
  state: TimelineStateWithHistory,
  dispatch: (action: any) => void
) {
  const undoRedo = useUndoRedo(state, dispatch);
  const serialization = useStateSerialization(state, dispatch);
  
  // Enhanced action creators with automatic history management
  const actions = useMemo(() => ({
    // Clip actions
    addClip: (clip: import('../types').Clip) => {
      dispatch(timelineActions.addClip(clip));
    },
    
    removeClip: (clipId: string) => {
      dispatch(timelineActions.removeClip(clipId));
    },
    
    updateClip: (clipId: string, updates: Partial<import('../types').Clip>) => {
      dispatch(timelineActions.updateClip(clipId, updates));
    },
    
    selectClip: (clipId: string) => {
      dispatch(timelineActions.selectClip(clipId));
    },
    
    deselectClip: () => {
      dispatch(timelineActions.deselectClip());
    },
    
    // Track actions
    addTrack: (track: import('../types').Track) => {
      dispatch(timelineActions.addTrack(track));
    },
    
    removeTrack: (trackId: string) => {
      dispatch(timelineActions.removeTrack(trackId));
    },
    
    updateTrack: (trackId: string, updates: Partial<import('../types').Track>) => {
      dispatch(timelineActions.updateTrack(trackId, updates));
    },
    
    reorderTracks: (trackIds: string[]) => {
      dispatch(timelineActions.reorderTracks(trackIds));
    },
    
    // Timeline actions
    setCurrentTime: (currentTime: number) => {
      dispatch(timelineActions.setCurrentTime(currentTime));
    },
    
    setDuration: (duration: number) => {
      dispatch(timelineActions.setDuration(duration));
    },
    
    setZoom: (zoom: number) => {
      dispatch(timelineActions.setZoom(zoom));
    },
    
    setPlaying: (isPlaying: boolean) => {
      dispatch(timelineActions.setPlaying(isPlaying));
    }
  }), [dispatch]);
  
  return {
    // Current state
    state: state.present,
    
    // Actions
    actions,
    
    // Undo/Redo functionality
    ...undoRedo,
    
    // Serialization functionality
    ...serialization
  };
}

/**
 * Hook for keyboard shortcuts for undo/redo
 */
export function useUndoRedoKeyboard(
  undoCallback: () => void,
  redoCallback: () => void,
  enabled = true
) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoCallback();
    } else if (isCtrlOrCmd && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
      event.preventDefault();
      redoCallback();
    }
  }, [undoCallback, redoCallback, enabled]);
  
  return { handleKeyDown };
}

/**
 * Hook for tracking state changes and emitting events
 */
export function useStateChangeTracking(
  state: TimelineStateWithHistory,
  eventBus?: import('../eventBus/EventBus').EventBus<import('../types').TimelineEventPayloads>,
  namespace?: string
) {
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;
  
  // Emit undo/redo capability changes
  useMemo(() => {
    if (eventBus) {
      const eventName = namespace ? `${namespace}:canUndo` : 'timeline:canUndo';
      eventBus.emit(eventName as any, { value: canUndo });
    }
  }, [canUndo, eventBus, namespace]);
  
  useMemo(() => {
    if (eventBus) {
      const eventName = namespace ? `${namespace}:canRedo` : 'timeline:canRedo';
      eventBus.emit(eventName as any, { value: canRedo });
    }
  }, [canRedo, eventBus, namespace]);
  
  // Emit state changes
  useMemo(() => {
    if (eventBus) {
      const eventName = namespace ? `${namespace}:stateChange` : 'timeline:stateChange';
      eventBus.emit(eventName as any, state.present);
    }
  }, [state.present, eventBus, namespace]);
  
  return {
    canUndo,
    canRedo
  };
}