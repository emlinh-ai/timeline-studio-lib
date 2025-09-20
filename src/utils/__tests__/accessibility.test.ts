import {
  formatTimeForScreenReader,
  generateClipAriaLabel,
  generateTrackAriaLabel,
  getKeyboardShortcutDescription,
  createFocusManager,
  announceToScreenReader,
  validateAriaAttributes
} from '../accessibility';
import { Clip, Track } from '../../types';

// Mock DOM methods
const mockAnnounce = jest.fn();
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockAnnounce,
    cancel: jest.fn()
  },
  writable: true
});

describe('accessibility utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('formatTimeForScreenReader', () => {
    it('should format seconds correctly', () => {
      expect(formatTimeForScreenReader(0)).toBe('0 seconds');
      expect(formatTimeForScreenReader(1)).toBe('1 second');
      expect(formatTimeForScreenReader(30)).toBe('30 seconds');
      expect(formatTimeForScreenReader(59)).toBe('59 seconds');
    });

    it('should format minutes correctly', () => {
      expect(formatTimeForScreenReader(60)).toBe('1 minute');
      expect(formatTimeForScreenReader(90)).toBe('1 minute and 30 seconds');
      expect(formatTimeForScreenReader(120)).toBe('2 minutes');
      expect(formatTimeForScreenReader(150)).toBe('2 minutes and 30 seconds');
    });

    it('should format hours correctly', () => {
      expect(formatTimeForScreenReader(3600)).toBe('1 hour');
      expect(formatTimeForScreenReader(3660)).toBe('1 hour and 1 minute');
      expect(formatTimeForScreenReader(3690)).toBe('1 hour, 1 minute and 30 seconds');
      expect(formatTimeForScreenReader(7200)).toBe('2 hours');
      expect(formatTimeForScreenReader(7320)).toBe('2 hours and 2 minutes');
    });

    it('should handle edge cases', () => {
      expect(formatTimeForScreenReader(-1)).toBe('0 seconds');
      expect(formatTimeForScreenReader(0.5)).toBe('0 seconds');
      expect(formatTimeForScreenReader(NaN)).toBe('0 seconds');
      expect(formatTimeForScreenReader(Infinity)).toBe('0 seconds');
    });
  });

  describe('generateClipAriaLabel', () => {
    const mockClip: Clip = {
      id: 'clip-1',
      trackId: 'track-1',
      start: 30,
      duration: 60,
      type: 'video',
      metadata: {
        name: 'Test Clip'
      }
    };

    it('should generate basic clip label', () => {
      const label = generateClipAriaLabel(mockClip, false);
      expect(label).toBe('video clip: Test Clip, duration 1 minute, starts at 30 seconds, not selected');
    });

    it('should indicate selected state', () => {
      const label = generateClipAriaLabel(mockClip, true);
      expect(label).toBe('video clip: Test Clip, duration 1 minute, starts at 30 seconds, selected');
    });

    it('should handle clip without name', () => {
      const clipWithoutName = { ...mockClip, metadata: {} };
      const label = generateClipAriaLabel(clipWithoutName, false);
      expect(label).toBe('video clip: Unnamed clip, duration 1 minute, starts at 30 seconds, not selected');
    });

    it('should handle different clip types', () => {
      const audioClip = { ...mockClip, type: 'audio' as const };
      const label = generateClipAriaLabel(audioClip, false);
      expect(label).toContain('audio clip:');
    });

    it('should handle complex time formats', () => {
      const complexClip = { ...mockClip, start: 3690, duration: 7320 };
      const label = generateClipAriaLabel(complexClip, false);
      expect(label).toContain('duration 2 hours and 2 minutes');
      expect(label).toContain('starts at 1 hour, 1 minute and 30 seconds');
    });
  });

  describe('generateTrackAriaLabel', () => {
    const mockTrack: Track = {
      id: 'track-1',
      type: 'video',
      name: 'Video Track',
      height: 60,
      isVisible: true,
      clips: [
        { id: 'clip-1', trackId: 'track-1', start: 0, duration: 30, type: 'video' },
        { id: 'clip-2', trackId: 'track-1', start: 30, duration: 30, type: 'video' }
      ]
    };

    it('should generate basic track label', () => {
      const label = generateTrackAriaLabel(mockTrack);
      expect(label).toBe('video track: Video Track');
    });

    it('should include clip count when specified', () => {
      const label = generateTrackAriaLabel(mockTrack, true);
      expect(label).toBe('Video Track clips area with 2 clips');
    });

    it('should handle track with no clips', () => {
      const emptyTrack = { ...mockTrack, clips: [] };
      const label = generateTrackAriaLabel(emptyTrack, true);
      expect(label).toBe('Video Track clips area with 0 clips');
    });

    it('should handle singular clip count', () => {
      const singleClipTrack = { ...mockTrack, clips: [mockTrack.clips[0]] };
      const label = generateTrackAriaLabel(singleClipTrack, true);
      expect(label).toBe('Video Track clips area with 1 clip');
    });
  });

  describe('getKeyboardShortcutDescription', () => {
    it('should return correct descriptions for known shortcuts', () => {
      expect(getKeyboardShortcutDescription('Space')).toBe('Play/Pause');
      expect(getKeyboardShortcutDescription('Delete')).toBe('Delete selected clip');
      expect(getKeyboardShortcutDescription('Escape')).toBe('Deselect all');
      expect(getKeyboardShortcutDescription('ArrowLeft')).toBe('Navigate to previous clip');
      expect(getKeyboardShortcutDescription('ArrowRight')).toBe('Navigate to next clip');
    });

    it('should handle modifier keys', () => {
      expect(getKeyboardShortcutDescription('Ctrl+z')).toBe('Undo');
      expect(getKeyboardShortcutDescription('Ctrl+y')).toBe('Redo');
      expect(getKeyboardShortcutDescription('Ctrl+=')).toBe('Zoom in');
      expect(getKeyboardShortcutDescription('Ctrl+-')).toBe('Zoom out');
      expect(getKeyboardShortcutDescription('Ctrl+0')).toBe('Reset zoom');
    });

    it('should return empty string for unknown shortcuts', () => {
      expect(getKeyboardShortcutDescription('F1')).toBe('');
      expect(getKeyboardShortcutDescription('Ctrl+x')).toBe('');
      expect(getKeyboardShortcutDescription('Alt+Tab')).toBe('');
    });

    it('should handle case insensitive input', () => {
      expect(getKeyboardShortcutDescription('space')).toBe('Play/Pause');
      expect(getKeyboardShortcutDescription('ESCAPE')).toBe('Deselect all');
      expect(getKeyboardShortcutDescription('ctrl+Z')).toBe('Undo');
    });
  });

  describe('createFocusManager', () => {
    beforeEach(() => {
      // Create test DOM structure
      document.body.innerHTML = `
        <div id="timeline">
          <div class="clip" tabindex="0" data-clip-id="clip-1">Clip 1</div>
          <div class="clip" tabindex="0" data-clip-id="clip-2">Clip 2</div>
          <div class="clip" tabindex="0" data-clip-id="clip-3">Clip 3</div>
        </div>
      `;
    });

    it('should create focus manager with correct methods', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip');

      expect(focusManager).toHaveProperty('focusNext');
      expect(focusManager).toHaveProperty('focusPrevious');
      expect(focusManager).toHaveProperty('focusFirst');
      expect(focusManager).toHaveProperty('focusLast');
      expect(focusManager).toHaveProperty('getCurrentFocusIndex');
      expect(focusManager).toHaveProperty('focusElement');
    });

    it('should focus next element', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip');
      
      const firstClip = container.querySelector('.clip') as HTMLElement;
      firstClip.focus();

      focusManager.focusNext();
      expect(document.activeElement?.getAttribute('data-clip-id')).toBe('clip-2');
    });

    it('should focus previous element', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip');
      
      const secondClip = container.querySelectorAll('.clip')[1] as HTMLElement;
      secondClip.focus();

      focusManager.focusPrevious();
      expect(document.activeElement?.getAttribute('data-clip-id')).toBe('clip-1');
    });

    it('should wrap around when reaching boundaries', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip', { wrap: true });
      
      const lastClip = container.querySelectorAll('.clip')[2] as HTMLElement;
      lastClip.focus();

      focusManager.focusNext();
      expect(document.activeElement?.getAttribute('data-clip-id')).toBe('clip-1');
    });

    it('should not wrap when wrap is disabled', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip', { wrap: false });
      
      const lastClip = container.querySelectorAll('.clip')[2] as HTMLElement;
      lastClip.focus();

      focusManager.focusNext();
      expect(document.activeElement?.getAttribute('data-clip-id')).toBe('clip-3');
    });

    it('should focus first and last elements', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip');

      focusManager.focusFirst();
      expect(document.activeElement?.getAttribute('data-clip-id')).toBe('clip-1');

      focusManager.focusLast();
      expect(document.activeElement?.getAttribute('data-clip-id')).toBe('clip-3');
    });

    it('should get current focus index', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip');
      
      const secondClip = container.querySelectorAll('.clip')[1] as HTMLElement;
      secondClip.focus();

      expect(focusManager.getCurrentFocusIndex()).toBe(1);
    });

    it('should focus element by index', () => {
      const container = document.getElementById('timeline')!;
      const focusManager = createFocusManager(container, '.clip');

      focusManager.focusElement(2);
      expect(document.activeElement?.getAttribute('data-clip-id')).toBe('clip-3');
    });
  });

  describe('announceToScreenReader', () => {
    beforeEach(() => {
      // Clear any existing live regions
      document.querySelectorAll('[aria-live]').forEach(el => el.remove());
    });

    it('should create live region and announce message', () => {
      announceToScreenReader('Test announcement');
      
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.textContent).toBe('Test announcement');
    });

    it('should use assertive priority when specified', () => {
      announceToScreenReader('Urgent message', 'assertive');
      
      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.textContent).toBe('Urgent message');
    });

    it('should reuse existing live region', () => {
      announceToScreenReader('First message');
      announceToScreenReader('Second message');
      
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions).toHaveLength(1);
      expect(liveRegions[0].textContent).toBe('Second message');
    });

    it('should clear message after delay', (done) => {
      announceToScreenReader('Test message');
      
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion?.textContent).toBe('Test message');
      
      setTimeout(() => {
        expect(liveRegion?.textContent).toBe('');
        done();
      }, 1100);
    });
  });

  describe('validateAriaAttributes', () => {
    it('should validate correct ARIA attributes', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-label', 'Test label');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-pressed', 'false');

      const result = validateAriaAttributes(element);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required attributes', () => {
      const element = document.createElement('button');
      // Button without accessible name

      const result = validateAriaAttributes(element);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Interactive element missing accessible name');
    });

    it('should detect invalid ARIA attribute values', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-pressed', 'invalid');
      element.setAttribute('role', 'button');

      const result = validateAriaAttributes(element);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('aria-pressed'))).toBe(true);
    });

    it('should detect invalid role values', () => {
      const element = document.createElement('div');
      element.setAttribute('role', 'invalid-role');

      const result = validateAriaAttributes(element);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid role'))).toBe(true);
    });

    it('should validate elements with multiple issues', () => {
      const element = document.createElement('div');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-pressed', 'invalid');
      element.setAttribute('aria-expanded', 'maybe');

      const result = validateAriaAttributes(element);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle elements without ARIA attributes', () => {
      const element = document.createElement('div');

      const result = validateAriaAttributes(element);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});