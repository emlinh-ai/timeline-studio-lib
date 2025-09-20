import React from 'react';

interface PlayheadProps {
  currentTime: number;
  duration: number;
  pixelsPerSecond: number;
  zoom: number;
  isVisible?: boolean;
}

const Playhead: React.FC<PlayheadProps> = ({
  currentTime,
  duration,
  pixelsPerSecond,
  zoom,
  isVisible = true
}) => {
  if (!isVisible || currentTime < 0 || currentTime > duration) {
    return null;
  }

  // Tính toán vị trí pixel của playhead
  const leftPosition = currentTime * pixelsPerSecond * zoom;

  return (
    <div
      className="playhead"
      style={{
        left: `${leftPosition}px`,
        transform: 'translateX(-1px)', // Center the line
      }}
    >
      {/* Playhead line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#ff4444',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
      
      {/* Playhead handle */}
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          left: '-6px',
          width: '14px',
          height: '14px',
          background: '#ff4444',
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 101,
        }}
      />
      
      {/* Time tooltip */}
      <div
        style={{
          position: 'absolute',
          top: '-35px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 102,
        }}
      >
        {formatTime(currentTime)}
      </div>
    </div>
  );
};

// Helper function để format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export default Playhead;