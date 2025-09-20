import {
  Clip,
  Track,
  TimelineState,
  TimelineProps,
  ValidationError,
  RenderError,
  EventBusError,
  ErrorRecoveryAction,
} from '../index';

describe('Core Types', () => {
  describe('Clip interface', () => {
    it('should create a valid clip object', () => {
      const clip: Clip = {
        id: 'test-clip',
        trackId: 'test-track',
        start: 0,
        duration: 5,
        type: 'video',
        metadata: {
          name: 'Test Clip',
          thumbnailUrl: 'https://example.com/thumb.jpg',
        },
      };

      expect(clip.id).toBe('test-clip');
      expect(clip.type).toBe('video');
      expect(clip.start).toBe(0);
      expect(clip.duration).toBe(5);
    });

    it('should support all clip types', () => {
      const videoClip: Clip = { id: '1', trackId: '1', start: 0, duration: 1, type: 'video' };
      const audioClip: Clip = { id: '2', trackId: '2', start: 0, duration: 1, type: 'audio' };
      const textClip: Clip = { id: '3', trackId: '3', start: 0, duration: 1, type: 'text' };
      const overlayClip: Clip = { id: '4', trackId: '4', start: 0, duration: 1, type: 'overlay' };

      expect(videoClip.type).toBe('video');
      expect(audioClip.type).toBe('audio');
      expect(textClip.type).toBe('text');
      expect(overlayClip.type).toBe('overlay');
    });
  });

  describe('Track interface', () => {
    it('should create a valid track object', () => {
      const track: Track = {
        id: 'test-track',
        type: 'video',
        name: 'Test Track',
        height: 80,
        isVisible: true,
        clips: [],
      };

      expect(track.id).toBe('test-track');
      expect(track.type).toBe('video');
      expect(track.name).toBe('Test Track');
      expect(track.height).toBe(80);
      expect(track.isVisible).toBe(true);
      expect(track.clips).toEqual([]);
    });

    it('should support audio track with muted property', () => {
      const audioTrack: Track = {
        id: 'audio-track',
        type: 'audio',
        name: 'Audio Track',
        height: 60,
        isVisible: true,
        isMuted: true,
        clips: [],
      };

      expect(audioTrack.isMuted).toBe(true);
    });
  });

  describe('TimelineState interface', () => {
    it('should create a valid timeline state', () => {
      const state: TimelineState = {
        tracks: [],
        currentTime: 0,
        duration: 30,
        zoom: 1,
        isPlaying: false,
      };

      expect(state.tracks).toEqual([]);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(30);
      expect(state.zoom).toBe(1);
      expect(state.isPlaying).toBe(false);
    });

    it('should support optional selectedClipId', () => {
      const state: TimelineState = {
        tracks: [],
        currentTime: 0,
        duration: 30,
        zoom: 1,
        isPlaying: false,
        selectedClipId: 'selected-clip',
      };

      expect(state.selectedClipId).toBe('selected-clip');
    });
  });

  describe('TimelineProps interface', () => {
    it('should create valid timeline props with minimal configuration', () => {
      const props: TimelineProps = {};

      expect(props).toBeDefined();
    });

    it('should support all configuration options', () => {
      const props: TimelineProps = {
        tracks: [],
        duration: 60,
        currentTime: 10,
        zoom: 2,
        pixelsPerSecond: 50,
        trackHeight: 100,
        minZoom: 0.1,
        maxZoom: 10,
        eventBusNamespace: 'custom',
        className: 'custom-timeline',
        enableVirtualization: true,
        estimatedItemSize: 80,
        disableTouch: false,
        enableUndo: true,
      };

      expect(props.duration).toBe(60);
      expect(props.zoom).toBe(2);
      expect(props.enableVirtualization).toBe(true);
    });
  });
});

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with field and value', () => {
      const error = new ValidationError('Invalid duration', 'duration', -1);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid duration');
      expect(error.field).toBe('duration');
      expect(error.value).toBe(-1);
    });
  });

  describe('RenderError', () => {
    it('should create render error with component name', () => {
      const error = new RenderError('Failed to render', 'Timeline');

      expect(error.name).toBe('RenderError');
      expect(error.message).toBe('Failed to render');
      expect(error.componentName).toBe('Timeline');
    });
  });

  describe('EventBusError', () => {
    it('should create event bus error with event name', () => {
      const error = new EventBusError('Event emission failed', 'timeline:addClip');

      expect(error.name).toBe('EventBusError');
      expect(error.message).toBe('Event emission failed');
      expect(error.eventName).toBe('timeline:addClip');
    });
  });
});

describe('ErrorRecoveryAction enum', () => {
  it('should have all recovery actions', () => {
    expect(ErrorRecoveryAction.RETRY).toBe('retry');
    expect(ErrorRecoveryAction.RESET_STATE).toBe('reset_state');
    expect(ErrorRecoveryAction.FALLBACK_RENDER).toBe('fallback_render');
    expect(ErrorRecoveryAction.NOTIFY_USER).toBe('notify_user');
  });
});