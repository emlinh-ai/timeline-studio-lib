import { Clip, Track, TimelineState, ValidationError } from '../types';

/**
 * Validates a clip object for data integrity
 */
export function validateClip(clip: Clip): void {
    if (!clip.id || typeof clip.id !== 'string') {
        throw new ValidationError('Clip ID must be a non-empty string', 'id', clip.id);
    }

    if (!clip.trackId || typeof clip.trackId !== 'string') {
        throw new ValidationError('Clip trackId must be a non-empty string', 'trackId', clip.trackId);
    }

    if (typeof clip.start !== 'number' || clip.start < 0) {
        throw new ValidationError('Clip start time must be a non-negative number', 'start', clip.start);
    }

    if (typeof clip.duration !== 'number' || clip.duration <= 0) {
        throw new ValidationError('Clip duration must be a positive number', 'duration', clip.duration);
    }

    const validTypes = ['video', 'audio', 'text', 'overlay'];
    if (!validTypes.includes(clip.type)) {
        throw new ValidationError('Clip type must be one of: video, audio, text, overlay', 'type', clip.type);
    }

    // Validate metadata if present
    if (clip.metadata) {
        if (clip.metadata.speed !== undefined && (typeof clip.metadata.speed !== 'number' || clip.metadata.speed <= 0)) {
            throw new ValidationError('Clip metadata speed must be a positive number', 'metadata.speed', clip.metadata.speed);
        }

        if (clip.metadata.isAI !== undefined && typeof clip.metadata.isAI !== 'boolean') {
            throw new ValidationError('Clip metadata isAI must be a boolean', 'metadata.isAI', clip.metadata.isAI);
        }

        if (clip.metadata.name !== undefined && typeof clip.metadata.name !== 'string') {
            throw new ValidationError('Clip metadata name must be a string', 'metadata.name', clip.metadata.name);
        }

        if (clip.metadata.waveform !== undefined && !Array.isArray(clip.metadata.waveform)) {
            throw new ValidationError('Clip metadata waveform must be an array', 'metadata.waveform', clip.metadata.waveform);
        }

        if (clip.metadata.thumbnailUrl !== undefined && typeof clip.metadata.thumbnailUrl !== 'string') {
            throw new ValidationError('Clip metadata thumbnailUrl must be a string', 'metadata.thumbnailUrl', clip.metadata.thumbnailUrl);
        }

        if (clip.metadata.text !== undefined && typeof clip.metadata.text !== 'string') {
            throw new ValidationError('Clip metadata text must be a string', 'metadata.text', clip.metadata.text);
        }
    }
}

/**
 * Validates a track object for data integrity
 */
export function validateTrack(track: Track): void {
    if (!track.id || typeof track.id !== 'string') {
        throw new ValidationError('Track ID must be a non-empty string', 'id', track.id);
    }

    const validTypes = ['video', 'audio', 'text', 'overlay'];
    if (!validTypes.includes(track.type)) {
        throw new ValidationError('Track type must be one of: video, audio, text, overlay', 'type', track.type);
    }

    if (!track.name || typeof track.name !== 'string') {
        throw new ValidationError('Track name must be a non-empty string', 'name', track.name);
    }

    if (typeof track.height !== 'number' || track.height <= 0) {
        throw new ValidationError('Track height must be a positive number', 'height', track.height);
    }

    if (typeof track.isVisible !== 'boolean') {
        throw new ValidationError('Track isVisible must be a boolean', 'isVisible', track.isVisible);
    }

    if (track.isMuted !== undefined && typeof track.isMuted !== 'boolean') {
        throw new ValidationError('Track isMuted must be a boolean', 'isMuted', track.isMuted);
    }

    if (!Array.isArray(track.clips)) {
        throw new ValidationError('Track clips must be an array', 'clips', track.clips);
    }

    // Validate all clips in the track
    track.clips.forEach((clip, index) => {
        try {
            validateClip(clip);

            // Ensure clip belongs to this track
            if (clip.trackId !== track.id) {
                throw new ValidationError(`Clip at index ${index} has trackId "${clip.trackId}" but belongs to track "${track.id}"`, 'clips', clip);
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                throw new ValidationError(`Invalid clip at index ${index}: ${error.message}`, `clips[${index}].${error.field}`, error.value);
            }
            throw error;
        }
    });

    // Check for overlapping clips
    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sortedClips.length - 1; i++) {
        const currentClip = sortedClips[i];
        const nextClip = sortedClips[i + 1];

        if (currentClip.start + currentClip.duration > nextClip.start) {
            throw new ValidationError(
                `Clips "${currentClip.id}" and "${nextClip.id}" overlap in track "${track.id}"`,
                'clips',
                { currentClip, nextClip }
            );
        }
    }
}

/**
 * Validates a timeline state object for data integrity
 */
export function validateTimelineState(state: TimelineState): void {
    if (!Array.isArray(state.tracks)) {
        throw new ValidationError('Timeline state tracks must be an array', 'tracks', state.tracks);
    }

    if (typeof state.currentTime !== 'number' || state.currentTime < 0) {
        throw new ValidationError('Timeline state currentTime must be a non-negative number', 'currentTime', state.currentTime);
    }

    if (typeof state.duration !== 'number' || state.duration < 0) {
        throw new ValidationError('Timeline state duration must be a non-negative number', 'duration', state.duration);
    }

    if (typeof state.zoom !== 'number' || state.zoom <= 0) {
        throw new ValidationError('Timeline state zoom must be a positive number', 'zoom', state.zoom);
    }

    if (state.selectedClipId !== undefined && typeof state.selectedClipId !== 'string') {
        throw new ValidationError('Timeline state selectedClipId must be a string or undefined', 'selectedClipId', state.selectedClipId);
    }

    if (typeof state.isPlaying !== 'boolean') {
        throw new ValidationError('Timeline state isPlaying must be a boolean', 'isPlaying', state.isPlaying);
    }

    // Validate all tracks
    const trackIds = new Set<string>();
    state.tracks.forEach((track, index) => {
        try {
            validateTrack(track);

            // Check for duplicate track IDs
            if (trackIds.has(track.id)) {
                throw new ValidationError(`Duplicate track ID "${track.id}" found`, 'tracks', track);
            }
            trackIds.add(track.id);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw new ValidationError(`Invalid track at index ${index}: ${error.message}`, `tracks[${index}].${error.field}`, error.value);
            }
            throw error;
        }
    });

    // Validate selectedClipId exists if specified
    if (state.selectedClipId) {
        const clipExists = state.tracks.some(track =>
            track.clips.some(clip => clip.id === state.selectedClipId)
        );

        if (!clipExists) {
            throw new ValidationError(`Selected clip ID "${state.selectedClipId}" does not exist in any track`, 'selectedClipId', state.selectedClipId);
        }
    }

    // Validate currentTime is within duration
    if (state.currentTime > state.duration) {
        throw new ValidationError('Timeline currentTime cannot exceed duration', 'currentTime', state.currentTime);
    }
}

/**
 * Validates clip updates for partial updates
 */
export function validateClipUpdates(clipId: string, updates: Partial<Clip>): void {
    if (updates.id !== undefined && updates.id !== clipId) {
        throw new ValidationError('Cannot change clip ID through updates', 'id', updates.id);
    }

    if (updates.start !== undefined && (typeof updates.start !== 'number' || updates.start < 0)) {
        throw new ValidationError('Clip start time must be a non-negative number', 'start', updates.start);
    }

    if (updates.duration !== undefined && (typeof updates.duration !== 'number' || updates.duration <= 0)) {
        throw new ValidationError('Clip duration must be a positive number', 'duration', updates.duration);
    }

    if (updates.type !== undefined) {
        const validTypes = ['video', 'audio', 'text', 'overlay'];
        if (!validTypes.includes(updates.type)) {
            throw new ValidationError('Clip type must be one of: video, audio, text, overlay', 'type', updates.type);
        }
    }
}

/**
 * Validates track updates for partial updates
 */
export function validateTrackUpdates(trackId: string, updates: Partial<Track>): void {
    if (updates.id !== undefined && updates.id !== trackId) {
        throw new ValidationError('Cannot change track ID through updates', 'id', updates.id);
    }

    if (updates.type !== undefined) {
        const validTypes = ['video', 'audio', 'text', 'overlay'];
        if (!validTypes.includes(updates.type)) {
            throw new ValidationError('Track type must be one of: video, audio, text, overlay', 'type', updates.type);
        }
    }

    if (updates.name !== undefined && (!updates.name || typeof updates.name !== 'string')) {
        throw new ValidationError('Track name must be a non-empty string', 'name', updates.name);
    }

    if (updates.height !== undefined && (typeof updates.height !== 'number' || updates.height <= 0)) {
        throw new ValidationError('Track height must be a positive number', 'height', updates.height);
    }

    if (updates.isVisible !== undefined && typeof updates.isVisible !== 'boolean') {
        throw new ValidationError('Track isVisible must be a boolean', 'isVisible', updates.isVisible);
    }

    if (updates.isMuted !== undefined && typeof updates.isMuted !== 'boolean') {
        throw new ValidationError('Track isMuted must be a boolean', 'isMuted', updates.isMuted);
    }
}