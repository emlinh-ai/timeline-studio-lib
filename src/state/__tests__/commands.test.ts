import {
  AddClipCommand,
  RemoveClipCommand,
  UpdateClipCommand,
  CompositeCommand,
  CommandHistory
} from '../commands';
import { TimelineState, Clip, Track } from '../../types';

describe('Command Pattern', () => {
  let initialState: TimelineState;
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

    initialState = {
      tracks: [track],
      currentTime: 0,
      duration: 0,
      zoom: 1,
      selectedClipId: undefined,
      isPlaying: false
    };
  });

  describe('AddClipCommand', () => {
    it('should execute add clip command', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      expect(command.canExecute(initialState)).toBe(true);
      
      const newState = command.execute(initialState);
      
      expect(newState.tracks[0].clips).toHaveLength(1);
      expect(newState.tracks[0].clips[0]).toEqual(clip);
      expect(newState.duration).toBe(5); // clip.start + clip.duration
    });

    it('should undo add clip command', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      const newState = command.execute(initialState);
      expect(command.canUndo(newState)).toBe(true);
      
      const undoneState = command.undo(newState);
      
      expect(undoneState).toEqual(initialState);
    });

    it('should not execute if track does not exist', () => {
      const invalidClip = { ...clip, trackId: 'non-existent' };
      const command = new AddClipCommand(invalidClip.id, invalidClip.trackId, invalidClip);
      
      expect(command.canExecute(initialState)).toBe(false);
    });

    it('should not execute if clip ID already exists', () => {
      const stateWithClip = {
        ...initialState,
        tracks: [{
          ...track,
          clips: [clip]
        }]
      };
      
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      expect(command.canExecute(stateWithClip)).toBe(false);
    });

    it('should sort clips by start time after adding', () => {
      const clip1 = { ...clip, id: 'clip-1', start: 10 };
      const clip2 = { ...clip, id: 'clip-2', start: 5 };
      
      const stateWithClip1 = {
        ...initialState,
        tracks: [{
          ...track,
          clips: [clip1]
        }]
      };
      
      const command = new AddClipCommand(clip2.id, clip2.trackId, clip2);
      const newState = command.execute(stateWithClip1);
      
      const clips = newState.tracks[0].clips;
      expect(clips[0].start).toBe(5);
      expect(clips[1].start).toBe(10);
    });
  });

  describe('RemoveClipCommand', () => {
    let stateWithClip: TimelineState;

    beforeEach(() => {
      stateWithClip = {
        ...initialState,
        tracks: [{
          ...track,
          clips: [clip]
        }],
        selectedClipId: clip.id
      };
    });

    it('should execute remove clip command', () => {
      const command = new RemoveClipCommand(clip.id);
      
      expect(command.canExecute(stateWithClip)).toBe(true);
      
      const newState = command.execute(stateWithClip);
      
      expect(newState.tracks[0].clips).toHaveLength(0);
      expect(newState.selectedClipId).toBeUndefined();
    });

    it('should undo remove clip command', () => {
      const command = new RemoveClipCommand(clip.id);
      
      const newState = command.execute(stateWithClip);
      expect(command.canUndo(newState)).toBe(true);
      
      const undoneState = command.undo(newState);
      
      expect(undoneState).toEqual(stateWithClip);
    });

    it('should not execute if clip does not exist', () => {
      const command = new RemoveClipCommand('non-existent');
      
      expect(command.canExecute(stateWithClip)).toBe(false);
    });

    it('should preserve selectedClipId if different clip is selected', () => {
      const clip2 = { ...clip, id: 'clip-2' };
      const stateWithTwoClips = {
        ...stateWithClip,
        tracks: [{
          ...track,
          clips: [clip, clip2]
        }],
        selectedClipId: clip2.id
      };
      
      const command = new RemoveClipCommand(clip.id);
      const newState = command.execute(stateWithTwoClips);
      
      expect(newState.selectedClipId).toBe(clip2.id);
    });
  });

  describe('UpdateClipCommand', () => {
    let stateWithClip: TimelineState;

    beforeEach(() => {
      stateWithClip = {
        ...initialState,
        tracks: [{
          ...track,
          clips: [clip]
        }]
      };
    });

    it('should execute update clip command', () => {
      const updates = { start: 10, duration: 8 };
      const command = new UpdateClipCommand(clip.id, updates);
      
      expect(command.canExecute(stateWithClip)).toBe(true);
      
      const newState = command.execute(stateWithClip);
      
      const updatedClip = newState.tracks[0].clips[0];
      expect(updatedClip.start).toBe(10);
      expect(updatedClip.duration).toBe(8);
      expect(updatedClip.id).toBe(clip.id); // Should preserve other properties
    });

    it('should undo update clip command', () => {
      const updates = { start: 10, duration: 8 };
      const command = new UpdateClipCommand(clip.id, updates);
      
      const newState = command.execute(stateWithClip);
      expect(command.canUndo(newState)).toBe(true);
      
      const undoneState = command.undo(newState);
      
      expect(undoneState).toEqual(stateWithClip);
    });

    it('should not execute if clip does not exist', () => {
      const command = new UpdateClipCommand('non-existent', { start: 10 });
      
      expect(command.canExecute(stateWithClip)).toBe(false);
    });

    it('should update duration when clip extends beyond current duration', () => {
      const updates = { start: 20, duration: 15 };
      const command = new UpdateClipCommand(clip.id, updates);
      
      const newState = command.execute(stateWithClip);
      
      expect(newState.duration).toBe(35); // start + duration
    });

    it('should re-sort clips after update', () => {
      const clip2 = { ...clip, id: 'clip-2', start: 15 };
      const stateWithTwoClips = {
        ...stateWithClip,
        tracks: [{
          ...track,
          clips: [clip, clip2]
        }]
      };
      
      const updates = { start: 20 };
      const command = new UpdateClipCommand(clip.id, updates);
      const newState = command.execute(stateWithTwoClips);
      
      const clips = newState.tracks[0].clips;
      expect(clips[0].id).toBe('clip-2'); // Should be first now
      expect(clips[1].id).toBe('clip-1'); // Should be second
    });
  });

  describe('CompositeCommand', () => {
    it('should execute multiple commands', () => {
      const clip2 = { ...clip, id: 'clip-2', start: 10 };
      const commands = [
        new AddClipCommand(clip.id, clip.trackId, clip),
        new AddClipCommand(clip2.id, clip2.trackId, clip2)
      ];
      
      const compositeCommand = new CompositeCommand(commands, 'Add two clips');
      
      expect(compositeCommand.canExecute(initialState)).toBe(true);
      
      const newState = compositeCommand.execute(initialState);
      
      expect(newState.tracks[0].clips).toHaveLength(2);
      expect(newState.tracks[0].clips[0]).toEqual(clip);
      expect(newState.tracks[0].clips[1]).toEqual(clip2);
    });

    it('should undo composite command', () => {
      const clip2 = { ...clip, id: 'clip-2', start: 10 };
      const commands = [
        new AddClipCommand(clip.id, clip.trackId, clip),
        new AddClipCommand(clip2.id, clip2.trackId, clip2)
      ];
      
      const compositeCommand = new CompositeCommand(commands);
      
      const newState = compositeCommand.execute(initialState);
      expect(compositeCommand.canUndo(newState)).toBe(true);
      
      const undoneState = compositeCommand.undo(newState);
      
      expect(undoneState).toEqual(initialState);
    });

    it('should not execute if any command cannot execute', () => {
      const invalidClip = { ...clip, trackId: 'non-existent' };
      const commands = [
        new AddClipCommand(clip.id, clip.trackId, clip),
        new AddClipCommand(invalidClip.id, invalidClip.trackId, invalidClip)
      ];
      
      const compositeCommand = new CompositeCommand(commands);
      
      expect(compositeCommand.canExecute(initialState)).toBe(false);
    });

    it('should have descriptive name', () => {
      const commands = [
        new AddClipCommand(clip.id, clip.trackId, clip)
      ];
      
      const compositeCommand = new CompositeCommand(commands, 'Custom description');
      
      expect(compositeCommand.description).toBe('Custom description');
    });

    it('should have default description', () => {
      const commands = [
        new AddClipCommand(clip.id, clip.trackId, clip),
        new RemoveClipCommand('some-id')
      ];
      
      const compositeCommand = new CompositeCommand(commands);
      
      expect(compositeCommand.description).toBe('Composite command (2 operations)');
    });
  });

  describe('CommandHistory', () => {
    let history: CommandHistory;

    beforeEach(() => {
      history = new CommandHistory(5); // Small history for testing
    });

    it('should execute command and add to history', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      const newState = history.executeCommand(command, initialState);
      
      expect(newState.tracks[0].clips).toHaveLength(1);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should undo command', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      const newState = history.executeCommand(command, initialState);
      const undoneState = history.undo(newState);
      
      expect(undoneState).toEqual(initialState);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('should redo command', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      const newState = history.executeCommand(command, initialState);
      const undoneState = history.undo(newState);
      const redoneState = history.redo(undoneState);
      
      expect(redoneState).toEqual(newState);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should clear redo stack when new command is executed', () => {
      const command1 = new AddClipCommand(clip.id, clip.trackId, clip);
      const clip2 = { ...clip, id: 'clip-2' };
      const command2 = new AddClipCommand(clip2.id, clip2.trackId, clip2);
      
      let state = history.executeCommand(command1, initialState);
      state = history.undo(state);
      
      expect(history.canRedo()).toBe(true);
      
      state = history.executeCommand(command2, state);
      
      expect(history.canRedo()).toBe(false);
    });

    it('should limit history size', () => {
      const commands = Array.from({ length: 10 }, (_, i) => 
        new AddClipCommand(`clip-${i}`, track.id, {
          ...clip,
          id: `clip-${i}`,
          start: i * 5
        })
      );
      
      let state = initialState;
      for (const command of commands) {
        state = history.executeCommand(command, state);
      }
      
      const historySize = history.getHistorySize();
      expect(historySize.undo).toBe(5); // Limited to max size
    });

    it('should provide command descriptions', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      history.executeCommand(command, initialState);
      
      expect(history.getUndoDescription()).toBe('Add clip');
      expect(history.getRedoDescription()).toBeNull();
    });

    it('should clear history', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      history.executeCommand(command, initialState);
      expect(history.canUndo()).toBe(true);
      
      history.clear();
      
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });

    it('should handle undo when no history', () => {
      const result = history.undo(initialState);
      
      expect(result).toBe(initialState);
      expect(history.canUndo()).toBe(false);
    });

    it('should handle redo when no future', () => {
      const result = history.redo(initialState);
      
      expect(result).toBe(initialState);
      expect(history.canRedo()).toBe(false);
    });

    it('should throw error when command cannot execute', () => {
      const invalidClip = { ...clip, trackId: 'non-existent' };
      const command = new AddClipCommand(invalidClip.id, invalidClip.trackId, invalidClip);
      
      expect(() => {
        history.executeCommand(command, initialState);
      }).toThrow('Command "Add clip" cannot be executed');
    });

    it('should get history size', () => {
      const command = new AddClipCommand(clip.id, clip.trackId, clip);
      
      let state = history.executeCommand(command, initialState);
      state = history.undo(state);
      
      const size = history.getHistorySize();
      
      expect(size.undo).toBe(0);
      expect(size.redo).toBe(1);
    });
  });
});