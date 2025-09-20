import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { Track as TrackType, ClipRendererProps } from '../types';
import { Track } from './Track';
import { ScrollableContainer } from './ScrollableContainer';
import { VirtualizationWrapper } from './VirtualizationWrapper';
import { useEventBus } from '../eventBus/EventBusProvider';
import { useTheme } from '../theme';

interface VirtualizedTrackContainerProps {
  tracks: TrackType[];
  currentTime: number;
  zoom: number;
  pixelsPerSecond: number;
  theme?: any;
  selectedClipId?: string;
  renderClip?: (props: ClipRendererProps) => React.ReactNode;
  onClipSelect?: (clipId: string) => void;
  onClipDrag?: (clipId: string, newStart: number) => void;
  onClipResize?: (clipId: string, newDuration: number) => void;
  onScrollChange?: (scrollLeft: number, currentTime: number) => void;
  estimatedItemSize?: number;
  overscan?: number;
  containerHeight?: number;
}

/**
 * VirtualizedTrackContainer component that efficiently renders large numbers of tracks
 * using virtualization for optimal performance
 * Memoized to prevent unnecessary re-renders
 */
const VirtualizedTrackContainerComponent = memo(function VirtualizedTrackContainer({
  tracks,
  currentTime,
  zoom,
  pixelsPerSecond,
  selectedClipId,
  renderClip,
  onClipSelect,
  onClipDrag,
  onClipResize,
  onScrollChange,
  estimatedItemSize = 60,
  overscan = 5,
  containerHeight = 400
}: VirtualizedTrackContainerProps) {
  const eventBus = useEventBus();
  const theme = useTheme();
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // Filter visible tracks
  const visibleTracks = useMemo(() => {
    return tracks.filter(track => track.isVisible);
  }, [tracks]);

  // Calculate total timeline width
  const timelineWidth = useMemo(() => {
    const maxDuration = Math.max(
      ...visibleTracks.map(track => 
        Math.max(...track.clips.map(clip => clip.start + clip.duration), 0)
      ),
      0
    );
    return Math.max(maxDuration * pixelsPerSecond * zoom, 1000); // Minimum width for usability
  }, [visibleTracks, pixelsPerSecond, zoom]);

  // Handle scroll changes
  const handleScrollChange = useCallback((scrollLeft: number, calculatedTime: number) => {
    onScrollChange?.(scrollLeft, calculatedTime);
  }, [onScrollChange]);

  // Handle visible range changes for performance monitoring
  const handleVisibleRangeChange = useCallback((startIndex: number, endIndex: number) => {
    setVisibleRange({ start: startIndex, end: endIndex });
    
    // Emit performance metrics if in development mode
    if (process.env.NODE_ENV === 'development') {
      eventBus.emit('timeline:virtualization:rangeChange', {
        startIndex,
        endIndex,
        totalItems: visibleTracks.length,
        renderedItems: endIndex - startIndex + 1
      });
    }
  }, [eventBus, visibleTracks.length]);

  // Render individual track item
  const renderTrackItem = useCallback((index: number, style: React.CSSProperties) => {
    const track = visibleTracks[index];
    if (!track) return null;

    return (
      <div style={style}>
        <Track
          key={track.id}
          track={track}
          index={index}
          currentTime={currentTime}
          zoom={zoom}
          pixelsPerSecond={pixelsPerSecond}
          selectedClipId={selectedClipId}
          renderClip={renderClip}
          onClipSelect={onClipSelect}
          onClipDrag={onClipDrag}
          onClipResize={onClipResize}
          timelineWidth={timelineWidth}
        />
      </div>
    );
  }, [
    visibleTracks,
    currentTime,
    zoom,
    pixelsPerSecond,
    theme,
    selectedClipId,
    renderClip,
    onClipSelect,
    onClipDrag,
    onClipResize,
    timelineWidth
  ]);

  // Performance monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const renderStart = performance.now();
      
      // Use requestAnimationFrame to measure after render
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStart;
        
        if (renderTime > 16) { // More than one frame at 60fps
          console.warn(`VirtualizedTrackContainer render took ${renderTime.toFixed(2)}ms`);
        }
        
        eventBus.emit('timeline:performance:render', {
          renderTime,
          visibleItems: visibleRange.end - visibleRange.start + 1,
          totalItems: visibleTracks.length
        });
      });
    }
  }, [visibleRange, visibleTracks.length, eventBus]);

  // Early return for empty tracks
  if (visibleTracks.length === 0) {
    return (
      <div
        className="virtualized-track-container empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: containerHeight,
          backgroundColor: theme.backgroundColor,
          position: 'relative'
        }}
      >
        <div
          className="empty-tracks"
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666',
            fontFamily: theme.fonts.primary
          }}
        >
          No tracks to display
        </div>
      </div>
    );
  }

  return (
    <div
      className="virtualized-track-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: containerHeight,
        backgroundColor: theme.backgroundColor,
        position: 'relative'
      }}
    >
      <ScrollableContainer
        contentWidth={timelineWidth}
        pixelsPerSecond={pixelsPerSecond}
        zoom={zoom}
        currentTime={currentTime}
        onScrollChange={handleScrollChange}
      >
        <div
          className="virtualized-tracks-wrapper"
          style={{
            width: '100%',
            position: 'relative',
            height: '100%'
          }}
        >
          {/* Virtualized track rendering */}
          <VirtualizationWrapper
            itemCount={visibleTracks.length}
            itemHeight={estimatedItemSize}
            estimatedItemSize={estimatedItemSize}
            overscan={overscan}
            height={containerHeight}
            width="100%"
            renderItem={renderTrackItem}
            useFixedSize={true}
            onVisibleRangeChange={handleVisibleRangeChange}
            className="tracks-virtualizer"
          />

          {/* Current time indicator line */}
          <div
            className="timeline-playhead"
            style={{
              position: 'absolute',
              left: `${currentTime * pixelsPerSecond * zoom}px`,
              top: 0,
              width: '2px',
              height: '100%',
              backgroundColor: '#ff4444',
              pointerEvents: 'none',
              zIndex: 100
            }}
          />
        </div>
      </ScrollableContainer>
    </div>
  );
});

export const VirtualizedTrackContainer = memo(VirtualizedTrackContainerComponent);
export default VirtualizedTrackContainer;