import { TimelineState } from '../types';
import { validateTimelineState } from './validation';

/**
 * Export/Import functionality for timeline state
 */

export interface ExportOptions {
  includeMetadata?: boolean;
  format?: 'json' | 'compressed';
  version?: string;
}

export interface ImportOptions {
  validateData?: boolean;
  mergeWithCurrent?: boolean;
  preserveIds?: boolean;
}

export interface ExportedState {
  version: string;
  timestamp: number;
  data: TimelineState;
  metadata?: {
    exportedBy?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Current export format version
 */
export const EXPORT_VERSION = '1.0.0';

/**
 * Exports timeline state to a serializable format
 */
export function exportState(
  state: TimelineState,
  options: ExportOptions = {}
): ExportedState {
  const {
    includeMetadata = true,
    format = 'json',
    version = EXPORT_VERSION
  } = options;

  // Validate state before export
  try {
    validateTimelineState(state);
  } catch (error) {
    throw new Error(`Cannot export invalid state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const exportedState: ExportedState = {
    version,
    timestamp: Date.now(),
    data: JSON.parse(JSON.stringify(state)) // Deep clone to avoid mutations
  };

  if (includeMetadata) {
    exportedState.metadata = {
      exportedBy: 'React Timeline Library',
      description: 'Timeline state export',
      tags: []
    };
  }

  return exportedState;
}

/**
 * Exports timeline state as JSON string
 */
export function exportStateAsJSON(
  state: TimelineState,
  options: ExportOptions = {}
): string {
  try {
    const exportedState = exportState(state, options);
    return JSON.stringify(exportedState, null, 2);
  } catch (error) {
    throw new Error(`Failed to export state as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Exports timeline state as compressed JSON string
 */
export function exportStateAsCompressedJSON(
  state: TimelineState,
  options: ExportOptions = {}
): string {
  try {
    const exportedState = exportState(state, { ...options, format: 'compressed' });
    return JSON.stringify(exportedState); // No formatting for compression
  } catch (error) {
    throw new Error(`Failed to export state as compressed JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Imports timeline state from exported data
 */
export function importState(
  exportedData: ExportedState | string,
  options: ImportOptions = {}
): TimelineState {
  const {
    validateData = true,
    mergeWithCurrent = false,
    preserveIds = true
  } = options;

  let parsedData: ExportedState;

  // Parse if string
  if (typeof exportedData === 'string') {
    try {
      parsedData = JSON.parse(exportedData);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    parsedData = exportedData;
  }

  // Validate export format
  if (!parsedData || typeof parsedData !== 'object') {
    throw new Error('Invalid export data format');
  }

  if (!parsedData.version || !parsedData.timestamp || !parsedData.data) {
    throw new Error('Missing required export data fields');
  }

  // Check version compatibility
  if (!isVersionCompatible(parsedData.version)) {
    throw new Error(`Incompatible export version: ${parsedData.version}. Current version: ${EXPORT_VERSION}`);
  }

  let importedState = parsedData.data;

  // Validate imported state
  if (validateData) {
    try {
      validateTimelineState(importedState);
    } catch (error) {
      throw new Error(`Invalid imported state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate new IDs if not preserving
  if (!preserveIds) {
    importedState = generateNewIds(importedState);
  }

  return importedState;
}

/**
 * Imports timeline state from JSON string
 */
export function importStateFromJSON(
  jsonString: string,
  options: ImportOptions = {}
): TimelineState {
  return importState(jsonString, options);
}

/**
 * Merges imported state with current state
 */
export function mergeStates(
  currentState: TimelineState,
  importedState: TimelineState,
  options: {
    conflictResolution?: 'keep-current' | 'use-imported' | 'merge';
    trackMergeStrategy?: 'append' | 'replace' | 'merge-by-type';
  } = {}
): TimelineState {
  const {
    conflictResolution = 'use-imported',
    trackMergeStrategy = 'append'
  } = options;

  let mergedTracks = [...currentState.tracks];

  switch (trackMergeStrategy) {
    case 'append':
      // Add imported tracks with new IDs to avoid conflicts
      const importedTracksWithNewIds = importedState.tracks.map(track => {
        const newTrackId = generateUniqueId('track', mergedTracks.map(t => t.id));
        return {
          ...track,
          id: newTrackId,
          clips: track.clips.map(clip => ({
            ...clip,
            id: generateUniqueId('clip', getAllClipIds(mergedTracks)),
            trackId: newTrackId
          }))
        };
      });
      mergedTracks = [...mergedTracks, ...importedTracksWithNewIds];
      break;

    case 'replace':
      mergedTracks = importedState.tracks;
      break;

    case 'merge-by-type':
      // Merge tracks of the same type
      for (const importedTrack of importedState.tracks) {
        const existingTrackIndex = mergedTracks.findIndex(t => t.type === importedTrack.type);
        
        if (existingTrackIndex >= 0) {
          // Merge clips into existing track
          const existingTrack = mergedTracks[existingTrackIndex];
          const mergedClips = [
            ...existingTrack.clips,
            ...importedTrack.clips.map(clip => ({
              ...clip,
              id: generateUniqueId('clip', getAllClipIds(mergedTracks)),
              trackId: existingTrack.id
            }))
          ].sort((a, b) => a.start - b.start);

          mergedTracks[existingTrackIndex] = {
            ...existingTrack,
            clips: mergedClips
          };
        } else {
          // Add new track
          mergedTracks.push({
            ...importedTrack,
            id: generateUniqueId('track', mergedTracks.map(t => t.id))
          });
        }
      }
      break;
  }

  // Determine selectedClipId - ensure it exists in merged tracks
  let selectedClipId: string | undefined;
  if (conflictResolution === 'keep-current') {
    selectedClipId = currentState.selectedClipId;
  } else {
    selectedClipId = importedState.selectedClipId;
  }
  
  // Validate that selectedClipId exists in merged tracks
  if (selectedClipId) {
    const clipExists = mergedTracks.some(track => 
      track.clips.some(clip => clip.id === selectedClipId)
    );
    if (!clipExists) {
      selectedClipId = undefined;
    }
  }

  // Merge other properties based on conflict resolution
  const mergedState: TimelineState = {
    tracks: mergedTracks,
    currentTime: conflictResolution === 'keep-current' ? currentState.currentTime : importedState.currentTime,
    duration: Math.max(currentState.duration, importedState.duration),
    zoom: conflictResolution === 'keep-current' ? currentState.zoom : importedState.zoom,
    selectedClipId,
    isPlaying: conflictResolution === 'keep-current' ? currentState.isPlaying : importedState.isPlaying
  };

  // Validate merged state
  validateTimelineState(mergedState);

  return mergedState;
}

/**
 * Validates export data format
 */
export function validateExportData(data: unknown): data is ExportedState {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const exportData = data as any;
  
  return !!(
    typeof exportData.version === 'string' &&
    typeof exportData.timestamp === 'number' &&
    exportData.data &&
    typeof exportData.data === 'object'
  );
}

/**
 * Gets export metadata
 */
export function getExportMetadata(exportedData: ExportedState): {
  version: string;
  timestamp: Date;
  size: number;
  trackCount: number;
  clipCount: number;
  duration: number;
} {
  const totalClips = exportedData.data.tracks.reduce((sum, track) => sum + track.clips.length, 0);
  
  return {
    version: exportedData.version,
    timestamp: new Date(exportedData.timestamp),
    size: JSON.stringify(exportedData).length,
    trackCount: exportedData.data.tracks.length,
    clipCount: totalClips,
    duration: exportedData.data.duration
  };
}

/**
 * Creates a backup of current state
 */
export function createBackup(
  state: TimelineState,
  description?: string
): ExportedState {
  const backup = exportState(state, {
    includeMetadata: true,
    format: 'json'
  });
  
  if (description && backup.metadata) {
    backup.metadata.description = description;
  }
  
  return backup;
}

/**
 * Restores state from backup
 */
export function restoreFromBackup(
  backup: ExportedState,
  options: ImportOptions = {}
): TimelineState {
  return importState(backup, {
    validateData: true,
    ...options
  });
}

// Helper functions

/**
 * Checks if export version is compatible with current version
 */
function isVersionCompatible(exportVersion: string): boolean {
  // Simple version compatibility check
  // In a real implementation, you might want more sophisticated version comparison
  const [exportMajor] = exportVersion.split('.').map(Number);
  const [currentMajor] = EXPORT_VERSION.split('.').map(Number);
  
  return exportMajor === currentMajor;
}

/**
 * Generates new IDs for all tracks and clips
 */
function generateNewIds(state: TimelineState): TimelineState {
  const usedTrackIds: string[] = [];
  const usedClipIds: string[] = [];
  
  const newTracks = state.tracks.map(track => {
    const newTrackId = generateUniqueId('track', usedTrackIds);
    usedTrackIds.push(newTrackId);
    
    const newClips = track.clips.map(clip => {
      const newClipId = generateUniqueId('clip', usedClipIds);
      usedClipIds.push(newClipId);
      return {
        ...clip,
        id: newClipId,
        trackId: newTrackId
      };
    });
    
    return {
      ...track,
      id: newTrackId,
      clips: newClips
    };
  });

  return {
    ...state,
    tracks: newTracks,
    selectedClipId: undefined // Clear selection since IDs changed
  };
}

/**
 * Generates a unique ID with prefix
 */
function generateUniqueId(prefix: string, existingIds: string[]): string {
  // Use timestamp and random number to ensure uniqueness
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  let id = `${prefix}-${timestamp}-${random}`;
  
  // Fallback to counter if somehow still not unique
  let counter = 1;
  while (existingIds.includes(id)) {
    counter++;
    id = `${prefix}-${timestamp}-${random}-${counter}`;
  }
  
  return id;
}

/**
 * Gets all clip IDs from tracks
 */
function getAllClipIds(tracks: TimelineState['tracks']): string[] {
  return tracks.flatMap(track => track.clips.map(clip => clip.id));
}