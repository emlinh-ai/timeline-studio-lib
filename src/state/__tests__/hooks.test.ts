import { renderHook, act } from '@testing-library/react';
import { useUndoRedo, useStateSerialization, useTimelineState, useUndoRedoKeyboard } from '../hooks';
import { createInitialState, timelineActions } from '../reducer';
import { TimelineStateWithHistory } from '../types';
import { Clip, Track } from '../../types';

describe('State Management Hooks', () => {
  let initialState: TimelineStateWithHistory;
  let mockDispatch: jest.Mock;
  let track: Track;
  let clip: Clip;

  beforeEach(() => {
    initialState = createInitialState();
    mockDispatch = jest.fn();
    
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
  });

  describe('useUndoRedo', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useUndoRedo(initialState, mockDispatch));
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should return true for canUndo when history exists', () => {
      const stateWithHistory: TimelineStateWithHistory = {
        ...initialState,
        past: [initialState.present]
      };
      
      const { result } = renderHook(() => useUndoRedo(stateWithHistory, mockDispatch));
      
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should return true for canRedo when future exists', () => {
      const stateWithFuture: TimelineStateWithHistory = {
        ...initialState,
        future: [initialState.present]
      };
      
      const { result } = renderHook(() => useUndoRedo(stateWithFuture, mockDispatch));
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should call dispatch with undo action when undo is called', () => {
      const stateWithHistory: TimelineStateWithHistory = {
        ...initialState,
        past: [initialState.present]
      };
      
      const { result } = renderHook(() => useUndoRedo(stateWithHistory, mockDispatch));
      
      act(() => {
        result.current.undo();
      });
      
      expect(mockDispatch).toHaveBeenCalledWith(timelineActions.undo());
    });

    it('should call dispatch with redo action when redo is called', () => {
      const stateWithFuture: TimelineStateWithHistory = {
        ...initialState,
        future: [initialState.present]
      };
      
      const { result } = renderHook(() => useUndoRedo(stateWithFuture, mockDispatch));
      
      act(() => {
        result.current.redo();
      });
      
      expect(mockDispatch).toHaveBeenCalledWith(timelineActions.redo());
    });

    it('should not call dispatch when undo is called but canUndo is false', () => {
      const { result } = renderHook(() => useUndoRedo(initialState, mockDispatch));
      
      act(() => {
        result.current.undo();
      });
      
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should not call dispatch when redo is called but canRedo is false', () => {
      const { result } = renderHook(() => useUndoRedo(initialState, mockDispatch));
      
      act(() => {
        result.current.redo();
      });
      
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should call dispatch with clearHistory action when clearHistory is called', () => {
      const { result } = renderHook(() => useUndoRedo(initialState, mockDispatch));
      
      act(() => {
        result.current.clearHistory();
      });
      
      expect(mockDispatch).toHaveBeenCalledWith(timelineActions.clearHistory());
    });

    it('should return correct history size', () => {
      const stateWithHistory: TimelineStateWithHistory = {
        past: [initialState.present, initialState.present],
        present: initialState.present,
        future: [initialState.present]
      };
      
      const { result } = renderHook(() => useUndoRedo(stateWithHistory, mockDispatch));
      
      const historySize = result.current.getHistorySize();
      expect(historySize.undo).toBe(2);
      expect(historySize.redo).toBe(1);
    });

    it('should return descriptions for undo/redo actions', () => {
      const stateWithHistory: TimelineStateWithHistory = {
        ...initialState,
        past: [initialState.present],
        future: [initialState.present]
      };
      
      const { result } = renderHook(() => useUndoRedo(stateWithHistory, mockDispatch));
      
      expect(result.current.getUndoDescription()).toBe('Undo last action');
      expect(result.current.getRedoDescription()).toBe('Redo last action');
    });

    it('should return null descriptions when no undo/redo available', () => {
      const { result } = renderHook(() => useUndoRedo(initialState, mockDispatch));
      
      expect(result.current.getUndoDescription()).toBeNull();
      expect(result.current.getRedoDescription()).toBeNull();
    });
  });

  describe('useStateSerialization', () => {
    it('should export state as JSON string', () => {
      const { result } = renderHook(() => useStateSerialization(initialState, mockDispatch));
      
      const exported = result.current.exportState();
      
      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should import state and dispatch importState action', () => {
      const { result } = renderHook(() => useStateSerialization(initialState, mockDispatch));
      
      const exported = result.current.exportState();
      
      act(() => {
        result.current.importState(exported);
      });
      
      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.importState(initialState.present)
      );
    });

    it('should reset state and dispatch resetState action', () => {
      const { result } = renderHook(() => useStateSerialization(initialState, mockDispatch));
      
      const newState = {
        ...initialState.present,
        currentTime: 50
      };
      
      act(() => {
        result.current.resetState(newState);
      });
      
      expect(mockDispatch).toHaveBeenCalledWith(timelineActions.resetState(newState));
    });

    it('should return state size in bytes', () => {
      const { result } = renderHook(() => useStateSerialization(initialState, mockDispatch));
      
      const size = result.current.getStateSize();
      
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });

    it('should handle export errors gracefully', () => {
      // Create a state that will cause serialization to fail
      const invalidState: TimelineStateWithHistory = {
        ...initialState,
        present: {
          ...initialState.present,
          currentTime: -1 // Invalid value
        }
      };
      
      const { result } = renderHook(() => useStateSerialization(invalidState, mockDispatch));
      
      expect(() => {
        result.current.exportState();
      }).toThrow();
    });

    it('should handle import errors gracefully', () => {
      const { result } = renderHook(() => useStateSerialization(initialState, mockDispatch));
      
      expect(() => {
        result.current.importState('invalid json');
      }).toThrow();
    });

    it('should handle state size calculation errors gracefully', () => {
      const invalidState: TimelineStateWithHistory = {
        ...initialState,
        present: {
          ...initialState.present,
          currentTime: -1 // Invalid value
        }
      };
      
      const { result } = renderHook(() => useStateSerialization(invalidState, mockDispatch));
      
      const size = result.current.getStateSize();
      expect(size).toBe(0);
    });
  });

  describe('useTimelineState', () => {
    it('should return current state and actions', () => {
      const { result } = renderHook(() => useTimelineState(initialState, mockDispatch));
      
      expect(result.current.state).toBe(initialState.present);
      expect(result.current.actions).toBeDefined();
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should provide action creators that dispatch actions', () => {
      const { result } = renderHook(() => useTimelineState(initialState, mockDispatch));
      
      act(() => {
        result.current.actions.addClip(clip);
      });
      
      expect(mockDispatch).toHaveBeenCalledWith(timelineActions.addClip(clip));
    });

    it('should provide all timeline actions', () => {
      const { result } = renderHook(() => useTimelineState(initialState, mockDispatch));
      
      const actions = result.current.actions;
      
      expect(actions.addClip).toBeDefined();
      expect(actions.removeClip).toBeDefined();
      expect(actions.updateClip).toBeDefined();
      expect(actions.selectClip).toBeDefined();
      expect(actions.deselectClip).toBeDefined();
      expect(actions.addTrack).toBeDefined();
      expect(actions.removeTrack).toBeDefined();
      expect(actions.updateTrack).toBeDefined();
      expect(actions.reorderTracks).toBeDefined();
      expect(actions.setCurrentTime).toBeDefined();
      expect(actions.setDuration).toBeDefined();
      expect(actions.setZoom).toBeDefined();
      expect(actions.setPlaying).toBeDefined();
    });

    it('should include undo/redo functionality', () => {
      const stateWithHistory: TimelineStateWithHistory = {
        ...initialState,
        past: [initialState.present]
      };
      
      const { result } = renderHook(() => useTimelineState(stateWithHistory, mockDispatch));
      
      expect(result.current.canUndo).toBe(true);
      expect(result.current.undo).toBeDefined();
      expect(result.current.redo).toBeDefined();
    });

    it('should include serialization functionality', () => {
      const { result } = renderHook(() => useTimelineState(initialState, mockDispatch));
      
      expect(result.current.exportState).toBeDefined();
      expect(result.current.importState).toBeDefined();
      expect(result.current.resetState).toBeDefined();
      expect(result.current.getStateSize).toBeDefined();
    });
  });

  describe('useUndoRedoKeyboard', () => {
    let mockUndo: jest.Mock;
    let mockRedo: jest.Mock;

    beforeEach(() => {
      mockUndo = jest.fn();
      mockRedo = jest.fn();
    });

    it('should return handleKeyDown function', () => {
      const { result } = renderHook(() => useUndoRedoKeyboard(mockUndo, mockRedo));
      
      expect(result.current.handleKeyDown).toBeDefined();
      expect(typeof result.current.handleKeyDown).toBe('function');
    });

    it('should call undo on Ctrl+Z', () => {
      const { result } = renderHook(() => useUndoRedoKeyboard(mockUndo, mockRedo));
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      });
      
      act(() => {
        result.current.handleKeyDown(event);
      });
      
      expect(mockUndo).toHaveBeenCalled();
      expect(mockRedo).not.toHaveBeenCalled();
    });

    it('should call undo on Cmd+Z (Mac)', () => {
      const { result } = renderHook(() => useUndoRedoKeyboard(mockUndo, mockRedo));
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true
      });
      
      act(() => {
        result.current.handleKeyDown(event);
      });
      
      expect(mockUndo).toHaveBeenCalled();
      expect(mockRedo).not.toHaveBeenCalled();
    });

    it('should call redo on Ctrl+Y', () => {
      const { result } = renderHook(() => useUndoRedoKeyboard(mockUndo, mockRedo));
      
      const event = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true
      });
      
      act(() => {
        result.current.handleKeyDown(event);
      });
      
      expect(mockRedo).toHaveBeenCalled();
      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should call redo on Ctrl+Shift+Z', () => {
      const { result } = renderHook(() => useUndoRedoKeyboard(mockUndo, mockRedo));
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true
      });
      
      act(() => {
        result.current.handleKeyDown(event);
      });
      
      expect(mockRedo).toHaveBeenCalled();
      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should not call callbacks when disabled', () => {
      const { result } = renderHook(() => useUndoRedoKeyboard(mockUndo, mockRedo, false));
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      });
      
      act(() => {
        result.current.handleKeyDown(event);
      });
      
      expect(mockUndo).not.toHaveBeenCalled();
      expect(mockRedo).not.toHaveBeenCalled();
    });

    it('should not call callbacks for other key combinations', () => {
      const { result } = renderHook(() => useUndoRedoKeyboard(mockUndo, mockRedo));
      
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true
      });
      
      act(() => {
        result.current.handleKeyDown(event);
      });
      
      expect(mockUndo).not.toHaveBeenCalled();
      expect(mockRedo).not.toHaveBeenCalled();
    });

    it('should update callbacks when they change', () => {
      const newMockUndo = jest.fn();
      const newMockRedo = jest.fn();
      
      const { result, rerender } = renderHook(
        ({ undo, redo }) => useUndoRedoKeyboard(undo, redo),
        {
          initialProps: { undo: mockUndo, redo: mockRedo }
        }
      );
      
      // Update with new callbacks
      rerender({ undo: newMockUndo, redo: newMockRedo });
      
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      });
      
      act(() => {
        result.current.handleKeyDown(event);
      });
      
      expect(newMockUndo).toHaveBeenCalled();
      expect(mockUndo).not.toHaveBeenCalled();
    });
  });
});