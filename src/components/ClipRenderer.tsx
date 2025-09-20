import React, { memo, useCallback } from 'react';
import { ClipRendererProps, RenderError } from '../types';
import { Clip } from './Clip';

interface ClipRendererWrapperProps extends ClipRendererProps {
  customRenderer?: (props: ClipRendererProps) => React.ReactNode;
  pixelsPerSecond: number;
  zoom: number;
  trackHeight: number;
  onDoubleClick?: (clipId: string) => void;
}

/**
 * ClipRenderer component that handles custom clip rendering with fallback
 * Provides error boundary functionality for custom renderers
 */
const ClipRendererComponent = memo(function ClipRenderer({
  clip,
  isSelected,
  onSelect,
  onDrag,
  onResize,
  style,
  customRenderer,
  pixelsPerSecond,
  zoom,
  trackHeight,
  onDoubleClick
}: ClipRendererWrapperProps) {
  
  // Handle double click for editing
  const handleDoubleClick = useCallback((clipId: string) => {
    onDoubleClick?.(clipId);
  }, [onDoubleClick]);

  // If no custom renderer is provided, use default Clip component
  if (!customRenderer) {
    return (
      <Clip
        clip={clip}
        isSelected={isSelected}
        pixelsPerSecond={pixelsPerSecond}
        zoom={zoom}
        trackHeight={trackHeight}
        onSelect={onSelect}
        onDrag={onDrag}
        onResize={onResize}
        onDoubleClick={handleDoubleClick}
      />
    );
  }

  // Try to render with custom renderer, fallback to default on error
  try {
    const customElement = customRenderer({
      clip,
      isSelected,
      onSelect,
      onDrag,
      onResize,
      style
    });

    // Validate that custom renderer returned a valid React element
    if (!React.isValidElement(customElement) && customElement !== null) {
      console.warn('Custom clip renderer must return a valid React element or null. Falling back to default renderer.');
      throw new RenderError('Invalid React element returned from custom renderer', 'ClipRenderer');
    }

    return (
      <div key={clip.id} className="custom-clip-wrapper">
        {customElement}
      </div>
    );
  } catch (error) {
    // Log the error for debugging
    console.error('Custom clip renderer failed, falling back to default:', error);
    
    // Emit error event if it's a RenderError
    if (error instanceof RenderError) {
      // Could emit an event here for error tracking
      console.warn(`Render error in ${error.componentName}: ${error.message}`);
    }

    // Fallback to default Clip component
    return (
      <Clip
        clip={clip}
        isSelected={isSelected}
        pixelsPerSecond={pixelsPerSecond}
        zoom={zoom}
        trackHeight={trackHeight}
        onSelect={onSelect}
        onDrag={onDrag}
        onResize={onResize}
        onDoubleClick={handleDoubleClick}
      />
    );
  }
});

export const ClipRenderer = memo(ClipRendererComponent);
export default ClipRenderer;