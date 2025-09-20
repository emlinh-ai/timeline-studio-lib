import { TimelineState } from '../types';
import { TimelineAction } from './types';

/**
 * Command interface for implementing command pattern
 */
export interface Command {
  execute(state: TimelineState): TimelineState;
  undo(state: TimelineState): TimelineState;
  canExecute(state: TimelineState): boolean;
  canUndo(state: TimelineState): boolean;
  description: string;
}

/**
 * Abstract base command class
 */
export abstract class BaseCommand implements Command {
  protected previousState?: TimelineState;
  
  abstract execute(state: TimelineState): TimelineState;
  abstract description: string;
  
  undo(state: TimelineState): TimelineState {
    if (!this.previousState) {
      throw new Error('Cannot undo: no previous state stored');
    }
    return this.previousState;
  }
  
  canExecute(state: TimelineState): boolean {
    return true;
  }
  
  canUndo(state: TimelineState): boolean {
    return this.previousState !== undefined;
  }
  
  protected storePreviousState(state: TimelineState): void {
    this.previousState = this.deepClone(state);
  }
  
  private deepClone(obj: TimelineState): TimelineState {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Command for adding a clip
 */
export class AddClipCommand extends BaseCommand {
  description = 'Add clip';
  
  constructor(
    private clipId: string,
    private trackId: string,
    private clipData: import('../types').Clip
  ) {
    super();
  }
  
  execute(state: TimelineState): TimelineState {
    this.storePreviousState(state);
    
    // Find the track and add the clip
    const newTracks = state.tracks.map(track => {
      if (track.id === this.trackId) {
        return {
          ...track,
          clips: [...track.clips, this.clipData].sort((a, b) => a.start - b.start)
        };
      }
      return track;
    });
    
    // Update duration if necessary
    const clipEnd = this.clipData.start + this.clipData.duration;
    const newDuration = Math.max(state.duration, clipEnd);
    
    return {
      ...state,
      tracks: newTracks,
      duration: newDuration
    };
  }
  
  canExecute(state: TimelineState): boolean {
    // Check if track exists
    const trackExists = state.tracks.some(track => track.id === this.trackId);
    if (!trackExists) return false;
    
    // Check if clip ID is unique
    const clipExists = state.tracks.some(track =>
      track.clips.some(clip => clip.id === this.clipId)
    );
    
    return !clipExists;
  }
}

/**
 * Command for removing a clip
 */
export class RemoveClipCommand extends BaseCommand {
  description = 'Remove clip';
  
  constructor(private clipId: string) {
    super();
  }
  
  execute(state: TimelineState): TimelineState {
    this.storePreviousState(state);
    
    const newTracks = state.tracks.map(track => ({
      ...track,
      clips: track.clips.filter(clip => clip.id !== this.clipId)
    }));
    
    const newSelectedClipId = state.selectedClipId === this.clipId 
      ? undefined 
      : state.selectedClipId;
    
    return {
      ...state,
      tracks: newTracks,
      selectedClipId: newSelectedClipId
    };
  }
  
  canExecute(state: TimelineState): boolean {
    return state.tracks.some(track =>
      track.clips.some(clip => clip.id === this.clipId)
    );
  }
}

/**
 * Command for updating a clip
 */
export class UpdateClipCommand extends BaseCommand {
  description = 'Update clip';
  
  constructor(
    private clipId: string,
    private updates: Partial<import('../types').Clip>
  ) {
    super();
  }
  
  execute(state: TimelineState): TimelineState {
    this.storePreviousState(state);
    
    const newTracks = state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => {
        if (clip.id === this.clipId) {
          return { ...clip, ...this.updates };
        }
        return clip;
      }).sort((a, b) => a.start - b.start)
    }));
    
    // Update duration if necessary
    const maxClipEnd = Math.max(
      ...newTracks.flatMap(track =>
        track.clips.map(clip => clip.start + clip.duration)
      ),
      0
    );
    const newDuration = Math.max(state.duration, maxClipEnd);
    
    return {
      ...state,
      tracks: newTracks,
      duration: newDuration
    };
  }
  
  canExecute(state: TimelineState): boolean {
    return state.tracks.some(track =>
      track.clips.some(clip => clip.id === this.clipId)
    );
  }
}

/**
 * Composite command for executing multiple commands as one
 */
export class CompositeCommand extends BaseCommand {
  description: string;
  
  constructor(
    private commands: Command[],
    description?: string
  ) {
    super();
    this.description = description || `Composite command (${commands.length} operations)`;
  }
  
  execute(state: TimelineState): TimelineState {
    this.storePreviousState(state);
    
    let currentState = state;
    for (const command of this.commands) {
      if (!command.canExecute(currentState)) {
        throw new Error(`Command "${command.description}" cannot be executed`);
      }
      currentState = command.execute(currentState);
    }
    
    return currentState;
  }
  
  canExecute(state: TimelineState): boolean {
    let currentState = state;
    for (const command of this.commands) {
      if (!command.canExecute(currentState)) {
        return false;
      }
      // Simulate execution to check next command
      try {
        currentState = command.execute(currentState);
      } catch {
        return false;
      }
    }
    return true;
  }
}

/**
 * History manager using command pattern
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number;
  
  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize;
  }
  
  executeCommand(command: Command, state: TimelineState): TimelineState {
    if (!command.canExecute(state)) {
      throw new Error(`Command "${command.description}" cannot be executed`);
    }
    
    const newState = command.execute(state);
    
    // Add to undo stack
    this.undoStack.push(command);
    
    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new command is executed
    this.redoStack = [];
    
    return newState;
  }
  
  undo(state: TimelineState): TimelineState {
    const command = this.undoStack.pop();
    if (!command) {
      return state; // Nothing to undo
    }
    
    if (!command.canUndo(state)) {
      // Put command back if it can't be undone
      this.undoStack.push(command);
      throw new Error(`Command "${command.description}" cannot be undone`);
    }
    
    const newState = command.undo(state);
    this.redoStack.push(command);
    
    return newState;
  }
  
  redo(state: TimelineState): TimelineState {
    const command = this.redoStack.pop();
    if (!command) {
      return state; // Nothing to redo
    }
    
    if (!command.canExecute(state)) {
      // Put command back if it can't be executed
      this.redoStack.push(command);
      throw new Error(`Command "${command.description}" cannot be redone`);
    }
    
    const newState = command.execute(state);
    this.undoStack.push(command);
    
    return newState;
  }
  
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
  
  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1];
    return command ? command.description : null;
  }
  
  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1];
    return command ? command.description : null;
  }
  
  getHistorySize(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length
    };
  }
}