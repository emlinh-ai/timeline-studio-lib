import { TimelineState, ValidationError } from '../types';
import { validateTimelineState } from './validation';

/**
 * Serialization format version for backward compatibility
 */
const SERIALIZATION_VERSION = '1.0.0';

/**
 * Serialized state format
 */
export interface SerializedTimelineState {
  version: string;
  timestamp: number;
  state: TimelineState;
  metadata?: {
    appVersion?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  includeMetadata?: boolean;
  compress?: boolean;
  validate?: boolean;
}

/**
 * Deserialization options
 */
export interface DeserializationOptions {
  validate?: boolean;
  allowVersionMismatch?: boolean;
  migrationStrategy?: 'strict' | 'lenient' | 'auto';
}

/**
 * Serialization error class
 */
export class SerializationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SerializationError';
  }
}

/**
 * Serializes timeline state to JSON string
 */
export function serializeTimelineState(
  state: TimelineState,
  options: SerializationOptions = {}
): string {
  const {
    includeMetadata = true,
    compress = false,
    validate = true
  } = options;
  
  try {
    // Validate state before serialization
    if (validate) {
      validateTimelineState(state);
    }
    
    const serializedState: SerializedTimelineState = {
      version: SERIALIZATION_VERSION,
      timestamp: Date.now(),
      state: state
    };
    
    // Add metadata if requested
    if (includeMetadata) {
      serializedState.metadata = {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
        // Add more metadata as needed
      };
    }
    
    // Serialize to JSON
    const jsonString = JSON.stringify(serializedState, null, compress ? 0 : 2);
    
    return jsonString;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new SerializationError(`State validation failed: ${error.message}`, error);
    }
    throw new SerializationError(`Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error : undefined);
  }
}

/**
 * Deserializes timeline state from JSON string
 */
export function deserializeTimelineState(
  jsonString: string,
  options: DeserializationOptions = {}
): TimelineState {
  const {
    validate = true,
    allowVersionMismatch = false,
    migrationStrategy = 'auto'
  } = options;
  
  try {
    // Parse JSON
    const parsed = JSON.parse(jsonString);
    
    // Check if it's a serialized state format
    if (!isSerializedTimelineState(parsed)) {
      // Try to treat as raw state for backward compatibility
      if (isRawTimelineState(parsed)) {
        const state = parsed as TimelineState;
        if (validate) {
          validateTimelineState(state);
        }
        return state;
      }
      throw new SerializationError('Invalid serialized state format');
    }
    
    const serializedState = parsed as SerializedTimelineState;
    
    // Check version compatibility
    if (!allowVersionMismatch && serializedState.version !== SERIALIZATION_VERSION) {
      if (migrationStrategy === 'strict') {
        throw new SerializationError(`Version mismatch: expected ${SERIALIZATION_VERSION}, got ${serializedState.version}`);
      } else if (migrationStrategy === 'auto') {
        // Attempt automatic migration
        const migratedState = migrateState(serializedState);
        if (validate) {
          validateTimelineState(migratedState.state);
        }
        return migratedState.state;
      }
      // lenient strategy continues without migration
    }
    
    // Validate deserialized state
    if (validate) {
      validateTimelineState(serializedState.state);
    }
    
    return serializedState.state;
  } catch (error) {
    if (error instanceof SerializationError) {
      throw error;
    }
    if (error instanceof ValidationError) {
      throw new SerializationError(`State validation failed: ${error.message}`, error);
    }
    if (error instanceof SyntaxError) {
      throw new SerializationError(`JSON parsing failed: ${error.message}`, error);
    }
    throw new SerializationError(`Deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error : undefined);
  }
}

/**
 * Type guard for serialized timeline state
 */
function isSerializedTimelineState(obj: unknown): obj is SerializedTimelineState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'version' in obj &&
    'timestamp' in obj &&
    'state' in obj &&
    typeof (obj as any).version === 'string' &&
    typeof (obj as any).timestamp === 'number' &&
    typeof (obj as any).state === 'object'
  );
}

/**
 * Type guard for raw timeline state
 */
function isRawTimelineState(obj: unknown): obj is TimelineState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'tracks' in obj &&
    'currentTime' in obj &&
    'duration' in obj &&
    'zoom' in obj &&
    'isPlaying' in obj &&
    Array.isArray((obj as any).tracks) &&
    typeof (obj as any).currentTime === 'number' &&
    typeof (obj as any).duration === 'number' &&
    typeof (obj as any).zoom === 'number' &&
    typeof (obj as any).isPlaying === 'boolean'
  );
}

/**
 * Migrates state between versions
 */
function migrateState(serializedState: SerializedTimelineState): SerializedTimelineState {
  // For now, just return the state as-is since we only have one version
  // In the future, add migration logic here
  
  switch (serializedState.version) {
    case '1.0.0':
      return serializedState;
    default:
      // Attempt to use current version format
      return {
        ...serializedState,
        version: SERIALIZATION_VERSION
      };
  }
}

/**
 * Compresses timeline state by removing redundant data
 */
export function compressTimelineState(state: TimelineState): TimelineState {
  // Remove empty tracks
  const compressedTracks = state.tracks.filter(track => 
    track.clips.length > 0 || track.isVisible
  );
  
  // Sort clips by start time for better compression
  const sortedTracks = compressedTracks.map(track => ({
    ...track,
    clips: [...track.clips].sort((a, b) => a.start - b.start)
  }));
  
  return {
    ...state,
    tracks: sortedTracks
  };
}

/**
 * Creates a deep clone of timeline state
 */
export function cloneTimelineState(state: TimelineState): TimelineState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Calculates the size of serialized state in bytes
 */
export function getSerializedStateSize(state: TimelineState): number {
  const serialized = serializeTimelineState(state, { compress: true });
  return new Blob([serialized]).size;
}

/**
 * Checks if two timeline states are equal
 */
export function areStatesEqual(state1: TimelineState, state2: TimelineState): boolean {
  try {
    const serialized1 = serializeTimelineState(state1, { 
      includeMetadata: false, 
      compress: true 
    });
    const serialized2 = serializeTimelineState(state2, { 
      includeMetadata: false, 
      compress: true 
    });
    return serialized1 === serialized2;
  } catch {
    return false;
  }
}

/**
 * Creates a state diff between two timeline states
 */
export interface StateDiff {
  tracksAdded: string[];
  tracksRemoved: string[];
  tracksModified: string[];
  clipsAdded: string[];
  clipsRemoved: string[];
  clipsModified: string[];
  propertiesChanged: string[];
}

export function createStateDiff(
  oldState: TimelineState, 
  newState: TimelineState
): StateDiff {
  const diff: StateDiff = {
    tracksAdded: [],
    tracksRemoved: [],
    tracksModified: [],
    clipsAdded: [],
    clipsRemoved: [],
    clipsModified: [],
    propertiesChanged: []
  };
  
  // Track changes
  const oldTrackIds = new Set(oldState.tracks.map(t => t.id));
  const newTrackIds = new Set(newState.tracks.map(t => t.id));
  
  diff.tracksAdded = newState.tracks
    .filter(t => !oldTrackIds.has(t.id))
    .map(t => t.id);
    
  diff.tracksRemoved = oldState.tracks
    .filter(t => !newTrackIds.has(t.id))
    .map(t => t.id);
  
  // Clip changes
  const oldClipIds = new Set(
    oldState.tracks.flatMap(t => t.clips.map(c => c.id))
  );
  const newClipIds = new Set(
    newState.tracks.flatMap(t => t.clips.map(c => c.id))
  );
  
  diff.clipsAdded = newState.tracks
    .flatMap(t => t.clips)
    .filter(c => !oldClipIds.has(c.id))
    .map(c => c.id);
    
  diff.clipsRemoved = oldState.tracks
    .flatMap(t => t.clips)
    .filter(c => !newClipIds.has(c.id))
    .map(c => c.id);
  
  // Property changes
  if (oldState.currentTime !== newState.currentTime) {
    diff.propertiesChanged.push('currentTime');
  }
  if (oldState.duration !== newState.duration) {
    diff.propertiesChanged.push('duration');
  }
  if (oldState.zoom !== newState.zoom) {
    diff.propertiesChanged.push('zoom');
  }
  if (oldState.selectedClipId !== newState.selectedClipId) {
    diff.propertiesChanged.push('selectedClipId');
  }
  if (oldState.isPlaying !== newState.isPlaying) {
    diff.propertiesChanged.push('isPlaying');
  }
  
  return diff;
}