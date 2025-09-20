import {
  validateClip,
  validateTrack,
  validateTimelineState,
  validateClipUpdates,
  validateTrackUpdates
} from '../validation';
import { Clip, Track, TimelineState, ValidationError } from '../../types';

describe('validation', () => {
  describe('validateClip', () => {
    let validClip: Clip;

    beforeEach(() => {
      validClip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video'
      };
    });

    it('should validate valid clip', () => {
      expect(() => validateClip(validClip)).not.toThrow();
    });

    it('should throw error for empty id', () => {
      const clip = { ...validClip, id: '' };
      expect(() => validateClip(clip)).toThrow(ValidationError);
      expect(() => validateClip(clip)).toThrow('Clip ID must be a non-empty string');
    });

    it('should throw error for non-string id', () => {
      const clip = { ...validClip, id: 123 as any };
      expect(() => validateClip(clip)).toThrow(ValidationError);
    });

    it('should throw error for empty trackId', () => {
      const clip = { ...validClip, trackId: '' };
      expect(() => validateClip(clip)).toThrow(ValidationError);
      expect(() => validateClip(clip)).toThrow('Clip trackId must be a non-empty string');
    });

    it('should throw error for negative start time', () => {
      const clip = { ...validClip, start: -1 };
      expect(() => validateClip(clip)).toThrow(ValidationError);
      expect(() => validateClip(clip)).toThrow('Clip start time must be a non-negative number');
    });

    it('should throw error for non-positive duration', () => {
      const clip = { ...validClip, duration: 0 };
      expect(() => validateClip(clip)).toThrow(ValidationError);
      expect(() => validateClip(clip)).toThrow('Clip duration must be a positive number');
    });

    it('should throw error for invalid type', () => {
      const clip = { ...validClip, type: 'invalid' as any };
      expect(() => validateClip(clip)).toThrow(ValidationError);
      expect(() => validateClip(clip)).toThrow('Clip type must be one of: video, audio, text, overlay');
    });

    describe('metadata validation', () => {
      it('should validate valid metadata', () => {
        const clip = {
          ...validClip,
          metadata: {
            speed: 1.5,
            isAI: true,
            name: 'Test Clip',
            waveform: [0.1, 0.2, 0.3],
            thumbnailUrl: 'https://example.com/thumb.jpg',
            text: 'Sample text'
          }
        };
        expect(() => validateClip(clip)).not.toThrow();
      });

      it('should throw error for invalid speed', () => {
        const clip = { ...validClip, metadata: { speed: 0 } };
        expect(() => validateClip(clip)).toThrow(ValidationError);
        expect(() => validateClip(clip)).toThrow('Clip metadata speed must be a positive number');
      });

      it('should throw error for non-boolean isAI', () => {
        const clip = { ...validClip, metadata: { isAI: 'true' as any } };
        expect(() => validateClip(clip)).toThrow(ValidationError);
        expect(() => validateClip(clip)).toThrow('Clip metadata isAI must be a boolean');
      });

      it('should throw error for non-string name', () => {
        const clip = { ...validClip, metadata: { name: 123 as any } };
        expect(() => validateClip(clip)).toThrow(ValidationError);
        expect(() => validateClip(clip)).toThrow('Clip metadata name must be a string');
      });

      it('should throw error for non-array waveform', () => {
        const clip = { ...validClip, metadata: { waveform: 'invalid' as any } };
        expect(() => validateClip(clip)).toThrow(ValidationError);
        expect(() => validateClip(clip)).toThrow('Clip metadata waveform must be an array');
      });

      it('should throw error for non-string thumbnailUrl', () => {
        const clip = { ...validClip, metadata: { thumbnailUrl: 123 as any } };
        expect(() => validateClip(clip)).toThrow(ValidationError);
        expect(() => validateClip(clip)).toThrow('Clip metadata thumbnailUrl must be a string');
      });

      it('should throw error for non-string text', () => {
        const clip = { ...validClip, metadata: { text: 123 as any } };
        expect(() => validateClip(clip)).toThrow(ValidationError);
        expect(() => validateClip(clip)).toThrow('Clip metadata text must be a string');
      });
    });
  });

  describe('validateTrack', () => {
    let validTrack: Track;

    beforeEach(() => {
      validTrack = {
        id: 'track-1',
        type: 'video',
        name: 'Video Track',
        height: 100,
        isVisible: true,
        clips: []
      };
    });

    it('should validate valid track', () => {
      expect(() => validateTrack(validTrack)).not.toThrow();
    });

    it('should throw error for empty id', () => {
      const track = { ...validTrack, id: '' };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Track ID must be a non-empty string');
    });

    it('should throw error for invalid type', () => {
      const track = { ...validTrack, type: 'invalid' as any };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Track type must be one of: video, audio, text, overlay');
    });

    it('should throw error for empty name', () => {
      const track = { ...validTrack, name: '' };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Track name must be a non-empty string');
    });

    it('should throw error for non-positive height', () => {
      const track = { ...validTrack, height: 0 };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Track height must be a positive number');
    });

    it('should throw error for non-boolean isVisible', () => {
      const track = { ...validTrack, isVisible: 'true' as any };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Track isVisible must be a boolean');
    });

    it('should throw error for non-boolean isMuted', () => {
      const track = { ...validTrack, isMuted: 'false' as any };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Track isMuted must be a boolean');
    });

    it('should throw error for non-array clips', () => {
      const track = { ...validTrack, clips: 'invalid' as any };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Track clips must be an array');
    });

    it('should validate clips in track', () => {
      const invalidClip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: -1, // Invalid
        duration: 5,
        type: 'video'
      } as Clip;

      const track = { ...validTrack, clips: [invalidClip] };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Invalid clip at index 0');
    });

    it('should throw error for clip with wrong trackId', () => {
      const clip = {
        id: 'clip-1',
        trackId: 'wrong-track',
        start: 0,
        duration: 5,
        type: 'video'
      } as Clip;

      const track = { ...validTrack, clips: [clip] };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('has trackId "wrong-track" but belongs to track "track-1"');
    });

    it('should throw error for overlapping clips', () => {
      const clip1 = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 10,
        type: 'video'
      } as Clip;

      const clip2 = {
        id: 'clip-2',
        trackId: 'track-1',
        start: 5, // Overlaps with clip1
        duration: 10,
        type: 'video'
      } as Clip;

      const track = { ...validTrack, clips: [clip1, clip2] };
      expect(() => validateTrack(track)).toThrow(ValidationError);
      expect(() => validateTrack(track)).toThrow('Clips "clip-1" and "clip-2" overlap');
    });

    it('should allow adjacent clips', () => {
      const clip1 = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 10,
        type: 'video'
      } as Clip;

      const clip2 = {
        id: 'clip-2',
        trackId: 'track-1',
        start: 10, // Adjacent to clip1
        duration: 10,
        type: 'video'
      } as Clip;

      const track = { ...validTrack, clips: [clip1, clip2] };
      expect(() => validateTrack(track)).not.toThrow();
    });
  });

  describe('validateTimelineState', () => {
    let validState: TimelineState;

    beforeEach(() => {
      validState = {
        tracks: [],
        currentTime: 0,
        duration: 100,
        zoom: 1,
        selectedClipId: undefined,
        isPlaying: false
      };
    });

    it('should validate valid state', () => {
      expect(() => validateTimelineState(validState)).not.toThrow();
    });

    it('should throw error for non-array tracks', () => {
      const state = { ...validState, tracks: 'invalid' as any };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Timeline state tracks must be an array');
    });

    it('should throw error for negative currentTime', () => {
      const state = { ...validState, currentTime: -1 };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Timeline state currentTime must be a non-negative number');
    });

    it('should throw error for negative duration', () => {
      const state = { ...validState, duration: -1 };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Timeline state duration must be a non-negative number');
    });

    it('should throw error for non-positive zoom', () => {
      const state = { ...validState, zoom: 0 };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Timeline state zoom must be a positive number');
    });

    it('should throw error for non-string selectedClipId', () => {
      const state = { ...validState, selectedClipId: 123 as any };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Timeline state selectedClipId must be a string or undefined');
    });

    it('should throw error for non-boolean isPlaying', () => {
      const state = { ...validState, isPlaying: 'false' as any };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Timeline state isPlaying must be a boolean');
    });

    it('should validate tracks in state', () => {
      const invalidTrack = {
        id: 'track-1',
        type: 'invalid' as any,
        name: 'Track',
        height: 100,
        isVisible: true,
        clips: []
      };

      const state = { ...validState, tracks: [invalidTrack] };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Invalid track at index 0');
    });

    it('should throw error for duplicate track IDs', () => {
      const track1 = {
        id: 'track-1',
        type: 'video' as const,
        name: 'Track 1',
        height: 100,
        isVisible: true,
        clips: []
      };

      const track2 = {
        id: 'track-1', // Duplicate ID
        type: 'audio' as const,
        name: 'Track 2',
        height: 80,
        isVisible: true,
        clips: []
      };

      const state = { ...validState, tracks: [track1, track2] };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Duplicate track ID "track-1" found');
    });

    it('should throw error for non-existent selectedClipId', () => {
      const state = { ...validState, selectedClipId: 'non-existent' };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Selected clip ID "non-existent" does not exist');
    });

    it('should validate selectedClipId exists in tracks', () => {
      const clip = {
        id: 'clip-1',
        trackId: 'track-1',
        start: 0,
        duration: 5,
        type: 'video' as const
      };

      const track = {
        id: 'track-1',
        type: 'video' as const,
        name: 'Track',
        height: 100,
        isVisible: true,
        clips: [clip]
      };

      const state = { ...validState, tracks: [track], selectedClipId: 'clip-1' };
      expect(() => validateTimelineState(state)).not.toThrow();
    });

    it('should throw error when currentTime exceeds duration', () => {
      const state = { ...validState, currentTime: 150, duration: 100 };
      expect(() => validateTimelineState(state)).toThrow(ValidationError);
      expect(() => validateTimelineState(state)).toThrow('Timeline currentTime cannot exceed duration');
    });
  });

  describe('validateClipUpdates', () => {
    it('should validate valid updates', () => {
      const updates = { start: 10, duration: 5 };
      expect(() => validateClipUpdates('clip-1', updates)).not.toThrow();
    });

    it('should throw error for changing clip ID', () => {
      const updates = { id: 'new-id' };
      expect(() => validateClipUpdates('clip-1', updates)).toThrow(ValidationError);
      expect(() => validateClipUpdates('clip-1', updates)).toThrow('Cannot change clip ID through updates');
    });

    it('should throw error for negative start', () => {
      const updates = { start: -1 };
      expect(() => validateClipUpdates('clip-1', updates)).toThrow(ValidationError);
      expect(() => validateClipUpdates('clip-1', updates)).toThrow('Clip start time must be a non-negative number');
    });

    it('should throw error for non-positive duration', () => {
      const updates = { duration: 0 };
      expect(() => validateClipUpdates('clip-1', updates)).toThrow(ValidationError);
      expect(() => validateClipUpdates('clip-1', updates)).toThrow('Clip duration must be a positive number');
    });

    it('should throw error for invalid type', () => {
      const updates = { type: 'invalid' as any };
      expect(() => validateClipUpdates('clip-1', updates)).toThrow(ValidationError);
      expect(() => validateClipUpdates('clip-1', updates)).toThrow('Clip type must be one of: video, audio, text, overlay');
    });
  });

  describe('validateTrackUpdates', () => {
    it('should validate valid updates', () => {
      const updates = { name: 'New Name', height: 150 };
      expect(() => validateTrackUpdates('track-1', updates)).not.toThrow();
    });

    it('should throw error for changing track ID', () => {
      const updates = { id: 'new-id' };
      expect(() => validateTrackUpdates('track-1', updates)).toThrow(ValidationError);
      expect(() => validateTrackUpdates('track-1', updates)).toThrow('Cannot change track ID through updates');
    });

    it('should throw error for invalid type', () => {
      const updates = { type: 'invalid' as any };
      expect(() => validateTrackUpdates('track-1', updates)).toThrow(ValidationError);
      expect(() => validateTrackUpdates('track-1', updates)).toThrow('Track type must be one of: video, audio, text, overlay');
    });

    it('should throw error for empty name', () => {
      const updates = { name: '' };
      expect(() => validateTrackUpdates('track-1', updates)).toThrow(ValidationError);
      expect(() => validateTrackUpdates('track-1', updates)).toThrow('Track name must be a non-empty string');
    });

    it('should throw error for non-positive height', () => {
      const updates = { height: 0 };
      expect(() => validateTrackUpdates('track-1', updates)).toThrow(ValidationError);
      expect(() => validateTrackUpdates('track-1', updates)).toThrow('Track height must be a positive number');
    });

    it('should throw error for non-boolean isVisible', () => {
      const updates = { isVisible: 'true' as any };
      expect(() => validateTrackUpdates('track-1', updates)).toThrow(ValidationError);
      expect(() => validateTrackUpdates('track-1', updates)).toThrow('Track isVisible must be a boolean');
    });

    it('should throw error for non-boolean isMuted', () => {
      const updates = { isMuted: 'false' as any };
      expect(() => validateTrackUpdates('track-1', updates)).toThrow(ValidationError);
      expect(() => validateTrackUpdates('track-1', updates)).toThrow('Track isMuted must be a boolean');
    });
  });
});