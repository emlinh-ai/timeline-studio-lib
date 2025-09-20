import {
    exportState,
    importState,
    exportStateAsJSON,
    exportStateAsCompressedJSON,
    importStateFromJSON,
    mergeStates,
    validateExportData,
    getExportMetadata,
    createBackup,
    restoreFromBackup,
    ExportedState,
    ExportOptions,
    ImportOptions,
    EXPORT_VERSION
} from '../exportImport';
import { TimelineState, Clip, Track, ValidationError } from '../../types';

describe('State Export/Import', () => {
    let timelineState: TimelineState;
    let track: Track;
    let clip: Clip;

    beforeEach(() => {
        clip = {
            id: 'clip-1',
            trackId: 'track-1',
            start: 0,
            duration: 5,
            type: 'video',
            metadata: {
                name: 'Test Clip',
                thumbnailUrl: 'https://example.com/thumb.jpg'
            }
        };

        track = {
            id: 'track-1',
            type: 'video',
            name: 'Video Track',
            height: 100,
            isVisible: true,
            clips: [clip]
        };

        timelineState = {
            tracks: [track],
            currentTime: 10,
            duration: 100,
            zoom: 2,
            selectedClipId: 'clip-1',
            isPlaying: false
        };
    });

    describe('exportState', () => {
        it('should export timeline state with metadata', () => {
            const exported = exportState(timelineState);

            expect(exported.version).toBe(EXPORT_VERSION);
            expect(exported.timestamp).toBeGreaterThan(0);
            expect(exported.data).toEqual(timelineState);
            expect(exported.metadata).toBeDefined();
            expect(exported.metadata?.exportedBy).toBe('React Timeline Library');
        });

        it('should export without metadata when disabled', () => {
            const exported = exportState(timelineState, {
                includeMetadata: false
            });

            expect(exported.metadata).toBeUndefined();
        });

        it('should validate state before export', () => {
            const invalidState = {
                ...timelineState,
                currentTime: -1 // Invalid
            };

            expect(() => {
                exportState(invalidState);
            }).toThrow('Cannot export invalid state');
        });

        it('should handle custom version', () => {
            const exported = exportState(timelineState, {
                version: '2.0.0'
            });

            expect(exported.version).toBe('2.0.0');
        });

        it('should create deep clone of state data', () => {
            const exported = exportState(timelineState);

            // Modify original state
            timelineState.currentTime = 999;
            timelineState.tracks[0].name = 'Modified';

            // Exported data should be unchanged
            expect(exported.data.currentTime).toBe(10);
            expect(exported.data.tracks[0].name).toBe('Video Track');
        });
    });

    describe('importState', () => {
        let exportedState: ExportedState;

        beforeEach(() => {
            exportedState = exportState(timelineState);
        });

        it('should import timeline state from exported data', () => {
            const imported = importState(exportedState);

            expect(imported).toEqual(timelineState);
        });

        it('should import from JSON string', () => {
            const jsonString = JSON.stringify(exportedState);
            const imported = importState(jsonString);

            expect(imported).toEqual(timelineState);
        });

        it('should validate imported state by default', () => {
            const invalidExported = {
                ...exportedState,
                data: {
                    ...exportedState.data,
                    currentTime: -1 // Invalid
                }
            };

            expect(() => {
                importState(invalidExported);
            }).toThrow('Invalid imported state');
        });

        it('should skip validation when disabled', () => {
            const invalidExported = {
                ...exportedState,
                data: {
                    ...exportedState.data,
                    currentTime: -1 // Invalid
                }
            };

            expect(() => {
                importState(invalidExported, { validateData: false });
            }).not.toThrow();
        });

        it('should check version compatibility', () => {
            const incompatibleExported = {
                ...exportedState,
                version: '2.0.0' // Incompatible version
            };

            expect(() => {
                importState(incompatibleExported);
            }).toThrow('Incompatible export version');
        });

        it('should generate new IDs when preserveIds is false', () => {
            const imported = importState(exportedState, { preserveIds: false });

            expect(imported.tracks[0].id).not.toBe(timelineState.tracks[0].id);
            expect(imported.tracks[0].clips[0].id).not.toBe(timelineState.tracks[0].clips[0].id);
            expect(imported.selectedClipId).toBeUndefined(); // Should be cleared
        });

        it('should handle invalid JSON string', () => {
            const invalidJson = '{ invalid json }';

            expect(() => {
                importState(invalidJson);
            }).toThrow('Invalid JSON format');
        });

        it('should handle invalid export format', () => {
            const invalidFormat = { not: 'valid export data' } as any;

            expect(() => {
                importState(invalidFormat);
            }).toThrow('Missing required export data fields');
        });

        it('should handle missing required fields', () => {
            const incompleteExport = {
                version: EXPORT_VERSION,
                // Missing timestamp and data
            } as any;

            expect(() => {
                importState(incompleteExport);
            }).toThrow('Missing required export data fields');
        });
    });

    describe('exportStateAsJSON', () => {
        it('should export state as formatted JSON string', () => {
            const jsonString = exportStateAsJSON(timelineState);

            expect(typeof jsonString).toBe('string');

            const parsed = JSON.parse(jsonString);
            expect(parsed.version).toBe(EXPORT_VERSION);
            expect(parsed.data).toEqual(timelineState);

            // Should be formatted (contains newlines)
            expect(jsonString).toContain('\n');
        });

        it('should handle export errors', () => {
            const invalidState = {
                ...timelineState,
                currentTime: -1 // Invalid
            };

            expect(() => {
                exportStateAsJSON(invalidState);
            }).toThrow('Failed to export state as JSON');
        });
    });

    describe('exportStateAsCompressedJSON', () => {
        it('should export state as compressed JSON string', () => {
            const compressedJson = exportStateAsCompressedJSON(timelineState);
            const normalJson = exportStateAsJSON(timelineState);

            expect(typeof compressedJson).toBe('string');
            expect(compressedJson.length).toBeLessThan(normalJson.length);

            // Should not contain formatting
            expect(compressedJson).not.toContain('\n  ');
        });

        it('should handle export errors', () => {
            const invalidState = {
                ...timelineState,
                currentTime: -1 // Invalid
            };

            expect(() => {
                exportStateAsCompressedJSON(invalidState);
            }).toThrow('Failed to export state as compressed JSON');
        });
    });

    describe('importStateFromJSON', () => {
        it('should import state from JSON string', () => {
            const jsonString = exportStateAsJSON(timelineState);
            const imported = importStateFromJSON(jsonString);

            expect(imported).toEqual(timelineState);
        });

        it('should pass through import options', () => {
            const exported = exportState(timelineState);
            const jsonString = JSON.stringify(exported);

            const imported = importStateFromJSON(jsonString, { preserveIds: false });

            expect(imported.tracks[0].id).not.toBe(timelineState.tracks[0].id);
        });
    });

    describe('mergeStates', () => {
        let importedState: TimelineState;
        let audioTrack: Track;

        beforeEach(() => {
            audioTrack = {
                id: 'track-2',
                type: 'audio',
                name: 'Audio Track',
                height: 80,
                isVisible: true,
                clips: [{
                    id: 'clip-2',
                    trackId: 'track-2',
                    start: 5,
                    duration: 3,
                    type: 'audio',
                    metadata: { name: 'Audio Clip' }
                }]
            };

            importedState = {
                tracks: [audioTrack],
                currentTime: 20,
                duration: 150,
                zoom: 3,
                selectedClipId: 'clip-2',
                isPlaying: true
            };
        });

        it('should append imported tracks by default', () => {
            const merged = mergeStates(timelineState, importedState);

            expect(merged.tracks).toHaveLength(2);
            expect(merged.tracks[0]).toEqual(timelineState.tracks[0]);
            expect(merged.tracks[1].type).toBe('audio');
            expect(merged.tracks[1].id).not.toBe('track-2'); // Should have new ID
        });

        it('should replace tracks when strategy is replace', () => {
            const merged = mergeStates(timelineState, importedState, {
                trackMergeStrategy: 'replace'
            });

            expect(merged.tracks).toHaveLength(1);
            expect(merged.tracks[0].type).toBe('audio');
        });

        it('should merge tracks by type', () => {
            const videoTrackImported: Track = {
                id: 'track-3',
                type: 'video',
                name: 'Imported Video Track',
                height: 100,
                isVisible: true,
                clips: [{
                    id: 'clip-3',
                    trackId: 'track-3',
                    start: 10,
                    duration: 2,
                    type: 'video'
                }]
            };

            const stateWithVideoTrack = {
                ...importedState,
                tracks: [videoTrackImported]
            };

            const merged = mergeStates(timelineState, stateWithVideoTrack, {
                trackMergeStrategy: 'merge-by-type'
            });

            expect(merged.tracks).toHaveLength(1);
            expect(merged.tracks[0].clips).toHaveLength(2); // Original + imported
        });

        it('should handle conflict resolution - keep current', () => {
            const merged = mergeStates(timelineState, importedState, {
                conflictResolution: 'keep-current'
            });

            expect(merged.currentTime).toBe(timelineState.currentTime);
            expect(merged.zoom).toBe(timelineState.zoom);
            expect(merged.isPlaying).toBe(timelineState.isPlaying);
        });

        it('should handle conflict resolution - use imported', () => {
            const merged = mergeStates(timelineState, importedState, {
                conflictResolution: 'use-imported'
            });

            expect(merged.currentTime).toBe(importedState.currentTime);
            expect(merged.zoom).toBe(importedState.zoom);
            expect(merged.isPlaying).toBe(importedState.isPlaying);
        });

        it('should clear invalid selectedClipId', () => {
            const merged = mergeStates(timelineState, importedState);

            // selectedClipId from imported state should be cleared since clip doesn't exist in merged state
            expect(merged.selectedClipId).toBeUndefined();
        });

        it('should validate merged state', () => {
            // This should not throw since merge should produce valid state
            expect(() => {
                mergeStates(timelineState, importedState);
            }).not.toThrow();
        });
    });

    describe('validateExportData', () => {
        it('should validate correct export data', () => {
            const exported = exportState(timelineState);

            expect(validateExportData(exported)).toBe(true);
        });

        it('should reject invalid export data', () => {
            expect(validateExportData(null)).toBe(false);
            expect(validateExportData(undefined)).toBe(false);
            expect(validateExportData('string')).toBe(false);
            expect(validateExportData({})).toBe(false);
            expect(validateExportData({ version: '1.0.0' })).toBe(false); // Missing fields
        });

        it('should validate required fields', () => {
            const validExport = {
                version: '1.0.0',
                timestamp: Date.now(),
                data: timelineState
            };

            expect(validateExportData(validExport)).toBe(true);
        });
    });

    describe('getExportMetadata', () => {
        it('should return export metadata', () => {
            const exported = exportState(timelineState);
            const metadata = getExportMetadata(exported);

            expect(metadata.version).toBe(EXPORT_VERSION);
            expect(metadata.timestamp).toBeInstanceOf(Date);
            expect(metadata.size).toBeGreaterThan(0);
            expect(metadata.trackCount).toBe(1);
            expect(metadata.clipCount).toBe(1);
            expect(metadata.duration).toBe(100);
        });

        it('should calculate correct clip count', () => {
            const multiClipState = {
                ...timelineState,
                tracks: [{
                    ...timelineState.tracks[0],
                    clips: [
                        ...timelineState.tracks[0].clips,
                        { ...clip, id: 'clip-2', start: 10 },
                        { ...clip, id: 'clip-3', start: 20 }
                    ]
                }]
            };

            const exported = exportState(multiClipState);
            const metadata = getExportMetadata(exported);

            expect(metadata.clipCount).toBe(3);
        });
    });

    describe('createBackup', () => {
        it('should create backup with metadata', () => {
            const backup = createBackup(timelineState);

            expect(backup.version).toBe(EXPORT_VERSION);
            expect(backup.data).toEqual(timelineState);
            expect(backup.metadata).toBeDefined();
            expect(backup.metadata?.exportedBy).toBe('React Timeline Library');
        });

        it('should include description in metadata', () => {
            const description = 'Test backup';
            const backup = createBackup(timelineState, description);

            expect(backup.metadata?.description).toBe(description);
        });

        it('should validate state before backup', () => {
            const invalidState = {
                ...timelineState,
                currentTime: -1 // Invalid
            };

            expect(() => {
                createBackup(invalidState);
            }).toThrow('Cannot export invalid state');
        });
    });

    describe('restoreFromBackup', () => {
        it('should restore state from backup', () => {
            const backup = createBackup(timelineState);
            const restored = restoreFromBackup(backup);

            expect(restored).toEqual(timelineState);
        });

        it('should validate restored state', () => {
            const backup = createBackup(timelineState);
            // Corrupt the backup data
            backup.data.currentTime = -1;

            expect(() => {
                restoreFromBackup(backup);
            }).toThrow('Invalid imported state');
        });

        it('should pass through import options', () => {
            const backup = createBackup(timelineState);
            const restored = restoreFromBackup(backup, { preserveIds: false });

            expect(restored.tracks[0].id).not.toBe(timelineState.tracks[0].id);
        });
    });

    describe('Edge cases and error scenarios', () => {
        it('should handle empty timeline state', () => {
            const emptyState: TimelineState = {
                tracks: [],
                currentTime: 0,
                duration: 0,
                zoom: 1,
                isPlaying: false
            };

            const exported = exportState(emptyState);
            const imported = importState(exported);

            expect(imported).toEqual(emptyState);
        });

        it('should handle large timeline state', () => {
            // Create a large state with many tracks and clips
            const largeTracks: Track[] = Array.from({ length: 10 }, (_, i) => ({
                id: `track-${i}`,
                type: 'video' as const,
                name: `Track ${i}`,
                height: 100,
                isVisible: true,
                clips: Array.from({ length: 50 }, (_, j) => ({
                    id: `clip-${i}-${j}`,
                    trackId: `track-${i}`,
                    start: j * 2,
                    duration: 1.5,
                    type: 'video' as const,
                    metadata: {
                        name: `Clip ${i}-${j}`,
                        thumbnailUrl: `https://example.com/thumb-${i}-${j}.jpg`
                    }
                }))
            }));

            const largeState: TimelineState = {
                tracks: largeTracks,
                currentTime: 0,
                duration: 200,
                zoom: 1,
                isPlaying: false
            };

            const exported = exportState(largeState);
            const imported = importState(exported);

            expect(imported).toEqual(largeState);
            expect(imported.tracks).toHaveLength(10);
            expect(imported.tracks[0].clips).toHaveLength(50);
        });

        it('should handle corrupted export data gracefully', () => {
            const exported = exportState(timelineState);

            // Test various corruption scenarios
            expect(() => importState('')).toThrow();
            expect(() => importState('invalid json')).toThrow();
            expect(() => importState('{}')).toThrow();
            expect(() => importState({ ...exported, version: undefined as any })).toThrow();
            expect(() => importState({ ...exported, data: null as any })).toThrow();
        });

        it('should handle circular references in metadata', () => {
            const exported = exportState(timelineState);

            // Add circular reference to metadata
            if (exported.metadata) {
                (exported.metadata as any).circular = exported.metadata;
            }

            // Should still be able to import the core data
            const imported = importState(exported);
            expect(imported).toEqual(timelineState);
        });

        it('should preserve clip metadata during export/import', () => {
            const stateWithMetadata: TimelineState = {
                ...timelineState,
                tracks: [{
                    ...timelineState.tracks[0],
                    clips: [{
                        ...timelineState.tracks[0].clips[0],
                        metadata: {
                            name: 'Test Clip',
                            speed: 1.5,
                            isAI: true,
                            thumbnailUrl: 'https://example.com/thumb.jpg',
                            waveform: [0.1, 0.2, 0.3, 0.4, 0.5],
                            text: 'Sample text',
                            style: { color: 'red', fontSize: '16px' }
                        }
                    }]
                }]
            };

            const exported = exportState(stateWithMetadata);
            const imported = importState(exported);

            expect(imported.tracks[0].clips[0].metadata).toEqual(stateWithMetadata.tracks[0].clips[0].metadata);
        });
    });

    describe('Performance and compatibility', () => {
        it('should handle version compatibility checks', () => {
            const exported = exportState(timelineState);

            // Test different version scenarios
            const futureVersion = { ...exported, version: '2.0.0' };
            const pastVersion = { ...exported, version: '0.9.0' };

            expect(() => importState(futureVersion)).toThrow('Incompatible export version');
            expect(() => importState(pastVersion)).toThrow('Incompatible export version');
        });

        it('should maintain data integrity through multiple export/import cycles', () => {
            let currentState = timelineState;

            // Perform multiple export/import cycles
            for (let i = 0; i < 5; i++) {
                const exported = exportState(currentState);
                currentState = importState(exported);
            }

            expect(currentState).toEqual(timelineState);
        });

        it('should handle concurrent export/import operations', async () => {
            const promises = Array.from({ length: 10 }, async () => {
                const exported = exportState(timelineState);
                return importState(exported);
            });

            const results = await Promise.all(promises);

            results.forEach(result => {
                expect(result).toEqual(timelineState);
            });
        });

        it('should export/import with reasonable performance', () => {
            const start = performance.now();

            const exported = exportState(timelineState);
            const imported = importState(exported);

            const end = performance.now();
            const duration = end - start;

            // Should complete within reasonable time (100ms)
            expect(duration).toBeLessThan(100);
            expect(imported).toEqual(timelineState);
        });
    });
});