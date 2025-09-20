import React, { useState, useCallback } from 'react';
import { 
  Timeline, 
  ClipRendererProps, 
  Clip, 
  Track, 
  TimelineTheme 
} from '../src';

/**
 * Example: Custom Video Clip Renderer
 * Shows thumbnail, progress bar, and custom styling
 */
const CustomVideoClipRenderer = ({ clip, isSelected, onSelect, onDrag, onResize, style }: ClipRendererProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const startX = e.clientX;
    const startTime = clip.start;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / 100; // Assuming 100 pixels per second
      const newStart = Math.max(0, startTime + deltaTime);
      onDrag(clip.id, newStart);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [clip.id, clip.start, onDrag]);

  return (
    <div
      onClick={() => onSelect(clip.id)}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${clip.start * 100}px`, // 100 pixels per second
        width: `${clip.duration * 100}px`,
        height: '56px',
        backgroundColor: isSelected ? '#4CAF50' : '#2196F3',
        border: isSelected ? '2px solid #FFF' : '1px solid #1976D2',
        borderRadius: '8px',
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isSelected 
          ? '0 4px 12px rgba(76, 175, 80, 0.4)' 
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transform: isSelected ? 'translateY(-2px)' : 'none',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        ...style
      }}
    >
      {/* Thumbnail area */}
      <div
        style={{
          height: '32px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}
      >
        {clip.metadata?.thumbnailUrl ? (
          <img 
            src={clip.metadata.thumbnailUrl} 
            alt="Thumbnail"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          '🎥'
        )}
      </div>

      {/* Info area */}
      <div
        style={{
          flex: 1,
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}
        >
          {clip.metadata?.name || `Video ${clip.id}`}
        </div>
        
        {/* Duration */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '8px',
            marginLeft: '4px'
          }}
        >
          {Math.floor(clip.duration)}s
        </div>
      </div>

      {/* Speed indicator */}
      {clip.metadata?.speed && clip.metadata.speed !== 1 && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#333',
            fontSize: '8px',
            padding: '1px 4px',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          {clip.metadata.speed}x
        </div>
      )}

      {/* AI indicator */}
      {clip.metadata?.isAI && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            fontSize: '10px'
          }}
        >
          ✨
        </div>
      )}
    </div>
  );
};

/**
 * Example: Custom Audio Clip Renderer
 * Shows waveform visualization
 */
const CustomAudioClipRenderer = ({ clip, isSelected, onSelect, onDrag, onResize }: ClipRendererProps) => {
  // Generate mock waveform data if not provided
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
        border: isSelected ? '2px solid #FFF' : '1px solid #D84315',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        overflow: 'hidden'
      }}
    >
      {/* Waveform visualization */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          flex: 1,
          gap: '1px'
        }}
      >
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

      {/* Audio icon */}
      <div
        style={{
          fontSize: '12px',
          marginLeft: '8px',
          opacity: 0.8
        }}
      >
        🎵
      </div>
    </div>
  );
};

/**
 * Example: Custom Text Clip Renderer
 * Shows text content with typography styling
 */
const CustomTextClipRenderer = ({ clip, isSelected, onSelect }: ClipRendererProps) => {
  return (
    <div
      onClick={() => onSelect(clip.id)}
      style={{
        position: 'absolute',
        left: `${clip.start * 100}px`,
        width: `${clip.duration * 100}px`,
        height: '56px',
        backgroundColor: isSelected ? '#9C27B0' : '#673AB7',
        border: isSelected ? '2px solid #FFF' : '1px solid #512DA8',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%'
        }}
      >
        {clip.metadata?.text || clip.metadata?.name || 'Text'}
      </div>
    </div>
  );
};

/**
 * Example: Conditional Custom Renderer
 * Uses different renderers based on clip type
 */
const ConditionalCustomRenderer = (props: ClipRendererProps) => {
  switch (props.clip.type) {
    case 'video':
      return <CustomVideoClipRenderer {...props} />;
    case 'audio':
      return <CustomAudioClipRenderer {...props} />;
    case 'text':
      return <CustomTextClipRenderer {...props} />;
    case 'overlay':
      // Fallback to default renderer for overlay clips
      return null;
    default:
      return null;
  }
};

/**
 * Example: Error-prone Custom Renderer
 * Demonstrates fallback behavior when renderer fails
 */
const ErrorProneCustomRenderer = ({ clip }: ClipRendererProps) => {
  // Simulate random errors
  if (Math.random() < 0.3) {
    throw new Error(`Simulated error for clip ${clip.id}`);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${clip.start * 100}px`,
        width: `${clip.duration * 100}px`,
        height: '56px',
        backgroundColor: '#4CAF50',
        border: '1px solid #388E3C',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '10px'
      }}
    >
      Success: {clip.metadata?.name}
    </div>
  );
};

/**
 * Main Example Component
 */
export const CustomClipRendererExample: React.FC = () => {
  const [selectedRenderer, setSelectedRenderer] = useState<string>('conditional');

  // Sample data
  const tracks: Track[] = [
    {
      id: 'video-track',
      type: 'video',
      name: 'Video Track',
      height: 60,
      isVisible: true,
      clips: [
        {
          id: 'video-1',
          trackId: 'video-track',
          start: 0,
          duration: 5,
          type: 'video',
          metadata: {
            name: 'Intro Video',
            thumbnailUrl: 'https://via.placeholder.com/100x60',
            speed: 1.5,
            isAI: true
          }
        },
        {
          id: 'video-2',
          trackId: 'video-track',
          start: 8,
          duration: 3,
          type: 'video',
          metadata: {
            name: 'Main Content'
          }
        }
      ]
    },
    {
      id: 'audio-track',
      type: 'audio',
      name: 'Audio Track',
      height: 60,
      isVisible: true,
      clips: [
        {
          id: 'audio-1',
          trackId: 'audio-track',
          start: 2,
          duration: 8,
          type: 'audio',
          metadata: {
            name: 'Background Music',
            waveform: Array.from({ length: 80 }, () => Math.random())
          }
        }
      ]
    },
    {
      id: 'text-track',
      type: 'text',
      name: 'Text Track',
      height: 60,
      isVisible: true,
      clips: [
        {
          id: 'text-1',
          trackId: 'text-track',
          start: 1,
          duration: 2,
          type: 'text',
          metadata: {
            name: 'Title',
            text: 'Welcome to our video!'
          }
        },
        {
          id: 'text-2',
          trackId: 'text-track',
          start: 6,
          duration: 3,
          type: 'text',
          metadata: {
            name: 'Subtitle',
            text: 'This is the main content section'
          }
        }
      ]
    }
  ];

  const getCustomRenderer = () => {
    switch (selectedRenderer) {
      case 'conditional':
        return ConditionalCustomRenderer;
      case 'video-only':
        return CustomVideoClipRenderer;
      case 'error-prone':
        return ErrorProneCustomRenderer;
      case 'none':
      default:
        return undefined;
    }
  };

  const customTheme: Partial<TimelineTheme> = {
    backgroundColor: '#1a1a1a',
    trackBackgroundColor: '#2a2a2a',
    primaryColor: '#4CAF50'
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1>Custom Clip Renderer Examples</h1>
      
      {/* Renderer Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Choose Renderer:</label>
        <select 
          value={selectedRenderer} 
          onChange={(e) => setSelectedRenderer(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="none">Default Renderer</option>
          <option value="conditional">Conditional Custom Renderer</option>
          <option value="video-only">Video Renderer Only</option>
          <option value="error-prone">Error-Prone Renderer (Demo Fallback)</option>
        </select>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h3>Current Renderer: {selectedRenderer}</h3>
        <p>
          {selectedRenderer === 'none' && 'Using the default clip renderer provided by the library.'}
          {selectedRenderer === 'conditional' && 'Using different custom renderers based on clip type (video, audio, text).'}
          {selectedRenderer === 'video-only' && 'Using custom video renderer for all clips (may not look right for non-video clips).'}
          {selectedRenderer === 'error-prone' && 'Using a renderer that randomly fails to demonstrate fallback behavior.'}
        </p>
      </div>

      {/* Timeline */}
      <div style={{ height: '400px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <Timeline
          tracks={tracks}
          duration={15}
          currentTime={0}
          zoom={1}
          pixelsPerSecond={100}
          theme={customTheme}
          renderClip={getCustomRenderer()}
          onClipClick={(payload) => {
            console.log('Clip clicked:', payload);
          }}
          onStateChange={(state) => {
            console.log('Timeline state changed:', state);
          }}
        />
      </div>

      {/* Code Examples */}
      <div style={{ marginTop: '30px' }}>
        <h2>Implementation Examples</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>Basic Custom Renderer</h3>
          <pre style={{ backgroundColor: '#f8f8f8', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`const CustomClipRenderer = ({ clip, isSelected, onSelect }: ClipRendererProps) => {
  return (
    <div
      onClick={() => onSelect(clip.id)}
      style={{
        position: 'absolute',
        left: \`\${clip.start * 100}px\`,
        width: \`\${clip.duration * 100}px\`,
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

// Usage
<Timeline
  tracks={tracks}
  renderClip={CustomClipRenderer}
  // ... other props
/>`}
          </pre>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Conditional Renderer</h3>
          <pre style={{ backgroundColor: '#f8f8f8', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`const ConditionalRenderer = (props: ClipRendererProps) => {
  switch (props.clip.type) {
    case 'video':
      return <VideoClipRenderer {...props} />;
    case 'audio':
      return <AudioClipRenderer {...props} />;
    case 'text':
      return <TextClipRenderer {...props} />;
    default:
      return null; // Fallback to default renderer
  }
};`}
          </pre>
        </div>

        <div>
          <h3>Error Handling</h3>
          <p>
            Custom renderers are automatically wrapped with error boundaries. If a custom renderer throws an error 
            or returns an invalid React element, the timeline will automatically fallback to the default renderer 
            and log the error to the console.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomClipRendererExample;