import React, { useCallback, useMemo, memo } from 'react';
import { Track as TrackType, ClipRendererProps } from '../types';
import { useEventBus } from '../eventBus/EventBusProvider';
import { useTheme } from '../theme';
import { ClipRenderer } from './ClipRenderer';
import { useScreenSize, getResponsiveValue, DEFAULT_RESPONSIVE_CONFIG } from '../utils/responsive';

interface TrackProps {
  track: TrackType;
  index: number;
  currentTime: number;
  zoom: number;
  pixelsPerSecond: number;
  selectedClipId?: string;
  renderClip?: (props: ClipRendererProps) => React.ReactNode;
  onClipSelect?: (clipId: string) => void;
  onClipDrag?: (clipId: string, newStart: number) => void;
  onClipResize?: (clipId: string, newDuration: number) => void;
  timelineWidth: number;
}

/**
 * TrackHeader component for track controls and information
 */
interface TrackHeaderProps {
  track: TrackType;
  onToggleVisibility?: (trackId: string) => void;
  onToggleMute?: (trackId: string) => void;
}

const TrackHeader = memo(function TrackHeader({ track, onToggleVisibility, onToggleMute }: TrackHeaderProps) {
  const theme = useTheme();
  const { screenSize } = useScreenSize();
  const getTrackIcon = (type: TrackType['type']) => {
    switch (type) {
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'text': return '📝';
      case 'overlay': return '🎨';
      default: return '📄';
    }
  };

  const getTrackColor = (type: TrackType['type']) => {
    return theme.clipColors[type];
  };

  // Get responsive dimensions
  const headerWidth = useMemo(() => {
    switch (screenSize) {
      case 'mobile': return '120px';
      case 'tablet': return '160px';
      case 'desktop': return '200px';
      default: return '200px';
    }
  }, [screenSize]);

  const fontSize = useMemo(() => {
    return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.fontSize, screenSize);
  }, [screenSize]);

  const padding = useMemo(() => {
    switch (screenSize) {
      case 'mobile': return '0 6px';
      case 'tablet': return '0 8px';
      case 'desktop': return '0 12px';
      default: return '0 12px';
    }
  }, [screenSize]);

  return (
    <div
      className="track-header"
      role="banner"
      aria-label={`${track.type} track: ${track.name}`}
      style={{
        width: headerWidth,
        height: `${track.height}px`,
        backgroundColor: theme.trackBackgroundColor,
        borderRight: `1px solid ${theme.primaryColor}`,
        borderBottom: `1px solid #444`,
        display: 'flex',
        alignItems: 'center',
        padding: padding,
        flexShrink: 0
      }}
    >
      {/* Track type icon */}
      <div
        style={{
          fontSize: screenSize === 'mobile' ? '12px' : '16px',
          marginRight: screenSize === 'mobile' ? '4px' : '8px',
          opacity: track.isVisible ? 1 : 0.5
        }}
      >
        {getTrackIcon(track.type)}
      </div>

      {/* Track info */}
      <div
        style={{
          flex: 1,
          minWidth: 0
        }}
      >
        <div
          style={{
            fontSize: fontSize,
            fontWeight: 'bold',
            color: getTrackColor(track.type),
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {track.name}
        </div>
        {screenSize !== 'mobile' && (
          <div
            style={{
              fontSize: screenSize === 'tablet' ? '9px' : '10px',
              color: '#999',
              textTransform: 'uppercase'
            }}
          >
            {track.type} • {track.clips.length} clips
          </div>
        )}
      </div>

      {/* Track controls */}
      <div
        style={{
          display: 'flex',
          gap: screenSize === 'mobile' ? '2px' : '4px'
        }}
      >
        {/* Mute button (for audio tracks) */}
        {track.type === 'audio' && (
          <button
            onClick={() => onToggleMute?.(track.id)}
            style={{
              width: screenSize === 'mobile' ? '16px' : '20px',
              height: screenSize === 'mobile' ? '16px' : '20px',
              border: 'none',
              borderRadius: '2px',
              backgroundColor: track.isMuted ? '#ff4444' : 'transparent',
              color: track.isMuted ? 'white' : '#ccc',
              cursor: 'pointer',
              fontSize: screenSize === 'mobile' ? '8px' : '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={track.isMuted ? 'Unmute' : 'Mute'}
            aria-label={`${track.isMuted ? 'Unmute' : 'Mute'} ${track.name}`}
            aria-pressed={track.isMuted}
          >
            {track.isMuted ? '🔇' : '🔊'}
          </button>
        )}

        {/* Visibility toggle */}
        <button
          onClick={() => onToggleVisibility?.(track.id)}
          style={{
            width: screenSize === 'mobile' ? '16px' : '20px',
            height: screenSize === 'mobile' ? '16px' : '20px',
            border: 'none',
            borderRadius: '2px',
            backgroundColor: 'transparent',
            color: track.isVisible ? theme.primaryColor : '#666',
            cursor: 'pointer',
            fontSize: screenSize === 'mobile' ? '8px' : '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={track.isVisible ? 'Hide track' : 'Show track'}
          aria-label={`${track.isVisible ? 'Hide' : 'Show'} ${track.name}`}
          aria-pressed={!track.isVisible}
        >
          {track.isVisible ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
    </div>
  );
});



/**
 * Track component that renders a single track with its clips
 * Memoized to prevent unnecessary re-renders
 */
const TrackComponent = memo(function Track({
  track,
  index,
  currentTime,
  zoom,
  pixelsPerSecond,
  selectedClipId,
  renderClip,
  onClipSelect,
  onClipDrag,
  onClipResize,
  timelineWidth
}: TrackProps) {
  const eventBus = useEventBus();
  const theme = useTheme();

  // Calculate clip positions and dimensions
  const clipElements = useMemo(() => {
    return track.clips.map(clip => {
      const isSelected = selectedClipId === clip.id;

      const clipProps: ClipRendererProps = {
        clip,
        isSelected,
        onSelect: (clipId: string) => {
          onClipSelect?.(clipId);
          // Emit clip click event
          eventBus.emit('timeline:clipClick', {
            clipId,
            time: clip.start,
            nativeEvent: new MouseEvent('click') // This would be the actual event in real usage
          });
        },
        onDrag: (clipId: string, newStart: number) => {
          onClipDrag?.(clipId, newStart);
        },
        onResize: (clipId: string, newDuration: number) => {
          onClipResize?.(clipId, newDuration);
        },
        style: {} // Style is handled internally by Clip component
      };

      return {
        clip,
        props: clipProps,
        element: (
          <ClipRenderer
            key={clip.id}
            clip={clip}
            isSelected={isSelected}
            onSelect={clipProps.onSelect}
            onDrag={clipProps.onDrag}
            onResize={clipProps.onResize}
            style={clipProps.style}
            customRenderer={renderClip}
            pixelsPerSecond={pixelsPerSecond}
            zoom={zoom}
            trackHeight={track.height}
            onDoubleClick={(clipId) => {
              // Handle double click for editing
              console.log('Double clicked clip:', clipId);
            }}
          />
        )
      };
    });
  }, [track.clips, pixelsPerSecond, zoom, selectedClipId, track.height, renderClip, onClipSelect, onClipDrag, onClipResize, eventBus]);

  // Handle track click (for deselecting clips)
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on empty space
    if (e.target === e.currentTarget) {
      onClipSelect?.(''); // Deselect all clips
    }
  }, [onClipSelect]);

  return (
    <div
      className={`track track-${track.type}`}
      style={{
        display: 'flex',
        height: `${track.height}px`,
        borderBottom: `1px solid #444`,
        backgroundColor: theme.backgroundColor
      }}
    >
      {/* Track Header */}
      <TrackHeader
        track={track}
        onToggleVisibility={(trackId) => {
          // This would be handled by parent component
          console.log('Toggle visibility for track:', trackId);
        }}
        onToggleMute={(trackId) => {
          // This would be handled by parent component
          console.log('Toggle mute for track:', trackId);
        }}
      />

      {/* Track Content Area */}
      <div
        className="track-content"
        role="region"
        aria-label={`${track.name} clips area with ${track.clips.length} clips`}
        aria-describedby={`track-${track.id}-description`}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: index % 2 === 0 ? theme.trackBackgroundColor : theme.backgroundColor,
          minWidth: `${timelineWidth}px`,
          cursor: 'default'
        }}
        onClick={handleTrackClick}
      >
        {/* Hidden description for screen readers */}
        <div
          id={`track-${track.id}-description`}
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
          {track.type} track containing {track.clips.length} clips. Click on clips to select them.
        </div>
        {/* Track background grid (optional) */}
        <div
          className="track-grid"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent ${pixelsPerSecond * zoom - 1}px,
              #333 ${pixelsPerSecond * zoom - 1}px,
              #333 ${pixelsPerSecond * zoom}px
            )`,
            opacity: 0.3,
            pointerEvents: 'none'
          }}
        />

        {/* Clips */}
        {clipElements.map(({ clip, element }) => (
          <React.Fragment key={clip.id}>
            {element}
          </React.Fragment>
        ))}

        {/* Drop zone for new clips (placeholder) */}
        <div
          className="track-drop-zone"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none'
          }}
        />
      </div>
    </div>
  );
});

// Custom comparison function for Track memoization
const areTrackPropsEqual = (prevProps: TrackProps, nextProps: TrackProps) => {
  // Check track data
  if (prevProps.track.id !== nextProps.track.id ||
      prevProps.track.name !== nextProps.track.name ||
      prevProps.track.type !== nextProps.track.type ||
      prevProps.track.height !== nextProps.track.height ||
      prevProps.track.isVisible !== nextProps.track.isVisible ||
      prevProps.track.isMuted !== nextProps.track.isMuted) {
    return false;
  }

  // Check clips array (shallow comparison)
  if (prevProps.track.clips.length !== nextProps.track.clips.length) {
    return false;
  }

  // Check if any clip changed
  for (let i = 0; i < prevProps.track.clips.length; i++) {
    const prevClip = prevProps.track.clips[i];
    const nextClip = nextProps.track.clips[i];
    if (prevClip.id !== nextClip.id ||
        prevClip.start !== nextClip.start ||
        prevClip.duration !== nextClip.duration ||
        prevClip.type !== nextClip.type) {
      return false;
    }
  }

  // Check other props
  return (
    prevProps.index === nextProps.index &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.pixelsPerSecond === nextProps.pixelsPerSecond &&
    prevProps.selectedClipId === nextProps.selectedClipId &&
    prevProps.timelineWidth === nextProps.timelineWidth
  );
};

export const Track = memo(TrackComponent, areTrackPropsEqual);
export default Track;