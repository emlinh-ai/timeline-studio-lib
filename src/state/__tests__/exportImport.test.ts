import {
  exportState,
  exportStateAsJSON,
  exportStateAsCompressedJSON,
  importState,
  importStateFromJSON,
  mergeStates,
  validateExportData,
  getExportMetadata,
  createBackup,
  restoreFromBackup,
  EXPORT_VERSION,
  ExportedState,
  ExportOptions,
  ImportOptions
} from '../exportImport';
import { TimelineState, Track, Clip } from '../../types';

describe('exportImport', () => {
  let sampleState: TimelineState;
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
      type: 'video',
      metadata: {
        name: 'Sample Clip',
        thumbnailUrl: 'https://example.com/thumb.jpg'
      }
    };

    track.clips = [clip];

    sampleState = {
      tracks: [track],
      currentTime: 2.5,
      duration: 10,
      zoom: 1.5,
      selectedClipId: 'clip-1',
      isPlaying: false
    };
  });

  describe('exportState', () => {
    it('should export state with default options', () => {
      const exported = exportState(sampleState);

      expect(exported.version).toBe(EXPORT_VERSION);
      expect(exported.timestamp).toBeGreaterThan(0);
      expect(exported.data).toEqual(sampleState);
      expect(exported.metadata).toBeDefined();
      expect(exported.metadata?.exportedBy).toBe('React Timeline Library');
    });

    it('should export state without metadata', () => {
      const exported = exportState(sampleState, { includeMetadata: false });

      expect(exported.metadata).toBeUndefined();
      expect(exported.data).toEqual(sampleState);
    });

    it('should export state with custom version', () => {
      const customVersion = '2.0.0';
      const exported = exportState(sampleState, { version: customVersion });

      expect(exported.version).toBe(customVersion);
    });

    it('should create deep copy of state', () => {
      const exported = exportState(sampleState);

      // Modify original state
      sampleState.tracks[0].name = 'Modified Track';

      // Exported data should remain unchanged
      expect(exported.data.tracks[0].name).toBe('Video Track');
    });

    it('should throw error for invalid state', () => {
      const invalidState = {
        ...sampleState,
        currentTime: -1 // Invalid
      };

      expect(() => exportState(invalidState)).toThrow('Cannot export invalid state');
    });
  });

  describe('exportStateAsJSON', () => {
    it('should export state as formatted JSON string', () => {
      const jsonString = exportStateAsJSON(sampleState);
      const parsed = JSON.parse(jsonString);

      expect(parsed.version).toBe(EXPORT_VERSION);
      expect(parsed.data).toEqual(sampleState);
      expect(jsonString).toContain('\n'); // Should be formatted
    });

    it('should handle export errors', () => {
      const invalidState = {
        ...sampleState,
        duration: -1 // Invalid
      };

      expect(() => exportStateAsJSON(invalidState)).toThrow('Failed to export state as JSON');
    });
  });

  describe('exportStateAsCompressedJSON', () => {
    it('should export state as compressed JSON string', () => {
      const compressedString = exportStateAsCompressedJSON(sampleState);
      const parsed = JSON.parse(compressedString);

      expect(parsed.version).toBe(EXPORT_VERSION);
      expect(parsed.data).toEqual(sampleState);
      expect(compressedString).not.toContain('\n'); // Should not be formatted
    });

    it('should be smaller than formatted JSON', () => {
      const formatted = exportStateAsJSON(sampleState);
      const compressed = exportStateAsCompressedJSON(sampleState);

      expect(compressed.length).toBeLessThan(formatted.length);
    });
  });

  describe('importState', () => {
    let exportedState: ExportedState;

    beforeEach(() => {
      exportedState = exportState(sampleState);
    });

    it('should import state from exported data', () => {
      const imported = importState(exportedState);

      expect(imported).toEqual(sampleState);
    });

    it('should import state from JSON string', () => {
      const jsonString = JSON.stringify(exportedState);
      const imported = importState(jsonString);

      expect(imported).toEqual(sampleState);
    });

    it('should validate imported data by default', () => {
      const invalidExported = {
        ...exportedState,
        data: {
          ...exportedState.data,
          currentTime: -1 // Invalid
        }
      };

      expect(() => importState(invalidExported)).toThrow('Invalid imported state');
    });

    it('should skip validation when disabled', () => {
      const invalidExported = {
        ...exportedState,
        data: {
          ...exportedState.data,
          currentTime: -1 // Invalid
        }
      };

      const imported = importState(invalidExported, { validateData: false });
      expect(imported.currentTime).toBe(-1);
    });

    it('should generate new IDs when preserveIds is false', () => {
      const imported = importState(exportedState, { preserveIds: false });

      expect(imported.tracks[0].id).not.toBe(sampleState.tracks[0].id);
      expect(imported.tracks[0].clips[0].id).not.toBe(sampleState.tracks[0].clips[0].id);
      expect(imported.selectedClipId).toBeUndefined(); // Should clear selection
    });

    it('should throw error for invalid JSON', () => {
      expect(() => importState('invalid json')).toThrow('Invalid JSON format');
    });

    it('should throw error for missing required fields', () => {
      const invalidData = { version: '1.0.0' }; // Missing timestamp and data

      expect(() => importState(invalidData as any)).toThrow('Missing required export data fields');
    });

    it('should throw error for incompatible version', () => {
      const incompatibleExported = {
        ...exportedState,
        version: '999.0.0' // Incompatible version
      };

      expect(() => importState(incompatibleExported)).toThrow('Incompatible export version');
    });
  });

  describe('importStateFromJSON', () => {
    it('should import state from JSON string', () => {
      const exported = exportState(sampleState);
      const jsonString = JSON.stringify(exported);
      const imported = importStateFromJSON(jsonString);

      expect(imported).toEqual(sampleState);
    });
  });

  describe('mergeStates', () => {
    let currentState: TimelineState;
    let importedState: TimelineState;

    beforeEach(() => {
      currentState = {
        tracks: [{
          id: 'current-track',
          type: 'audio',
          name: 'Current Track',
          height: 80,
          isVisible: true,
          clips: [{
            id: 'current-clip',
            trackId: 'current-track',
            start: 0,
            duration: 3,
            type: 'audio'
          }]
        }],
        currentTime: 1,
        duration: 5,
        zoom: 1,
        selectedClipId: 'current-clip',
        isPlaying: false
      };

      importedState = {
        tracks: [{
          id: 'imported-track',
          type: 'video',
          name: 'Imported Track',
          height: 100,
          isVisible: true,
          clips: [{
            id: 'imported-clip',
            trackId: 'imported-track',
            start: 5,
            duration: 4,
            type: 'video'
          }]
        }],
        currentTime: 2,
        duration: 15,
        zoom: 2,
        selectedClipId: 'imported-clip',
        isPlaying: true
      };
    });

    it('should append imported tracks by default', () => {
      const merged = mergeStates(currentState, importedState);

      expect(merged.tracks).toHaveLength(2);
      expect(merged.tracks[0].id).toBe('current-track');
      expect(merged.tracks[1].id).not.toBe('imported-track'); // Should have new ID
      expect(merged.duration).toBe(15); // Should use max duration
    });

    it('should replace tracks when specified', () => {
      const merged = mergeStates(currentState, importedState, {
        trackMergeStrategy: 'replace'
      });

      expect(merged.tracks).toHaveLength(1);
      expect(merged.tracks[0]).toEqual(importedState.tracks[0]);
    });

    it('should merge by type when specified', () => {
      // Add a video track to current state
      currentState.tracks.push({
        id: 'current-video',
        type: 'video',
        name: 'Current Video',
        height: 100,
        isVisible: true,
        clips: []
      });

      const merged = mergeStates(currentState, importedState, {
        trackMergeStrategy: 'merge-by-type'
      });

      // Should have audio track + merged video track
      expect(merged.tracks).toHaveLength(2);
      const videoTrack = merged.tracks.find(t => t.type === 'video');
      expect(videoTrack?.clips).toHaveLength(1); // Should have imported clip
    });

    it('should keep current values when specified', () => {
      const merged = mergeStates(currentState, importedState, {
        conflictResolution: 'keep-current'
      });

      expect(merged.currentTime).toBe(currentState.currentTime);
      expect(merged.zoom).toBe(currentState.zoom);
      expect(merged.selectedClipId).toBe(currentState.selectedClipId);
      expect(merged.isPlaying).toBe(currentState.isPlaying);
    });

    it('should use imported values by default', () => {
      const merged = mergeStates(currentState, importedState);

      expect(merged.currentTime).toBe(importedState.currentTime);
      expect(merged.zoom).toBe(importedState.zoom);
      // selectedClipId will be undefined because the clip ID doesn't exist in merged tracks
      expect(merged.selectedClipId).toBeUndefined();
      expect(merged.isPlaying).toBe(importedState.isPlaying);
    });
  });

  describe('validateExportData', () => {
    it('should validate correct export data', () => {
      const exported = exportState(sampleState);
      expect(validateExportData(exported)).toBe(true);
    });

    it('should reject invalid data types', () => {
      expect(validateExportData(null)).toBe(false);
      expect(validateExportData('string')).toBe(false);
      expect(validateExportData(123)).toBe(false);
      expect(validateExportData([])).toBe(false);
    });

    it('should reject missing required fields', () => {
      expect(validateExportData({})).toBe(false);
      expect(validateExportData({ version: '1.0.0' })).toBe(false);
      expect(validateExportData({ version: '1.0.0', timestamp: 123 })).toBe(false);
    });

    it('should validate complete export data', () => {
      const validData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: sampleState
      };

      expect(validateExportData(validData)).toBe(true);
    });
  });

  describe('getExportMetadata', () => {
    it('should extract metadata from exported state', () => {
      const exported = exportState(sampleState);
      const metadata = getExportMetadata(exported);

      expect(metadata.version).toBe(EXPORT_VERSION);
      expect(metadata.timestamp).toBeInstanceOf(Date);
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.trackCount).toBe(1);
      expect(metadata.clipCount).toBe(1);
      expect(metadata.duration).toBe(10);
    });

    it('should calculate correct clip count for multiple tracks', () => {
      const multiTrackState = {
        ...sampleState,
        tracks: [
          ...sampleState.tracks,
          {
            id: 'track-2',
            type: 'audio' as const,
            name: 'Audio Track',
            height: 80,
            isVisible: true,
            clips: [
              { id: 'clip-2', trackId: 'track-2', start: 0, duration: 3, type: 'audio' as const },
              { id: 'clip-3', trackId: 'track-2', start: 5, duration: 2, type: 'audio' as const }
            ]
          }
        ]
      };

      const exported = exportState(multiTrackState);
      const metadata = getExportMetadata(exported);

      expect(metadata.trackCount).toBe(2);
      expect(metadata.clipCount).toBe(3);
    });
  });

  describe('createBackup and restoreFromBackup', () => {
    it('should create and restore backup', () => {
      const backup = createBackup(sampleState, 'Test backup');
      const restored = restoreFromBackup(backup);

      expect(restored).toEqual(sampleState);
      expect(backup.metadata?.description).toBe('Test backup');
    });

    it('should restore with custom options', () => {
      const backup = createBackup(sampleState);
      const restored = restoreFromBackup(backup, { preserveIds: false });

      expect(restored.tracks[0].id).not.toBe(sampleState.tracks[0].id);
      expect(restored.selectedClipId).toBeUndefined();
    });
  });

  describe('Integration tests', () => {
    it('should handle complete export/import workflow', () => {
      // Export state
      const exported = exportState(sampleState, { includeMetadata: true });
      const jsonString = exportStateAsJSON(sampleState);
      
      // Validate export
      expect(validateExportData(exported)).toBe(true);
      
      // Get metadata
      const metadata = getExportMetadata(exported);
      expect(metadata.clipCount).toBe(1);
      
      // Import from object
      const imported1 = importState(exported);
      expect(imported1).toEqual(sampleState);
      
      // Import from JSON
      const imported2 = importStateFromJSON(jsonString);
      expect(imported2).toEqual(sampleState);
      
      // Import with new IDs
      const imported3 = importState(exported, { preserveIds: false });
      expect(imported3.tracks[0].id).not.toBe(sampleState.tracks[0].id);
    });

    it('should handle complex merge scenarios', () => {
      const state1: TimelineState = {
        tracks: [{
          id: 'video-track',
          type: 'video',
          name: 'Video',
          height: 100,
          isVisible: true,
          clips: [{
            id: 'video-clip-1',
            trackId: 'video-track',
            start: 0,
            duration: 5,
            type: 'video'
          }]
        }],
        currentTime: 0,
        duration: 10,
        zoom: 1,
        selectedClipId: undefined,
        isPlaying: false
      };

      const state2: TimelineState = {
        tracks: [{
          id: 'audio-track',
          type: 'audio',
          name: 'Audio',
          height: 80,
          isVisible: true,
          clips: [{
            id: 'audio-clip-1',
            trackId: 'audio-track',
            start: 2,
            duration: 6,
            type: 'audio'
          }]
        }],
        currentTime: 5,
        duration: 15,
        zoom: 2,
        selectedClipId: 'audio-clip-1',
        isPlaying: true
      };

      // Test different merge strategies
      const appendMerged = mergeStates(state1, state2, { trackMergeStrategy: 'append' });
      expect(appendMerged.tracks).toHaveLength(2);

      const replaceMerged = mergeStates(state1, state2, { trackMergeStrategy: 'replace' });
      expect(replaceMerged.tracks).toHaveLength(1);
      expect(replaceMerged.tracks[0].type).toBe('audio');

      // Test conflict resolution
      const keepCurrentMerged = mergeStates(state1, state2, { conflictResolution: 'keep-current' });
      expect(keepCurrentMerged.currentTime).toBe(0);
      expect(keepCurrentMerged.zoom).toBe(1);
    });

    it('should handle error scenarios gracefully', () => {
      // Invalid export data
      expect(() => importState('not json')).toThrow();
      expect(() => importState({} as any)).toThrow();
      
      // Invalid state for export
      const invalidState = { ...sampleState, tracks: 'not array' as any };
      expect(() => exportState(invalidState)).toThrow();
      
      // Version incompatibility
      const futureVersion = { ...exportState(sampleState), version: '999.0.0' };
      expect(() => importState(futureVersion)).toThrow();
    });
  });
});