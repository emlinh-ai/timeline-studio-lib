import React, { useMemo, useCallback, memo } from 'react';
import { Track as TrackType, ClipRendererProps } from '../types';
import { Track } from './Track';
import { ScrollableContainer } from './ScrollableContainer';
import { VirtualizedTrackContainer } from './VirtualizedTrackContainer';
import { useTheme } from '../theme';

interface TrackContainerProps {
  tracks: TrackType[];
  currentTime: number;
  zoom: number;
  pixelsPerSecond: number;
  selectedClipId?: string;
  renderClip?: (props: ClipRendererProps) => React.ReactNode;
  onClipSelect?: (clipId: string) => void;
  onClipDrag?: (clipId: string, newStart: number) => void;
  onClipResize?: (clipId: string, newDuration: number) => void;
  onScrollChange?: (scrollLeft: number, currentTime: number) => void;
  enableVirtualization?: boolean;
  estimatedItemSize?: number;
}

/**
 * TrackContainer component that renders all tracks in the timeline
 * Handles virtualization for performance with large numbers of tracks
 * Memoized to prevent unnecessary re-renders
 */
const TrackContainerComponent = memo(function TrackContainer({
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
  enableVirtualization = false,
  estimatedItemSize = 60
}: TrackContainerProps) {
  const theme = useTheme();

  // Calculate total timeline width
  const timelineWidth = useMemo(() => {
    const maxDuration = Math.max(
      ...tracks.map(track => 
        Math.max(...track.clips.map(clip => clip.start + clip.duration), 0)
      ),
      0
    );
    return Math.max(maxDuration * pixelsPerSecond * zoom, 1000); // Minimum width for usability
  }, [tracks, pixelsPerSecond, zoom]);

  // Filter visible tracks
  const visibleTracks = useMemo(() => {
    return tracks.filter(track => track.isVisible);
  }, [tracks]);

  // Handle scroll changes
  const handleScrollChange = useCallback((scrollLeft: number, calculatedTime: number) => {
    // Forward scroll event to parent component
    onScrollChange?.(scrollLeft, calculatedTime);
  }, [onScrollChange]);

  // Use virtualized container if enabled and we have many tracks
  if (enableVirtualization && visibleTracks.length > 10) {
    return (
      <VirtualizedTrackContainer
        tracks={tracks}
        currentTime={currentTime}
        zoom={zoom}
        pixelsPerSecond={pixelsPerSecond}
        selectedClipId={selectedClipId}
        renderClip={renderClip}
        onClipSelect={onClipSelect}
        onClipDrag={onClipDrag}
        onClipResize={onClipResize}
        onScrollChange={onScrollChange}
        estimatedItemSize={estimatedItemSize}
        overscan={5}
        containerHeight={400}
      />
    );
  }

  // Render tracks without virtualization for smaller datasets
  const renderTracks = () => {
    return visibleTracks.map((track, index) => (
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
    ));
  };

  return (
    <div
      className="track-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
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
        {/* Tracks */}
        <div
          className="tracks-wrapper"
          style={{
            width: '100%',
            minWidth: `${timelineWidth}px`,
            position: 'relative'
          }}
        >
          {visibleTracks.length > 0 ? (
            renderTracks()
          ) : (
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
          )}

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

export const TrackContainer = memo(TrackContainerComponent);
export default TrackContainer;