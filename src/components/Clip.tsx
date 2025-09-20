import React, { useCallback, useMemo, useRef, useState, memo } from 'react';
import { Clip as ClipType, TimelineTheme } from '../types';
import { useTheme } from '../theme';
import { useScreenSize, getResponsiveValue, DEFAULT_RESPONSIVE_CONFIG } from '../utils/responsive';
import { getClipAccessibleDescription, getFocusRingStyle, getTransitionStyle } from '../utils/accessibility';

export interface ClipProps {
  clip: ClipType;
  isSelected: boolean;
  pixelsPerSecond: number;
  zoom: number;
  trackHeight: number;
  onSelect: (clipId: string) => void;
  onDoubleClick?: (clipId: string) => void;
  onDrag?: (clipId: string, newStart: number) => void;
  onResize?: (clipId: string, newDuration: number) => void;
}

/**
 * Get clip type-specific default styling
 */
function getClipTypeStyles(type: ClipType['type'], theme: TimelineTheme) {
  const baseColor = theme.clipColors[type];
  
  const styles: React.CSSProperties = {
    backgroundColor: baseColor,
    borderColor: baseColor,
  };
  
  // Type-specific visual indicators
  if (type === 'audio') {
    styles.backgroundImage = 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)';
    styles.backgroundSize = '8px 8px';
  }
  
  return styles;
}

/**
 * Get clip type icon
 */
function getClipTypeIcon(type: ClipType['type']): string {
  switch (type) {
    case 'video': return '🎥';
    case 'audio': return '🎵';
    case 'text': return '📝';
    case 'overlay': return '🎨';
    default: return '📄';
  }
}

/**
 * Clip component that renders individual clips with positioning and styling
 * Memoized to prevent unnecessary re-renders when props haven't changed
 */
const ClipComponent = memo(function Clip({
  clip,
  isSelected,
  pixelsPerSecond,
  zoom,
  trackHeight,
  onSelect,
  onDoubleClick,
  onDrag,
  onResize
}: ClipProps) {
  // Get theme from context
  const theme = useTheme();
  const { screenSize } = useScreenSize();
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, clipStart: 0 });
  const clipRef = useRef<HTMLDivElement>(null);
  
  // Resize state
  const [isResizing, setIsResizing] = useState<'left' | 'right' | false>(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, clipStart: 0, clipDuration: 0 });
  
  // Minimum clip duration (in seconds)
  const MIN_CLIP_DURATION = 0.1;
  // Calculate clip position and dimensions based on start time and duration
  const clipStyle = useMemo(() => {
    const left = clip.start * pixelsPerSecond * zoom;
    const minWidth = getResponsiveValue(DEFAULT_RESPONSIVE_CONFIG.clipMinWidth, screenSize);
    const width = Math.max(clip.duration * pixelsPerSecond * zoom, minWidth); // Responsive minimum width
    const height = trackHeight - (screenSize === 'mobile' ? 4 : 8); // Less padding on mobile
    
    const typeStyles = getClipTypeStyles(clip.type, theme);
    
    const padding = screenSize === 'mobile' ? '2px 4px' : '4px 8px';
    const borderWidth = screenSize === 'mobile' ? '1px' : (isSelected ? '2px' : '1px');
    
    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: screenSize === 'mobile' ? '2px' : '4px',
      width: `${width}px`,
      height: `${height}px`,
      ...typeStyles,
      border: isSelected 
        ? `${borderWidth} solid ${theme.primaryColor}` 
        : `1px solid ${typeStyles.borderColor}`,
      borderRadius: theme.clipBorderRadius,
      cursor: isDragging ? 'grabbing' : (isResizing ? (isResizing === 'left' ? 'w-resize' : 'e-resize') : (onDrag ? 'grab' : 'pointer')),
      display: 'flex',
      alignItems: 'center',
      padding: padding,
      overflow: 'hidden',
      boxSizing: 'border-box' as const,
      // Visual feedback (selection, drag, and resize)
      opacity: (isDragging || isResizing) ? 0.8 : (isSelected ? 1 : 0.9),
      zIndex: (isDragging || isResizing) ? 100 : (isSelected ? 10 : 1),
      boxShadow: isSelected 
        ? `0 0 0 2px ${theme.primaryColor}, 0 2px 8px rgba(0,0,0,0.3)` 
        : '0 1px 3px rgba(0,0,0,0.2)',
      transform: isSelected ? 'translateY(-1px)' : 'none',
      // Enhanced focus indicator with accessibility support
      outline: 'none', // Remove default outline, we handle it with boxShadow
      // Respect user preferences for motion and contrast
      ...(isSelected ? getFocusRingStyle(theme.primaryColor) : {}),
      ...getTransitionStyle((isDragging || isResizing) ? 'none' : 'all 0.15s ease-in-out')
    };
  }, [clip.start, clip.duration, pixelsPerSecond, zoom, trackHeight, clip.type, theme, isSelected, screenSize]);

  // Handle clip selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(clip.id);
  }, [clip.id, onSelect]);

  // Handle double click for editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(clip.id);
  }, [clip.id, onDoubleClick]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onDrag) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      clipStart: clip.start
    });
    
    // Select the clip when starting to drag
    onSelect(clip.id);
  }, [clip.id, clip.start, onDrag, onSelect]);

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !onDrag) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaTime = deltaX / (pixelsPerSecond * zoom);
    const newStart = Math.max(0, dragStart.clipStart + deltaTime); // Prevent negative start times
    
    onDrag(clip.id, newStart);
  }, [isDragging, dragStart, pixelsPerSecond, zoom, onDrag, clip.id]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Handle resize start
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    if (!onResize) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(side);
    setResizeStart({
      x: e.clientX,
      clipStart: clip.start,
      clipDuration: clip.duration
    });
    
    // Select the clip when starting to resize
    onSelect(clip.id);
  }, [clip.id, clip.start, clip.duration, onResize, onSelect]);

  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !onResize) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaTime = deltaX / (pixelsPerSecond * zoom);
    
    if (isResizing === 'left') {
      // Resize from left edge (changes start time and duration)
      const newStart = Math.max(0, resizeStart.clipStart + deltaTime);
      const actualDeltaTime = newStart - resizeStart.clipStart;
      const newDuration = Math.max(MIN_CLIP_DURATION, resizeStart.clipDuration - actualDeltaTime);
      
      // Update both start and duration
      onDrag?.(clip.id, newStart);
      onResize(clip.id, newDuration);
    } else if (isResizing === 'right') {
      // Resize from right edge (changes duration only)
      const newDuration = Math.max(MIN_CLIP_DURATION, resizeStart.clipDuration + deltaTime);
      onResize(clip.id, newDuration);
    }
  }, [isResizing, resizeStart, pixelsPerSecond, zoom, onResize, onDrag, clip.id]);

  // Handle resize end
  const handleResizeUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
    }
  }, [isResizing]);

  // Add global mouse event listeners for dragging and resizing
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeUp);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeUp);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeUp]);

  // Get display name for the clip
  const displayName = useMemo(() => {
    if (clip.metadata?.name) {
      return clip.metadata.name;
    }
    
    // Generate default name based on type
    switch (clip.type) {
      case 'video': return 'Video Clip';
      case 'audio': return 'Audio Clip';
      case 'text': return clip.metadata?.text || 'Text Clip';
      case 'overlay': return 'Overlay';
      default: return 'Clip';
    }
  }, [clip.type, clip.metadata?.name, clip.metadata?.text]);

  // Show duration if clip is wide enough (responsive threshold)
  const durationThreshold = screenSize === 'mobile' ? 40 : screenSize === 'tablet' ? 50 : 60;
  const showDuration = clipStyle.width && parseInt(String(clipStyle.width)) > durationThreshold;
  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(clip.duration / 60);
    const seconds = Math.floor(clip.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [clip.duration]);

  return (
    <div
      ref={clipRef}
      className={`clip clip-${clip.type} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? `resizing-${isResizing}` : ''}`}
      style={clipStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      title={`${displayName} (${formattedDuration})`}
      role="button"
      tabIndex={isSelected ? 0 : -1}
      aria-label={getClipAccessibleDescription(clip, isSelected)}
      aria-selected={isSelected}
      aria-describedby={isSelected ? 'clip-instructions' : undefined}
      data-clip-id={clip.id}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(clip.id);
        }
        // Let all other keys bubble up to the timeline for handling
        // This includes Delete, Backspace, and arrow keys
      }}
      onFocus={() => {
        // Auto-select clip when focused via keyboard navigation
        if (!isSelected) {
          onSelect(clip.id);
        }
      }}
    >
      {/* Clip content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {/* Clip name */}
        <div
          style={{
            color: 'white',
            fontSize: screenSize === 'mobile' ? '9px' : '11px',
            fontWeight: '500',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {displayName}
        </div>
        
        {/* Duration (if space allows) */}
        {showDuration && (
          <div
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: screenSize === 'mobile' ? '7px' : '9px',
              marginTop: '1px',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {formattedDuration}
          </div>
        )}
      </div>

      {/* Clip type indicator */}
      <div
        style={{
          fontSize: screenSize === 'mobile' ? '10px' : '12px',
          opacity: 0.8,
          marginLeft: screenSize === 'mobile' ? '2px' : '4px',
          flexShrink: 0
        }}
      >
        {getClipTypeIcon(clip.type)}
      </div>

      {/* AI indicator (if applicable) - hide on mobile if space is limited */}
      {clip.metadata?.isAI && (screenSize !== 'mobile' || parseInt(String(clipStyle.width)) > 50) && (
        <div
          style={{
            fontSize: screenSize === 'mobile' ? '6px' : '8px',
            marginLeft: '2px',
            opacity: 0.9,
            flexShrink: 0
          }}
          title="AI Generated"
        >
          ✨
        </div>
      )}

      {/* Speed indicator (if not normal speed) - hide on mobile if space is limited */}
      {clip.metadata?.speed && clip.metadata.speed !== 1 && (screenSize !== 'mobile' || parseInt(String(clipStyle.width)) > 60) && (
        <div
          style={{
            fontSize: screenSize === 'mobile' ? '6px' : '8px',
            marginLeft: '2px',
            color: 'rgba(255,255,255,0.9)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: screenSize === 'mobile' ? '0px 2px' : '1px 3px',
            borderRadius: '2px',
            flexShrink: 0
          }}
          title={`Speed: ${clip.metadata.speed}x`}
        >
          {clip.metadata.speed}x
        </div>
      )}

      {/* Resize handles (only show when selected and resize is available) */}
      {isSelected && onResize && (
        <>
          {/* Left resize handle */}
          <div
            className="resize-handle resize-handle-left"
            style={{
              position: 'absolute',
              left: screenSize === 'mobile' ? '-1px' : '-2px',
              top: '0',
              width: screenSize === 'mobile' ? '3px' : '4px',
              height: '100%',
              cursor: 'w-resize',
              backgroundColor: theme.primaryColor,
              opacity: 0.8,
              zIndex: 101
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
            title="Resize clip start"
          />
          
          {/* Right resize handle */}
          <div
            className="resize-handle resize-handle-right"
            style={{
              position: 'absolute',
              right: screenSize === 'mobile' ? '-1px' : '-2px',
              top: '0',
              width: screenSize === 'mobile' ? '3px' : '4px',
              height: '100%',
              cursor: 'e-resize',
              backgroundColor: theme.primaryColor,
              opacity: 0.8,
              zIndex: 101
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
            title="Resize clip end"
          />
        </>
      )}
    </div>
  );
});

// Custom comparison function for better memoization
const areClipPropsEqual = (prevProps: ClipProps, nextProps: ClipProps) => {
  // Check if clip data changed
  if (prevProps.clip.id !== nextProps.clip.id ||
      prevProps.clip.start !== nextProps.clip.start ||
      prevProps.clip.duration !== nextProps.clip.duration ||
      prevProps.clip.type !== nextProps.clip.type) {
    return false;
  }

  // Check metadata changes
  const prevMetadata = prevProps.clip.metadata;
  const nextMetadata = nextProps.clip.metadata;
  if (prevMetadata?.name !== nextMetadata?.name ||
      prevMetadata?.speed !== nextMetadata?.speed ||
      prevMetadata?.isAI !== nextMetadata?.isAI ||
      prevMetadata?.text !== nextMetadata?.text) {
    return false;
  }

  // Check other props
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.pixelsPerSecond === nextProps.pixelsPerSecond &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.trackHeight === nextProps.trackHeight
  );
};

export const Clip = memo(ClipComponent, areClipPropsEqual);
export default Clip;