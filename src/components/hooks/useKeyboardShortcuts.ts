import { useEffect, useCallback, useRef } from 'react';
import { Clip, Track } from '../../types';

interface KeyboardShortcutsConfig {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onZoomToFit?: () => void;
  enabled?: boolean;
}

interface KeyboardNavigationConfig {
  tracks: Track[];
  selectedClipId?: string;
  onClipSelect: (clipId: string) => void;
  onClipDeselect: () => void;
  onClipRemove: (clipId: string) => void;
  onPlayPause: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onZoomToFit?: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts in the timeline
 */
export function useKeyboardShortcuts({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomToFit,
  enabled = true
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if we're in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Handle Ctrl/Cmd key combinations
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd) {
      switch (event.key) {
        case '=':
        case '+':
          event.preventDefault();
          onZoomIn?.();
          break;
        case '-':
          event.preventDefault();
          onZoomOut?.();
          break;
        case '0':
          event.preventDefault();
          onZoomReset?.();
          break;
        case '9':
          event.preventDefault();
          onZoomToFit?.();
          break;
      }
    }
  }, [enabled, onZoomIn, onZoomOut, onZoomReset, onZoomToFit]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);
}

/**
 * Hook for handling keyboard navigation between clips
 */
export function useKeyboardNavigation({
  tracks,
  selectedClipId,
  onClipSelect,
  onClipDeselect,
  onClipRemove,
  onPlayPause,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomToFit,
  enabled = true
}: KeyboardNavigationConfig) {
  const focusedElementRef = useRef<HTMLElement | null>(null);

  // Get all clips sorted by start time and track order
  const getAllClips = useCallback((): { clip: Clip; trackIndex: number }[] => {
    const allClips: { clip: Clip; trackIndex: number }[] = [];
    
    tracks.forEach((track, trackIndex) => {
      track.clips.forEach(clip => {
        allClips.push({ clip, trackIndex });
      });
    });
    
    // Sort by track index first, then by start time
    return allClips.sort((a, b) => {
      if (a.trackIndex !== b.trackIndex) {
        return a.trackIndex - b.trackIndex;
      }
      return a.clip.start - b.clip.start;
    });
  }, [tracks]);

  // Get clips in the same track
  const getClipsInTrack = useCallback((trackId: string): Clip[] => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return [];
    
    return [...track.clips].sort((a, b) => a.start - b.start);
  }, [tracks]);

  // Get clips in the same column (similar start time)
  const getClipsInColumn = useCallback((targetClip: Clip): Clip[] => {
    const allClips = getAllClips();
    const tolerance = 0.5; // 500ms tolerance for "same column"
    
    return allClips
      .filter(({ clip }) => Math.abs(clip.start - targetClip.start) <= tolerance)
      .map(({ clip }) => clip)
      .sort((a, b) => {
        const trackA = tracks.findIndex(t => t.id === a.trackId);
        const trackB = tracks.findIndex(t => t.id === b.trackId);
        return trackA - trackB;
      });
  }, [getAllClips, tracks]);

  // Navigate to next clip in the same track
  const navigateToNextClip = useCallback(() => {
    if (!selectedClipId) {
      // Select first clip if none selected
      const allClips = getAllClips();
      if (allClips.length > 0) {
        onClipSelect(allClips[0].clip.id);
      }
      return;
    }

    const selectedClip = getAllClips().find(({ clip }) => clip.id === selectedClipId)?.clip;
    if (!selectedClip) return;

    const clipsInTrack = getClipsInTrack(selectedClip.trackId);
    const currentIndex = clipsInTrack.findIndex(clip => clip.id === selectedClipId);
    
    if (currentIndex < clipsInTrack.length - 1) {
      onClipSelect(clipsInTrack[currentIndex + 1].id);
    }
  }, [selectedClipId, getAllClips, getClipsInTrack, onClipSelect]);

  // Navigate to previous clip in the same track
  const navigateToPreviousClip = useCallback(() => {
    if (!selectedClipId) {
      // Select last clip if none selected
      const allClips = getAllClips();
      if (allClips.length > 0) {
        onClipSelect(allClips[allClips.length - 1].clip.id);
      }
      return;
    }

    const selectedClip = getAllClips().find(({ clip }) => clip.id === selectedClipId)?.clip;
    if (!selectedClip) return;

    const clipsInTrack = getClipsInTrack(selectedClip.trackId);
    const currentIndex = clipsInTrack.findIndex(clip => clip.id === selectedClipId);
    
    if (currentIndex > 0) {
      onClipSelect(clipsInTrack[currentIndex - 1].id);
    }
  }, [selectedClipId, getAllClips, getClipsInTrack, onClipSelect]);

  // Navigate to clip above (same column, previous track)
  const navigateToClipAbove = useCallback(() => {
    if (!selectedClipId) {
      // Select first clip if none selected
      const allClips = getAllClips();
      if (allClips.length > 0) {
        onClipSelect(allClips[0].clip.id);
      }
      return;
    }

    const selectedClip = getAllClips().find(({ clip }) => clip.id === selectedClipId)?.clip;
    if (!selectedClip) return;

    const clipsInColumn = getClipsInColumn(selectedClip);
    const currentIndex = clipsInColumn.findIndex(clip => clip.id === selectedClipId);
    
    if (currentIndex > 0) {
      onClipSelect(clipsInColumn[currentIndex - 1].id);
    }
  }, [selectedClipId, getAllClips, getClipsInColumn, onClipSelect]);

  // Navigate to clip below (same column, next track)
  const navigateToClipBelow = useCallback(() => {
    if (!selectedClipId) {
      // Select first clip if none selected
      const allClips = getAllClips();
      if (allClips.length > 0) {
        onClipSelect(allClips[0].clip.id);
      }
      return;
    }

    const selectedClip = getAllClips().find(({ clip }) => clip.id === selectedClipId)?.clip;
    if (!selectedClip) return;

    const clipsInColumn = getClipsInColumn(selectedClip);
    const currentIndex = clipsInColumn.findIndex(clip => clip.id === selectedClipId);
    
    if (currentIndex < clipsInColumn.length - 1) {
      onClipSelect(clipsInColumn[currentIndex + 1].id);
    }
  }, [selectedClipId, getAllClips, getClipsInColumn, onClipSelect]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if we're in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Handle Ctrl/Cmd key combinations first
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd) {
      switch (event.key) {
        case '=':
        case '+':
          event.preventDefault();
          onZoomIn?.();
          break;
        case '-':
          event.preventDefault();
          onZoomOut?.();
          break;
        case '0':
          event.preventDefault();
          onZoomReset?.();
          break;
        case '9':
          event.preventDefault();
          onZoomToFit?.();
          break;
      }
      return;
    }

    // Handle navigation and action keys
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        navigateToNextClip();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        navigateToPreviousClip();
        break;
      case 'ArrowUp':
        event.preventDefault();
        navigateToClipAbove();
        break;
      case 'ArrowDown':
        event.preventDefault();
        navigateToClipBelow();
        break;
      case ' ':
        event.preventDefault();
        onPlayPause();
        break;
      case 'Delete':
      case 'Backspace':
        if (selectedClipId) {
          event.preventDefault();
          onClipRemove(selectedClipId);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClipDeselect();
        break;
      case 'Tab':
        // Allow default tab behavior but track focus
        focusedElementRef.current = target;
        break;
    }
  }, [
    enabled,
    navigateToNextClip,
    navigateToPreviousClip,
    navigateToClipAbove,
    navigateToClipBelow,
    onPlayPause,
    selectedClipId,
    onClipRemove,
    onClipDeselect,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onZoomToFit
  ]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  // Return navigation functions for external use
  return {
    navigateToNextClip,
    navigateToPreviousClip,
    navigateToClipAbove,
    navigateToClipBelow,
    focusedElement: focusedElementRef.current
  };
}