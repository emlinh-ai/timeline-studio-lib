import { Clip, Track, TimelineState } from '../types';

// Action Types
export enum TimelineActionType {
  // Clip Actions
  ADD_CLIP = 'ADD_CLIP',
  REMOVE_CLIP = 'REMOVE_CLIP',
  UPDATE_CLIP = 'UPDATE_CLIP',
  SELECT_CLIP = 'SELECT_CLIP',
  DESELECT_CLIP = 'DESELECT_CLIP',
  
  // Track Actions
  ADD_TRACK = 'ADD_TRACK',
  REMOVE_TRACK = 'REMOVE_TRACK',
  UPDATE_TRACK = 'UPDATE_TRACK',
  REORDER_TRACKS = 'REORDER_TRACKS',
  
  // Timeline Actions
  SET_CURRENT_TIME = 'SET_CURRENT_TIME',
  SET_DURATION = 'SET_DURATION',
  SET_ZOOM = 'SET_ZOOM',
  SET_PLAYING = 'SET_PLAYING',
  
  // History Actions
  UNDO = 'UNDO',
  REDO = 'REDO',
  CLEAR_HISTORY = 'CLEAR_HISTORY',
  
  // State Actions
  RESET_STATE = 'RESET_STATE',
  IMPORT_STATE = 'IMPORT_STATE',
}

// Action Interfaces
export interface AddClipAction {
  type: TimelineActionType.ADD_CLIP;
  payload: {
    clip: Clip;
  };
}

export interface RemoveClipAction {
  type: TimelineActionType.REMOVE_CLIP;
  payload: {
    clipId: string;
  };
}

export interface UpdateClipAction {
  type: TimelineActionType.UPDATE_CLIP;
  payload: {
    clipId: string;
    updates: Partial<Clip>;
  };
}

export interface SelectClipAction {
  type: TimelineActionType.SELECT_CLIP;
  payload: {
    clipId: string;
  };
}

export interface DeselectClipAction {
  type: TimelineActionType.DESELECT_CLIP;
}

export interface AddTrackAction {
  type: TimelineActionType.ADD_TRACK;
  payload: {
    track: Track;
  };
}

export interface RemoveTrackAction {
  type: TimelineActionType.REMOVE_TRACK;
  payload: {
    trackId: string;
  };
}

export interface UpdateTrackAction {
  type: TimelineActionType.UPDATE_TRACK;
  payload: {
    trackId: string;
    updates: Partial<Track>;
  };
}

export interface ReorderTracksAction {
  type: TimelineActionType.REORDER_TRACKS;
  payload: {
    trackIds: string[];
  };
}

export interface SetCurrentTimeAction {
  type: TimelineActionType.SET_CURRENT_TIME;
  payload: {
    currentTime: number;
  };
}

export interface SetDurationAction {
  type: TimelineActionType.SET_DURATION;
  payload: {
    duration: number;
  };
}

export interface SetZoomAction {
  type: TimelineActionType.SET_ZOOM;
  payload: {
    zoom: number;
  };
}

export interface SetPlayingAction {
  type: TimelineActionType.SET_PLAYING;
  payload: {
    isPlaying: boolean;
  };
}

export interface UndoAction {
  type: TimelineActionType.UNDO;
}

export interface RedoAction {
  type: TimelineActionType.REDO;
}

export interface ClearHistoryAction {
  type: TimelineActionType.CLEAR_HISTORY;
}

export interface ResetStateAction {
  type: TimelineActionType.RESET_STATE;
  payload: {
    state: TimelineState;
  };
}

export interface ImportStateAction {
  type: TimelineActionType.IMPORT_STATE;
  payload: {
    state: TimelineState;
  };
}

// Union Type for All Actions
export type TimelineAction =
  | AddClipAction
  | RemoveClipAction
  | UpdateClipAction
  | SelectClipAction
  | DeselectClipAction
  | AddTrackAction
  | RemoveTrackAction
  | UpdateTrackAction
  | ReorderTracksAction
  | SetCurrentTimeAction
  | SetDurationAction
  | SetZoomAction
  | SetPlayingAction
  | UndoAction
  | RedoAction
  | ClearHistoryAction
  | ResetStateAction
  | ImportStateAction;

// State with History
export interface TimelineStateWithHistory {
  past: TimelineState[];
  present: TimelineState;
  future: TimelineState[];
}