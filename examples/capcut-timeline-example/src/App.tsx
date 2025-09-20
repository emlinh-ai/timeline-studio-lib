import React, { useState, useEffect, useCallback } from 'react';
import { 
  EventBusProvider, 
  useEventBus, 
  Timeline, 
  Track,
  Clip,
  TimelineEventPayloads
} from 'timeline-studio-lib';
import { generateMockTracks } from 'timeline-studio-lib';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Square,
  Volume2,
  VolumeX 
} from 'lucide-react';
import Playhead from './components/Playhead';

// Component con để sử dụng EventBus
const TimelineApp: React.FC = () => {
  const eventBus = useEventBus();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(30); // 30 giây
  const [isMuted, setIsMuted] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [eventLog, setEventLog] = useState<Array<{
    id: string;
    time: string;
    type: string;
    data: any;
  }>>([]);

  // Tạo dữ liệu mẫu cho timeline
  useEffect(() => {
    const mockTracks = generateMockTracks({
      trackCount: 4,
      clipsPerTrack: 5,
      clipDuration: 3,
      clipSpacing: 4,
      trackTypes: ['video', 'audio', 'text', 'overlay'],
      includeMetadata: true
    });
    setTracks(mockTracks);
  }, []);

  // Thêm event vào log
  const addEventToLog = useCallback((type: string, data: any) => {
    const newEvent = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      type,
      data: JSON.stringify(data, null, 2)
    };
    setEventLog(prev => [newEvent, ...prev.slice(0, 9)]); // Giữ 10 events gần nhất
  }, []);

  // Event listeners setup
  useEffect(() => {
    if (!eventBus) return;

    // Clip click event
    const handleClipClick = (payload: TimelineEventPayloads['timeline:clipClick']) => {
      addEventToLog('Clip Click', {
        clipId: payload.clipId,
        time: payload.time,
        event: 'click'
      });
      setCurrentTime(payload.time);
    };

    // Clip hover event
    const handleClipHover = (payload: TimelineEventPayloads['timeline:clipHover']) => {
      addEventToLog('Clip Hover', {
        clipId: payload.clipId,
        time: payload.time,
        event: 'hover'
      });
    };

    // Timeline scroll event
    const handleTimelineScroll = (payload: TimelineEventPayloads['timeline:scroll']) => {
      addEventToLog('Timeline Scroll', {
        currentTime: payload.currentTime,
        scrollLeft: payload.scrollLeft
      });
    };

    // Timeline zoom event
    const handleTimelineZoom = (payload: TimelineEventPayloads['timeline:zoom']) => {
      addEventToLog('Timeline Zoom', {
        oldScale: payload.oldScale,
        newScale: payload.newScale,
        centerTime: payload.centerTime
      });
    };

    // State change event
    const handleStateChange = (payload: TimelineEventPayloads['timeline:stateChange']) => {
      addEventToLog('State Change', {
        currentTime: payload.currentTime,
        isPlaying: payload.isPlaying,
        selectedClipId: payload.selectedClipId
      });
      setCurrentTime(payload.currentTime);
      setIsPlaying(payload.isPlaying);
    };

    // Subscribe to events
    eventBus.on('timeline:clipClick', handleClipClick);
    eventBus.on('timeline:clipHover', handleClipHover);
    eventBus.on('timeline:scroll', handleTimelineScroll);
    eventBus.on('timeline:zoom', handleTimelineZoom);
    eventBus.on('timeline:stateChange', handleStateChange);

    return () => {
      // Cleanup event listeners
      eventBus.off('timeline:clipClick', handleClipClick);
      eventBus.off('timeline:clipHover', handleClipHover);
      eventBus.off('timeline:scroll', handleTimelineScroll);
      eventBus.off('timeline:zoom', handleTimelineZoom);
      eventBus.off('timeline:stateChange', handleStateChange);
    };
  }, [eventBus, addEventToLog]);

  // Player controls handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    addEventToLog('Play Button', { action: 'play', time: currentTime });
    
    // Emit command để timeline biết trạng thái play
    eventBus.emit('timeline:stateChange', {
      tracks,
      currentTime,
      duration,
      zoom: 1,
      isPlaying: true
    });
  }, [eventBus, tracks, currentTime, duration]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    addEventToLog('Pause Button', { action: 'pause', time: currentTime });
    
    eventBus.emit('timeline:stateChange', {
      tracks,
      currentTime,
      duration,
      zoom: 1,
      isPlaying: false
    });
  }, [eventBus, tracks, currentTime, duration]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    addEventToLog('Stop Button', { action: 'stop' });
    
    eventBus.emit('timeline:scrollTo', { time: 0 });
  }, [eventBus]);

  const handleSeekBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 5);
    setCurrentTime(newTime);
    addEventToLog('Seek Backward', { from: currentTime, to: newTime });
    
    eventBus.emit('timeline:scrollTo', { time: newTime });
  }, [eventBus, currentTime]);

  const handleSeekForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 5);
    setCurrentTime(newTime);
    addEventToLog('Seek Forward', { from: currentTime, to: newTime });
    
    eventBus.emit('timeline:scrollTo', { time: newTime });
  }, [eventBus, currentTime, duration]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    addEventToLog('Mute Toggle', { muted: !isMuted });
  }, [isMuted]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Simulate playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return newTime;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration]);

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1>CapCut Timeline Example</h1>
        <div style={{ fontSize: '14px', color: '#888' }}>
          Timeline Studio Library Demo
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Preview Area */}
        <div className="preview-area">
          <div className="preview-placeholder">
            <div>
              <div>Video Preview Area</div>
              <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Container */}
        <div className="timeline-container">
          {/* Player Controls */}
          <div className="player-controls">
            <button className="control-button" onClick={handleSeekBackward}>
              <SkipBack size={16} />
              -5s
            </button>
            
            <button 
              className="control-button primary" 
              onClick={isPlaying ? handlePause : handlePlay}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button className="control-button" onClick={handleStop}>
              <Square size={16} />
              Stop
            </button>
            
            <button className="control-button" onClick={handleSeekForward}>
              <SkipForward size={16} />
              +5s
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <button className="control-button" onClick={handleMuteToggle}>
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>

          {/* Timeline */}
          <div className="timeline-wrapper" style={{ position: 'relative' }}>
            {/* Playhead overlay */}
            <Playhead
              currentTime={currentTime}
              duration={duration}
              pixelsPerSecond={50}
              zoom={1}
              isVisible={true}
            />
            
            <Timeline
              tracks={tracks}
              duration={duration}
              currentTime={currentTime}
              zoom={1}
              pixelsPerSecond={50}
              trackHeight={60}
              eventBusNamespace="capcut-example"
              enableVirtualization={true}
              onClipClick={(payload) => {
                console.log('Timeline clip clicked:', payload);
              }}
              onScroll={(payload) => {
                console.log('Timeline scrolled:', payload);
              }}
              onZoom={(payload) => {
                console.log('Timeline zoomed:', payload);
              }}
              onStateChange={(payload) => {
                console.log('Timeline state changed:', payload);
              }}
            />
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className="event-log">
        <h3>Event Log</h3>
        {eventLog.map((event) => (
          <div key={event.id} className="event-item">
            <div className="event-time">{event.time}</div>
            <div className="event-type">{event.type}</div>
            <div className="event-data">{event.data}</div>
          </div>
        ))}
        {eventLog.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Chưa có events nào...
          </div>
        )}
      </div>
    </div>
  );
};

// Component chính với EventBusProvider
const App: React.FC = () => {
  return (
    <EventBusProvider namespace="capcut-example" debugMode={true}>
      <TimelineApp />
    </EventBusProvider>
  );
};

export default App;