import React, { useCallback, useMemo, memo } from 'react';
import { useEventBus } from '../eventBus/EventBusProvider';
import { useTheme } from '../theme';
import { useScreenSize, getResponsiveTimeInterval, getResponsiveValue, DEFAULT_RESPONSIVE_CONFIG } from '../utils/responsive';

interface TimelineHeaderProps {
  currentTime: number;
  duration: number;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  pixelsPerSecond: number;
  onZoomChange?: (zoom: number) => void;
  onTimeChange?: (time: number) => void;
}

/**
 * Formats time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);
  const remainingSeconds = Math.floor(absSeconds % 60);
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * TimeRuler component that shows time markers
 */
interface TimeRulerProps {
  duration: number;
  currentTime: number;
  zoom: number;
  pixelsPerSecond: number;
  onTimeClick?: (time: number) => void;
}

const TimeRuler = memo(function TimeRuler({ 
  duration, 
  currentTime, 
  zoom, 
  pixelsPerSecond, 
  onTimeClick 
}: TimeRulerProps) {
  const theme = useTheme();
  const { screenSize } = useScreenSize();
  
  // Calculate the interval between time markers based on zoom level and screen size
  const timeInterval = useMemo(() => {
    return getResponsiveTimeInterval(pixelsPerSecond, zoom, screenSize);
  }, [pixelsPerSecond, zoom, screenSize]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers = [];
    const totalWidth = duration * pixelsPerSecond * zoom;
    
    for (let time = 0; time <= duration; time += timeInterval) {
      const position = (time / duration) * totalWidth;
      markers.push({
        time,
        position,
        label: formatTime(time),
        isMajor: time % (timeInterval * 5) === 0 || time === 0
      });
    }
    
    return markers;
  }, [duration, timeInterval, pixelsPerSecond, zoom]);

  const handleRulerClick = useCallback((event: React.MouseEvent) => {
    if (!onTimeClick) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const totalWidth = duration * pixelsPerSecond * zoom;
    const clickedTime = (clickX / totalWidth) * duration;
    
    onTimeClick(Math.max(0, Math.min(duration, clickedTime)));
  }, [duration, pixelsPerSecond, zoom, onTimeClick]);

  const currentTimePosition = useMemo(() => {
    const totalWidth = duration * pixelsPerSecond * zoom;
    return (currentTime / duration) * totalWidth;
  }, [currentTime, duration, pixelsPerSecond, zoom]);

  // Get responsive height for time ruler
  const rulerHeight = useMemo(() => {
    return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.timeRulerHeight, screenSize);
  }, [screenSize]);

  // Get responsive font size
  const fontSize = useMemo(() => {
    return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.fontSize, screenSize);
  }, [screenSize]);

  return (
    <div
      className="time-ruler"
      role="slider"
      aria-label="Timeline scrubber"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      aria-valuetext={`Current time: ${formatTime(currentTime)} of ${formatTime(duration)}`}
      tabIndex={0}
      style={{
        position: 'relative',
        height: `${rulerHeight}px`,
        backgroundColor: theme.trackBackgroundColor,
        borderBottom: `1px solid ${theme.primaryColor}`,
        cursor: 'pointer',
        overflow: 'hidden',
        minWidth: `${duration * pixelsPerSecond * zoom}px`
      }}
      onClick={handleRulerClick}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1; // Larger steps with Shift
          const newTime = e.key === 'ArrowLeft' 
            ? Math.max(0, currentTime - step)
            : Math.min(duration, currentTime + step);
          onTimeClick?.(newTime);
        }
      }}
    >
      {/* Time markers */}
      {timeMarkers.map(({ time, position, label, isMajor }) => (
        <div
          key={time}
          className="time-marker"
          style={{
            position: 'absolute',
            left: `${position}px`,
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          {/* Tick mark */}
          <div
            style={{
              width: '1px',
              height: isMajor ? '15px' : '10px',
              backgroundColor: isMajor ? theme.primaryColor : '#666',
              marginTop: isMajor ? '0' : '5px'
            }}
          />
          
          {/* Time label for major ticks */}
          {isMajor && (
            <div
              style={{
                fontSize: fontSize,
                color: '#ccc',
                fontFamily: theme.fonts.monospace,
                marginTop: '2px',
                whiteSpace: 'nowrap'
              }}
            >
              {label}
            </div>
          )}
        </div>
      ))}
      
      {/* Current time indicator */}
      <div
        className="current-time-indicator"
        style={{
          position: 'absolute',
          left: `${currentTimePosition}px`,
          top: 0,
          width: '2px',
          height: '100%',
          backgroundColor: '#ff4444',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />
    </div>
  );
});

/**
 * ZoomControls component for timeline scaling
 */
interface ZoomControlsProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  currentTime?: number;
  onZoomChange: (zoom: number, centerTime?: number) => void;
}

const ZoomControls = memo(function ZoomControls({ zoom, minZoom, maxZoom, currentTime, onZoomChange }: ZoomControlsProps) {
  const theme = useTheme();
  const { screenSize } = useScreenSize();
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(maxZoom, zoom * 1.5);
    onZoomChange(newZoom, currentTime);
  }, [zoom, maxZoom, currentTime, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoom / 1.5);
    onZoomChange(newZoom, currentTime);
  }, [zoom, minZoom, currentTime, onZoomChange]);

  const handleZoomReset = useCallback(() => {
    onZoomChange(1, currentTime);
  }, [currentTime, onZoomChange]);

  const handleZoomToFit = useCallback(() => {
    // Zoom to fit content (this would need duration info, for now use a reasonable default)
    const fitZoom = Math.max(minZoom, Math.min(maxZoom, 0.5));
    onZoomChange(fitZoom, currentTime);
  }, [minZoom, maxZoom, currentTime, onZoomChange]);

  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  // Get responsive control size and font size
  const controlSize = useMemo(() => {
    return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.controlsSize, screenSize);
  }, [screenSize]);

  const fontSize = useMemo(() => {
    return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.fontSize, screenSize);
  }, [screenSize]);

  const buttonStyle = {
    padding: screenSize === 'mobile' ? '2px 6px' : '4px 8px',
    margin: '0 2px',
    backgroundColor: theme.trackBackgroundColor,
    color: 'white',
    border: `1px solid ${theme.primaryColor}`,
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: fontSize,
    fontFamily: theme.fonts.primary,
    minWidth: controlSize,
    height: controlSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed'
  };

  return (
    <div
      className="zoom-controls"
      role="group"
      aria-label="Zoom controls"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 8px'
      }}
    >
      <button
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        style={canZoomOut ? buttonStyle : disabledButtonStyle}
        title="Zoom Out (Ctrl + -)"
        aria-label={`Zoom out to ${Math.round((zoom / 1.5) * 100)}%`}
        aria-disabled={!canZoomOut}
      >
        −
      </button>
      
      <span
        role="status"
        aria-label={`Current zoom level: ${Math.round(zoom * 100)} percent`}
        style={{
          fontSize: fontSize,
          color: '#ccc',
          fontFamily: theme.fonts.monospace,
          minWidth: screenSize === 'mobile' ? '40px' : '50px',
          textAlign: 'center'
        }}
      >
        {Math.round(zoom * 100)}%
      </span>
      
      <button
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        style={canZoomIn ? buttonStyle : disabledButtonStyle}
        title="Zoom In (Ctrl + +)"
        aria-label={`Zoom in to ${Math.round((zoom * 1.5) * 100)}%`}
        aria-disabled={!canZoomIn}
      >
        +
      </button>
      
      <button
        onClick={handleZoomReset}
        style={buttonStyle}
        title="Reset Zoom (Ctrl + 0)"
        aria-label="Reset zoom to 100%"
      >
        1:1
      </button>
      
      <button
        onClick={handleZoomToFit}
        style={buttonStyle}
        title="Zoom to Fit"
        aria-label="Zoom to fit all content"
      >
        Fit
      </button>
    </div>
  );
});

/**
 * TimelineHeader component containing time ruler and zoom controls
 * Memoized to prevent unnecessary re-renders
 */
const TimelineHeaderComponent = memo(function TimelineHeader({
  currentTime,
  duration,
  zoom,
  minZoom = 0.1,
  maxZoom = 10,
  pixelsPerSecond,
  onZoomChange,
  onTimeChange
}: TimelineHeaderProps) {
  const eventBus = useEventBus();
  const theme = useTheme();
  const { screenSize } = useScreenSize();

  // Handle zoom changes with optional center time
  const handleZoomChange = useCallback((newZoom: number, centerTime?: number) => {
    const oldZoom = zoom;
    onZoomChange?.(newZoom);
    
    // Emit zoom event with center time for zoom-to-position functionality
    eventBus.emit('timeline:zoom', {
      oldScale: oldZoom,
      newScale: newZoom,
      centerTime: centerTime ?? currentTime
    });
  }, [zoom, currentTime, onZoomChange, eventBus]);

  // Handle time changes from ruler clicks
  const handleTimeChange = useCallback((newTime: number) => {
    onTimeChange?.(newTime);
    
    // Emit scroll event
    eventBus.emit('timeline:scroll', {
      currentTime: newTime,
      scrollLeft: (newTime / duration) * duration * pixelsPerSecond * zoom
    });
  }, [duration, pixelsPerSecond, zoom, onTimeChange, eventBus]);

  // Get responsive header height and font size
  const headerHeight = useMemo(() => {
    return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.headerHeight, screenSize);
  }, [screenSize]);

  const fontSize = useMemo(() => {
    return getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.fontSize, screenSize);
  }, [screenSize]);

  return (
    <div
      className="timeline-header"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.backgroundColor,
        borderBottom: `1px solid ${theme.primaryColor}`,
        minHeight: `${headerHeight}px`
      }}
    >
      {/* Top bar with controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: screenSize === 'mobile' ? '28px' : '32px',
          padding: screenSize === 'mobile' ? '0 8px' : '0 16px',
          backgroundColor: theme.trackBackgroundColor,
          borderBottom: `1px solid #444`,
          flexWrap: screenSize === 'mobile' ? 'wrap' : 'nowrap'
        }}
      >
        {/* Current time display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: screenSize === 'mobile' ? '4px' : '8px',
            color: '#ccc',
            fontSize: fontSize,
            fontFamily: theme.fonts.monospace,
            flexShrink: 0
          }}
        >
          <span>Time:</span>
          <span style={{ color: theme.primaryColor, fontWeight: 'bold' }}>
            {formatTime(currentTime)}
          </span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Zoom controls */}
        <ZoomControls
          zoom={zoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          currentTime={currentTime}
          onZoomChange={handleZoomChange}
        />
      </div>

      {/* Time ruler */}
      <div
        style={{
          overflow: 'auto',
          scrollbarWidth: 'thin'
        }}
      >
        <TimeRuler
          duration={duration}
          currentTime={currentTime}
          zoom={zoom}
          pixelsPerSecond={pixelsPerSecond}
          onTimeClick={handleTimeChange}
        />
      </div>
    </div>
  );
});

export const TimelineHeader = memo(TimelineHeaderComponent);
export default TimelineHeader;