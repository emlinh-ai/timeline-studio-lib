# Custom Clip Renderer

The React Timeline Library supports custom clip renderers, allowing you to completely customize how clips are displayed in the timeline while maintaining all the built-in functionality like drag, resize, and selection.

## Basic Usage

To use a custom clip renderer, pass a function to the `renderClip` prop of the Timeline component:

```tsx
import { Timeline, ClipRendererProps } from 'react-timeline-library';

const CustomClipRenderer = ({ clip, isSelected, onSelect, onDrag, onResize, style }: ClipRendererProps) => {
  return (
    <div
      onClick={() => onSelect(clip.id)}
      style={{
        position: 'absolute',
        left: `${clip.start * 100}px`, // Position based on start time
        width: `${clip.duration * 100}px`, // Width based on duration
        height: '56px',
        backgroundColor: isSelected ? '#4CAF50' : '#2196F3',
        border: isSelected ? '2px solid #FFF' : '1px solid #1976D2',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
    >
      {clip.metadata?.name || clip.id}
    </div>
  );
};

// Use in Timeline
<Timeline
  tracks={tracks}
  renderClip={CustomClipRenderer}
  // ... other props
/>
```

## ClipRendererProps Interface

Your custom renderer function receives the following props:

```tsx
interface ClipRendererProps {
  clip: Clip;                                    // The clip data
  isSelected: boolean;                           // Whether the clip is currently selected
  onSelect: (clipId: string) => void;           // Function to select the clip
  onDrag: (clipId: string, newStart: number) => void;    // Function to handle drag operations
  onResize: (clipId: string, newDuration: number) => void; // Function to handle resize operations
  style: CSSProperties;                          // Additional styles (usually empty)
}
```

## Key Requirements

### 1. Positioning
Your custom renderer must handle positioning itself. The library provides the clip's `start` time and `duration`, which you should use to calculate the position and width:

```tsx
style={{
  position: 'absolute',
  left: `${clip.start * pixelsPerSecond * zoom}px`,
  width: `${clip.duration * pixelsPerSecond * zoom}px`,
  // ... other styles
}}
```

### 2. Event Handling
To maintain timeline functionality, your renderer should call the provided event handlers:

```tsx
// For selection
onClick={() => onSelect(clip.id)}

// For dragging (basic example)
onMouseDown={(e) => {
  const startX = e.clientX;
  const startTime = clip.start;
  
  const handleMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaTime = deltaX / (pixelsPerSecond * zoom);
    onDrag(clip.id, Math.max(0, startTime + deltaTime));
  };
  
  // Add event listeners...
}}

// For resizing
onDoubleClick={() => {
  const newDuration = clip.duration + 1;
  onResize(clip.id, newDuration);
}}
```

## Advanced Examples

### Conditional Rendering by Clip Type

```tsx
const ConditionalRenderer = (props: ClipRendererProps) => {
  switch (props.clip.type) {
    case 'video':
      return <VideoClipRenderer {...props} />;
    case 'audio':
      return <AudioClipRenderer {...props} />;
    case 'text':
      return <TextClipRenderer {...props} />;
    case 'overlay':
      return <OverlayClipRenderer {...props} />;
    default:
      return null; // Fallback to default renderer
  }
};
```

### Video Clip with Thumbnail

```tsx
const VideoClipRenderer = ({ clip, isSelected, onSelect }: ClipRendererProps) => {
  return (
    <div
      onClick={() => onSelect(clip.id)}
      style={{
        position: 'absolute',
        left: `${clip.start * 100}px`,
        width: `${clip.duration * 100}px`,
        height: '56px',
        backgroundColor: isSelected ? '#4CAF50' : '#2196F3',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: '32px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
        {clip.metadata?.thumbnailUrl ? (
          <img 
            src={clip.metadata.thumbnailUrl} 
            alt="Thumbnail"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            🎥
          </div>
        )}
      </div>
      
      {/* Info */}
      <div style={{ flex: 1, padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
        <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>
          {clip.metadata?.name || `Video ${clip.id}`}
        </span>
      </div>
    </div>
  );
};
```

### Audio Clip with Waveform

```tsx
const AudioClipRenderer = ({ clip, isSelected, onSelect }: ClipRendererProps) => {
  const waveformData = clip.metadata?.waveform || Array.from({ length: 50 }, () => Math.random());
  
  return (
    <div
      onClick={() => onSelect(clip.id)}
      style={{
        position: 'absolute',
        left: `${clip.start * 100}px`,
        width: `${clip.duration * 100}px`,
        height: '56px',
        backgroundColor: isSelected ? '#FF9800' : '#FF5722',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px'
      }}
    >
      {/* Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', flex: 1, gap: '1px' }}>
        {waveformData.slice(0, Math.floor(clip.duration * 10)).map((amplitude, index) => (
          <div
            key={index}
            style={{
              width: '2px',
              height: `${amplitude * 40 + 8}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '1px'
            }}
          />
        ))}
      </div>
      
      <div style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.8 }}>🎵</div>
    </div>
  );
};
```

## Error Handling and Fallback

The library automatically handles errors in custom renderers:

1. **Error Boundary**: Custom renderers are wrapped in error boundaries
2. **Automatic Fallback**: If a custom renderer throws an error or returns invalid content, the default renderer is used
3. **Error Logging**: Errors are logged to the console for debugging
4. **Graceful Degradation**: The timeline continues to function normally even if some custom renderers fail

```tsx
// This renderer will fallback to default if it fails
const ErrorProneRenderer = ({ clip }: ClipRendererProps) => {
  if (someCondition) {
    throw new Error('Something went wrong');
  }
  
  return <div>Custom content</div>;
};
```

## Best Practices

### 1. Performance
- Use `React.memo` for complex custom renderers
- Avoid expensive calculations in render functions
- Use `useMemo` and `useCallback` for derived values and event handlers

### 2. Accessibility
- Include proper ARIA labels and roles
- Ensure keyboard navigation works
- Provide meaningful alt text for images

### 3. Responsive Design
- Consider different screen sizes
- Use relative units where appropriate
- Test on mobile devices

### 4. Consistency
- Maintain visual consistency with the timeline theme
- Follow the same interaction patterns as default clips
- Use the provided `isSelected` state for visual feedback

## Integration with Timeline Features

Custom renderers work seamlessly with all timeline features:

- **Selection**: Use the `isSelected` prop and `onSelect` callback
- **Drag & Drop**: Implement drag handling with `onDrag` callback
- **Resizing**: Handle resize operations with `onResize` callback
- **Zoom**: Position and size calculations should account for zoom level
- **Virtualization**: Custom renderers work with virtualized rendering
- **Themes**: Access theme colors through the theme context
- **Event Bus**: Timeline events are still emitted for custom-rendered clips

## Troubleshooting

### Common Issues

1. **Clips not positioned correctly**: Ensure you're using absolute positioning and calculating left/width based on start/duration
2. **Events not working**: Make sure you're calling the provided event handlers (`onSelect`, `onDrag`, `onResize`)
3. **Performance issues**: Use memoization and avoid complex calculations in render functions
4. **Fallback not working**: Check console for error messages; ensure your renderer returns valid React elements

### Debugging

Enable debug mode to see detailed information about custom renderer behavior:

```tsx
<Timeline
  // ... other props
  eventBusNamespace="debug-timeline"
/>
```

Check the browser console for error messages and warnings related to custom renderers.