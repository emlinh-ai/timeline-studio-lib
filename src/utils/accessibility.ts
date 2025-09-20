/**
 * Accessibility utilities for the timeline library
 */

/**
 * Creates a live region for screen reader announcements
 */
export function createLiveRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
  let liveRegion = document.getElementById(id);
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = id;
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);
  }
  
  return liveRegion;
}

/**
 * Announces a message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const liveRegion = createLiveRegion('timeline-announcements', priority);
  
  // Clear previous message
  liveRegion.textContent = '';
  
  // Set new message after a brief delay to ensure it's announced
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
  
  // Clear message after announcement to avoid repetition
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 1000);
}

/**
 * Formats time for screen reader announcement
 */
export function formatTimeForScreenReader(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);
  const remainingSeconds = Math.floor(absSeconds % 60);
  const sign = seconds < 0 ? 'minus ' : '';
  
  if (minutes === 0) {
    return `${sign}${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  } else if (remainingSeconds === 0) {
    return `${sign}${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${sign}${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }
}

/**
 * Generates accessible description for a clip
 */
export function getClipAccessibleDescription(clip: {
  type: string;
  metadata?: { name?: string; text?: string };
  start: number;
  duration: number;
}, isSelected: boolean = false): string {
  const name = clip.metadata?.name || 
    (clip.type === 'text' && clip.metadata?.text) || 
    `${clip.type} clip`;
  
  const startTime = formatTimeForScreenReader(clip.start);
  const duration = formatTimeForScreenReader(clip.duration);
  const selectionState = isSelected ? 'selected' : 'not selected';
  
  return `${clip.type} clip: ${name}, duration ${duration}, starts at ${startTime}, ${selectionState}`;
}

/**
 * Generates accessible description for a track
 */
export function getTrackAccessibleDescription(track: {
  type: string;
  name: string;
  clips: any[];
  isVisible: boolean;
  isMuted?: boolean;
}): string {
  const clipCount = track.clips.length;
  const clipText = clipCount === 1 ? 'clip' : 'clips';
  const visibilityState = track.isVisible ? 'visible' : 'hidden';
  const muteState = track.type === 'audio' && track.isMuted ? ', muted' : '';
  
  return `${track.type} track: ${track.name}, ${clipCount} ${clipText}, ${visibilityState}${muteState}`;
}

/**
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Checks if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Gets the appropriate focus ring style based on user preferences
 */
export function getFocusRingStyle(primaryColor: string): React.CSSProperties {
  const highContrast = prefersHighContrast();
  
  if (highContrast) {
    return {
      outline: '3px solid currentColor',
      boxShadow: 'none',
    };
  } else {
    return {
      outline: 'none',
      boxShadow: `0 0 0 2px ${primaryColor}, 0 0 0 4px rgba(255, 255, 255, 0.3)`,
    };
  }
}

/**
 * Gets transition styles that respect reduced motion preferences
 */
export function getTransitionStyle(transition: string): React.CSSProperties {
  const reducedMotion = prefersReducedMotion();
  
  return {
    transition: reducedMotion ? 'none' : transition,
  };
}

/**
 * Keyboard event handler that respects accessibility guidelines
 */
export function handleAccessibleKeyDown(
  event: React.KeyboardEvent,
  handlers: {
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onDelete?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
  }
): void {
  // Don't handle keyboard events if focus is on an input element
  const activeElement = document.activeElement;
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.tagName === 'SELECT' ||
    activeElement.getAttribute('contenteditable') === 'true'
  )) {
    return;
  }

  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      handlers.onEnter?.();
      break;
    case ' ':
      event.preventDefault();
      handlers.onSpace?.();
      break;
    case 'Escape':
      event.preventDefault();
      handlers.onEscape?.();
      break;
    case 'ArrowUp':
      event.preventDefault();
      handlers.onArrowUp?.();
      break;
    case 'ArrowDown':
      event.preventDefault();
      handlers.onArrowDown?.();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      handlers.onArrowLeft?.();
      break;
    case 'ArrowRight':
      event.preventDefault();
      handlers.onArrowRight?.();
      break;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      handlers.onDelete?.();
      break;
    case 'Home':
      event.preventDefault();
      handlers.onHome?.();
      break;
    case 'End':
      event.preventDefault();
      handlers.onEnd?.();
      break;
  }
}

/**
 * Generates unique IDs for accessibility attributes
 */
let idCounter = 0;
export function generateAccessibilityId(prefix: string = 'timeline'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Validates that an element has proper accessibility attributes
 */
export function validateAccessibility(element: HTMLElement): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for interactive elements without accessible names
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    const hasAccessibleName = 
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim();
    
    if (!hasAccessibleName) {
      issues.push('Interactive element missing accessible name');
    }
  }
  
  // Check for proper focus management
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex && parseInt(tabIndex) > 0) {
    issues.push('Positive tabindex values should be avoided');
  }
  
  // Check for missing ARIA attributes on complex widgets
  const role = element.getAttribute('role');
  if (role === 'slider') {
    const requiredAttrs = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'];
    requiredAttrs.forEach(attr => {
      if (!element.getAttribute(attr)) {
        issues.push(`Missing required attribute: ${attr}`);
      }
    });
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}