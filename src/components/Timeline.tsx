import React, { useReducer, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
    TimelineProps,
    TimelineState
} from '../types';
import { timelineReducer, createInitialState } from '../state/reducer';
import { useTimelineState, useStateChangeTracking } from '../state/hooks';
import { EventBusProvider, useEventBus, useEventListener } from '../eventBus/EventBusProvider';
import { TimelineErrorBoundary } from './TimelineErrorBoundary';
import { TimelineHeader } from './TimelineHeader';
import { TrackContainer } from './TrackContainer';
import { useKeyboardShortcuts, useKeyboardNavigation } from './hooks/useKeyboardShortcuts';
import { useTimelineTouchGestures } from './hooks/useTimelineTouchGestures';
import { ThemeProvider, useTheme } from '../theme';
import { useScreenSize, getResponsiveValue, getResponsivePixelsPerSecond, DEFAULT_RESPONSIVE_CONFIG } from '../utils/responsive';
import { formatTime } from './TimelineHeader';
import { 
  announceToScreenReader, 
  getClipAccessibleDescription, 
  getFocusRingStyle, 
  getTransitionStyle,
  prefersReducedMotion 
} from '../utils/accessibility';

/**
 * Internal Timeline component that uses EventBus context
 * Optimized with memoization and debouncing
 */
const TimelineInternal = memo(function TimelineInternal({
    tracks = [],
    duration = 0,
    currentTime = 0,
    zoom = 1,
    pixelsPerSecond = 100,
    trackHeight = 60,
    minZoom = 0.1,
    maxZoom = 10,
    renderClip,
    className = '',
    enableVirtualization = false,
    estimatedItemSize = 60,
    disableTouch = false,
    enableUndo = true,
    onClipClick,
    onScroll,
    onZoom,
    onStateChange
}: Omit<TimelineProps, 'eventBusNamespace' | 'theme'>) {
    // Get theme from context
    const theme = useTheme();
    const { screenSize } = useScreenSize();
    // Debouncing refs for performance optimization
    const zoomDebounceRef = useRef<NodeJS.Timeout>();
    const scrollDebounceRef = useRef<NodeJS.Timeout>();
    // Ref for touch gesture handling
    const timelineRef = useRef<HTMLDivElement>(null);
    
    // Get responsive values
    const responsiveTrackHeight = useMemo(() => {
        return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.trackHeight, screenSize);
    }, [screenSize]);
    
    const responsivePixelsPerSecond = useMemo(() => {
        return getResponsivePixelsPerSecond(pixelsPerSecond, screenSize);
    }, [pixelsPerSecond, screenSize]);
    
    // Initialize state with provided props
    const initialState = useMemo(() => {
        const state: TimelineState = {
            tracks,
            currentTime,
            duration,
            zoom,
            selectedClipId: undefined,
            isPlaying: false
        };
        return createInitialState(state);
    }, []); // Only initialize once

    const [state, dispatch] = useReducer(timelineReducer, initialState);
    const eventBus = useEventBus();

    // Enhanced state management with undo/redo and serialization
    const timelineState = useTimelineState(state, dispatch);

    // Track state changes and emit events
    useStateChangeTracking(state, eventBus);

    // Track zoom changes and emit zoom events
    const prevZoomRef = useRef(state.present.zoom);
    useEffect(() => {
        if (prevZoomRef.current !== state.present.zoom) {
            eventBus.emit('timeline:zoom', {
                oldScale: prevZoomRef.current,
                newScale: state.present.zoom
            });
            prevZoomRef.current = state.present.zoom;
        }
    }, [state.present.zoom, eventBus]);

    // Debounced zoom function for performance
    const debouncedSetZoom = useCallback((newZoom: number) => {
        if (zoomDebounceRef.current) {
            clearTimeout(zoomDebounceRef.current);
        }
        
        zoomDebounceRef.current = setTimeout(() => {
            timelineState.actions.setZoom(newZoom);
        }, 16); // ~60fps throttling
    }, [timelineState.actions]);

    // Keyboard shortcuts for zoom controls with debouncing
    const keyboardShortcutsConfig = useMemo(() => ({
        onZoomIn: () => {
            const newZoom = Math.min(maxZoom, state.present.zoom * 1.5);
            debouncedSetZoom(newZoom);
        },
        onZoomOut: () => {
            const newZoom = Math.max(minZoom, state.present.zoom / 1.5);
            debouncedSetZoom(newZoom);
        },
        onZoomReset: () => {
            debouncedSetZoom(1);
        },
        onZoomToFit: () => {
            const fitZoom = Math.max(minZoom, Math.min(maxZoom, 0.5));
            debouncedSetZoom(fitZoom);
        },
        enabled: true
    }), [maxZoom, minZoom, state.present.zoom, debouncedSetZoom]);

    useKeyboardShortcuts(keyboardShortcutsConfig);

    // Enhanced keyboard navigation for clips
    const keyboardNavigationConfig = useMemo(() => ({
        tracks: state.present.tracks,
        selectedClipId: state.present.selectedClipId,
        onClipSelect: timelineState.actions.selectClip,
        onClipDeselect: timelineState.actions.deselectClip,
        onClipRemove: (clipId: string) => {
            timelineState.actions.removeClip(clipId);
        },
        onPlayPause: () => {
            timelineState.actions.setPlaying(!state.present.isPlaying);
        },
        onZoomIn: () => {
            const newZoom = Math.min(maxZoom, state.present.zoom * 1.5);
            debouncedSetZoom(newZoom);
        },
        onZoomOut: () => {
            const newZoom = Math.max(minZoom, state.present.zoom / 1.5);
            debouncedSetZoom(newZoom);
        },
        onZoomReset: () => {
            debouncedSetZoom(1);
        },
        onZoomToFit: () => {
            const fitZoom = Math.max(minZoom, Math.min(maxZoom, 0.5));
            debouncedSetZoom(fitZoom);
        },
        enabled: true
    }), [
        state.present.tracks,
        state.present.selectedClipId,
        state.present.isPlaying,
        timelineState.actions,
        maxZoom,
        minZoom,
        state.present.zoom,
        debouncedSetZoom
    ]);

    const keyboardNavigation = useKeyboardNavigation(keyboardNavigationConfig);

    // Focus management for selected clip
    useEffect(() => {
        if (state.present.selectedClipId) {
            // Find and focus the selected clip element
            const clipElement = document.querySelector(`[data-clip-id="${state.present.selectedClipId}"]`) as HTMLElement;
            if (clipElement && document.activeElement !== clipElement) {
                clipElement.focus();
            }
            
            // Announce clip selection to screen readers
            const selectedClip = state.present.tracks
                .flatMap(track => track.clips)
                .find(clip => clip.id === state.present.selectedClipId);
            
            if (selectedClip) {
                const description = getClipAccessibleDescription(selectedClip, true);
                announceToScreenReader(`Selected: ${description}`);
            }
        }
    }, [state.present.selectedClipId]);

    // Announce play/pause state changes
    const prevPlayingRef = useRef(state.present.isPlaying);
    useEffect(() => {
        if (prevPlayingRef.current !== state.present.isPlaying) {
            announceToScreenReader(state.present.isPlaying ? 'Playing' : 'Paused');
            prevPlayingRef.current = state.present.isPlaying;
        }
    }, [state.present.isPlaying]);

    // Announce zoom changes
    const prevZoomAnnouncedRef = useRef(state.present.zoom);
    useEffect(() => {
        if (Math.abs(prevZoomAnnouncedRef.current - state.present.zoom) > 0.1) {
            announceToScreenReader(`Zoom level: ${Math.round(state.present.zoom * 100)}%`);
            prevZoomAnnouncedRef.current = state.present.zoom;
        }
    }, [state.present.zoom]);

    // Touch gesture handling
    const handleClipSelect = useCallback((clipId: string, x: number, y: number) => {
        if (clipId) {
            timelineState.actions.selectClip(clipId);
        } else {
            timelineState.actions.deselectClip();
        }
    }, [timelineState.actions]);

    const handleContextMenu = useCallback((x: number, y: number) => {
        // Context menu functionality can be implemented by consumers
        // For now, we just emit an event that consumers can listen to
        eventBus.emit('timeline:contextMenu', { x, y });
    }, [eventBus]);

    // Initialize touch gestures
    useTimelineTouchGestures(timelineRef, {
        disabled: disableTouch,
        pixelsPerSecond: responsivePixelsPerSecond,
        zoom: state.present.zoom,
        minZoom,
        maxZoom,
        onClipSelect: handleClipSelect,
        onContextMenu: handleContextMenu
    });

    // Sync external props with internal state
    useEffect(() => {
        if (tracks !== state.present.tracks) {
            // Only update if tracks actually changed
            const tracksChanged = JSON.stringify(tracks) !== JSON.stringify(state.present.tracks);
            if (tracksChanged) {
                timelineState.resetState({
                    ...state.present,
                    tracks
                });
            }
        }
    }, [tracks, state.present.tracks, timelineState]);

    useEffect(() => {
        if (duration !== state.present.duration) {
            timelineState.actions.setDuration(duration);
        }
    }, [duration, state.present.duration, timelineState.actions]);

    useEffect(() => {
        if (currentTime !== state.present.currentTime) {
            timelineState.actions.setCurrentTime(currentTime);
        }
    }, [currentTime, state.present.currentTime, timelineState.actions]);

    useEffect(() => {
        if (zoom !== state.present.zoom) {
            timelineState.actions.setZoom(zoom);
        }
    }, [zoom, state.present.zoom, timelineState.actions]);

    // Event bus listeners for external commands
    useEventListener('timeline:addClip', useCallback((payload) => {
        try {
            timelineState.actions.addClip(payload.clip);
        } catch (error) {
            console.error('Failed to add clip:', error);
        }
    }, [timelineState.actions]), [timelineState.actions]);

    useEventListener('timeline:removeClip', useCallback((payload) => {
        try {
            timelineState.actions.removeClip(payload.clipId);
        } catch (error) {
            console.error('Failed to remove clip:', error);
        }
    }, [timelineState.actions]), [timelineState.actions]);

    useEventListener('timeline:updateClip', useCallback((payload) => {
        try {
            timelineState.actions.updateClip(payload.clipId, payload.updates);
        } catch (error) {
            console.error('Failed to update clip:', error);
        }
    }, [timelineState.actions]), [timelineState.actions]);

    useEventListener('timeline:scrollTo', useCallback((payload) => {
        try {
            timelineState.actions.setCurrentTime(payload.time);
        } catch (error) {
            console.error('Failed to scroll to time:', error);
        }
    }, [timelineState.actions]), [timelineState.actions]);

    // Add zoom event handlers for external control
    useEventListener('timeline:setZoom', useCallback((payload) => {
        try {
            const newZoom = Math.max(minZoom, Math.min(maxZoom, payload.zoom));
            timelineState.actions.setZoom(newZoom);
        } catch (error) {
            console.error('Failed to set zoom:', error);
        }
    }, [minZoom, maxZoom, timelineState.actions]), [minZoom, maxZoom, timelineState.actions]);

    useEventListener('timeline:zoomIn', useCallback((payload) => {
        try {
            const factor = payload?.factor || 1.5;
            const newZoom = Math.min(maxZoom, state.present.zoom * factor);
            timelineState.actions.setZoom(newZoom);
        } catch (error) {
            console.error('Failed to zoom in:', error);
        }
    }, [maxZoom, state.present.zoom, timelineState.actions]), [maxZoom, state.present.zoom, timelineState.actions]);

    useEventListener('timeline:zoomOut', useCallback((payload) => {
        try {
            const factor = payload?.factor || 1.5;
            const newZoom = Math.max(minZoom, state.present.zoom / factor);
            timelineState.actions.setZoom(newZoom);
        } catch (error) {
            console.error('Failed to zoom out:', error);
        }
    }, [minZoom, state.present.zoom, timelineState.actions]), [minZoom, state.present.zoom, timelineState.actions]);

    useEventListener('timeline:zoomToFit', useCallback(() => {
        try {
            // Calculate zoom to fit all content
            const maxDuration = Math.max(
                ...state.present.tracks.map(track => 
                    Math.max(...track.clips.map(clip => clip.start + clip.duration), 0)
                ),
                state.present.duration || 0
            );
            
            if (maxDuration > 0) {
                // Use responsive viewport width calculation
                const viewportWidth = screenSize === 'mobile' ? 300 : screenSize === 'tablet' ? 600 : 1000;
                const fitZoom = Math.max(minZoom, Math.min(maxZoom, viewportWidth / (maxDuration * responsivePixelsPerSecond)));
                timelineState.actions.setZoom(fitZoom);
            }
        } catch (error) {
            console.error('Failed to zoom to fit:', error);
        }
    }, [minZoom, maxZoom, pixelsPerSecond, state.present.tracks, state.present.duration, timelineState.actions]), [minZoom, maxZoom, pixelsPerSecond, state.present.tracks, state.present.duration, timelineState.actions]);

    // Add zoom to selection event handler
    useEventListener('timeline:zoomToSelection', useCallback((payload) => {
        try {
            const { startTime, endTime } = payload;
            if (typeof startTime !== 'number' || typeof endTime !== 'number' || startTime >= endTime) {
                console.error('Invalid selection range for zoom:', payload);
                return;
            }
            
            const selectionDuration = endTime - startTime;
            const viewportWidth = screenSize === 'mobile' ? 300 : screenSize === 'tablet' ? 600 : 1000;
            const fitZoom = Math.max(minZoom, Math.min(maxZoom, viewportWidth / (selectionDuration * responsivePixelsPerSecond)));
            
            // Set zoom first
            timelineState.actions.setZoom(fitZoom);
            
            // Then scroll to center the selection
            const centerTime = (startTime + endTime) / 2;
            timelineState.actions.setCurrentTime(centerTime);
        } catch (error) {
            console.error('Failed to zoom to selection:', error);
        }
    }, [minZoom, maxZoom, pixelsPerSecond, timelineState.actions]), [minZoom, maxZoom, pixelsPerSecond, timelineState.actions]);

    useEventListener('timeline:undo', useCallback(() => {
        if (enableUndo) {
            timelineState.undo();
        }
    }, [enableUndo, timelineState]), [enableUndo, timelineState]);

    useEventListener('timeline:redo', useCallback(() => {
        if (enableUndo) {
            timelineState.redo();
        }
    }, [enableUndo, timelineState]), [enableUndo, timelineState]);

    useEventListener('timeline:exportState', useCallback(() => {
        try {
            const exportedState = timelineState.exportState();
            eventBus.emit('timeline:stateExported', { state: JSON.parse(exportedState) });
        } catch (error) {
            console.error('Failed to export state:', error);
        }
    }, [timelineState, eventBus]), [timelineState, eventBus]);

    useEventListener('timeline:importState', useCallback((payload) => {
        try {
            const serializedState = JSON.stringify(payload.state);
            timelineState.importState(serializedState);
        } catch (error) {
            console.error('Failed to import state:', error);
        }
    }, [timelineState]), [timelineState]);

    // Emit ready event when component mounts
    useEffect(() => {
        eventBus.emit('timeline:ready', undefined);
    }, [eventBus]);

    // Forward events to callback props if provided
    useEventListener('timeline:clipClick', useCallback((payload) => {
        onClipClick?.(payload);
    }, [onClipClick]), [onClipClick]);

    useEventListener('timeline:scroll', useCallback((payload) => {
        onScroll?.(payload);
    }, [onScroll]), [onScroll]);

    useEventListener('timeline:zoom', useCallback((payload) => {
        onZoom?.(payload);
    }, [onZoom]), [onZoom]);

    useEventListener('timeline:stateChange', useCallback((payload) => {
        onStateChange?.(payload);
    }, [onStateChange]), [onStateChange]);

    // Render timeline structure
    return (
        <div
            ref={timelineRef}
            className={`timeline-root ${className}`}
            role="application"
            aria-label="Video Timeline Editor"
            aria-describedby="timeline-instructions timeline-status"
            aria-live="polite"
            aria-atomic="false"
            tabIndex={0}
            style={{
                backgroundColor: theme.backgroundColor,
                fontFamily: theme.fonts.primary,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                touchAction: disableTouch ? 'auto' : 'none', // Prevent default touch behaviors when gestures are enabled
                outline: 'none', // Remove default focus outline, we'll handle focus visually
                // Add focus indicator with accessibility support
                ...getFocusRingStyle(theme.primaryColor),
                // Respect reduced motion preferences
                ...getTransitionStyle('box-shadow 0.15s ease-in-out')
            }}
        >
            {/* Screen reader instructions */}
            <div
                id="timeline-instructions"
                className="sr-only"
                style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0
                }}
            >
                Video timeline editor with {state.present.tracks.length} tracks and {state.present.tracks.reduce((total, track) => total + track.clips.length, 0)} clips. 
                Use arrow keys to navigate between clips. Press Space to play/pause. Press Delete to remove selected clip. Press Escape to deselect. 
                Press Ctrl+Plus to zoom in, Ctrl+Minus to zoom out, Ctrl+0 to reset zoom.
            </div>

            {/* Live status region for screen reader announcements */}
            <div
                id="timeline-status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
                style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0
                }}
            >
                {/* Status announcements will be dynamically updated here */}
                {state.present.selectedClipId && (() => {
                    const selectedClip = state.present.tracks
                        .flatMap(track => track.clips)
                        .find(clip => clip.id === state.present.selectedClipId);
                    if (selectedClip) {
                        const minutes = Math.floor(selectedClip.start / 60);
                        const seconds = Math.floor(selectedClip.start % 60);
                        const duration = Math.floor(selectedClip.duration);
                        return `Selected ${selectedClip.type} clip: ${selectedClip.metadata?.name || 'Unnamed clip'}, starts at ${minutes}:${seconds.toString().padStart(2, '0')}, duration ${duration} seconds`;
                    }
                    return '';
                })()}
                {state.present.isPlaying ? 'Playing' : 'Paused'}
                {` at ${formatTime(state.present.currentTime)}, zoom ${Math.round(state.present.zoom * 100)}%`}
            </div>

            {/* Clip-specific instructions for selected clip */}
            {state.present.selectedClipId && (
                <div
                    id="clip-instructions"
                    className="sr-only"
                    style={{
                        position: 'absolute',
                        width: '1px',
                        height: '1px',
                        padding: 0,
                        margin: '-1px',
                        overflow: 'hidden',
                        clip: 'rect(0, 0, 0, 0)',
                        whiteSpace: 'nowrap',
                        border: 0
                    }}
                >
                    Selected clip. Use arrow keys to navigate to other clips, Delete to remove, or Escape to deselect.
                </div>
            )}
            {/* Timeline Header */}
            <div className="timeline-header" style={{ flexShrink: 0 }}>
                <TimelineHeader
                    currentTime={state.present.currentTime}
                    duration={state.present.duration}
                    zoom={state.present.zoom}
                    minZoom={minZoom}
                    maxZoom={maxZoom}
                    pixelsPerSecond={responsivePixelsPerSecond}
                    onZoomChange={timelineState.actions.setZoom}
                    onTimeChange={timelineState.actions.setCurrentTime}
                />
            </div>

            {/* Timeline Body */}
            <div className="timeline-body" style={{
                flex: 1,
                overflow: 'hidden',
                position: 'relative'
            }}>
                <TrackContainer
                    tracks={state.present.tracks.map(track => ({
                        ...track,
                        height: responsiveTrackHeight // Use responsive track height
                    }))}
                    currentTime={state.present.currentTime}
                    zoom={state.present.zoom}
                    pixelsPerSecond={responsivePixelsPerSecond}
                    selectedClipId={state.present.selectedClipId}
                    renderClip={renderClip}
                    onClipSelect={timelineState.actions.selectClip}
                    onClipDrag={(clipId, newStart) => {
                        timelineState.actions.updateClip(clipId, { start: newStart });
                    }}
                    onClipResize={(clipId, newDuration) => {
                        timelineState.actions.updateClip(clipId, { duration: newDuration });
                    }}
                    onScrollChange={(scrollLeft, calculatedTime) => {
                        // Update current time based on scroll position
                        timelineState.actions.setCurrentTime(calculatedTime);
                    }}
                    enableVirtualization={enableVirtualization}
                    estimatedItemSize={responsiveTrackHeight}
                />
            </div>
        </div>
    );
});

/**
 * Main Timeline component with EventBus provider
 * Memoized to prevent unnecessary re-renders
 */
const TimelineComponent = memo(function Timeline(props: TimelineProps) {
    const { eventBusNamespace = 'timeline', theme, ...timelineProps } = props;

    return (
        <TimelineErrorBoundary>
            <ThemeProvider theme={theme}>
                <EventBusProvider namespace={eventBusNamespace} debugMode={process.env.NODE_ENV === 'development'}>
                    <TimelineInternal {...timelineProps} />
                </EventBusProvider>
            </ThemeProvider>
        </TimelineErrorBoundary>
    );
});

// Cleanup function for debounce timers
const useCleanupTimers = (zoomDebounceRef: React.RefObject<NodeJS.Timeout>, scrollDebounceRef: React.RefObject<NodeJS.Timeout>) => {
    useEffect(() => {
        return () => {
            if (zoomDebounceRef.current) {
                clearTimeout(zoomDebounceRef.current);
            }
            if (scrollDebounceRef.current) {
                clearTimeout(scrollDebounceRef.current);
            }
        };
    }, [zoomDebounceRef, scrollDebounceRef]);
};

export const Timeline = memo(TimelineComponent);
export default Timeline;