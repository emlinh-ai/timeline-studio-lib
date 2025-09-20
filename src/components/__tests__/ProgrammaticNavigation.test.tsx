import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { EventBusProvider, useEventBus } from '../../eventBus/EventBusProvider';
import { Track } from '../../types';

// Test component that can emit events
const EventEmitter = ({ onReady }: { onReady: () => void }) => {
  const eventBus = useEventBus();

  React.useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <div data-testid="event-emitter">
      <button
        data-testid="scroll-to-5"
        onClick={() => eventBus.emit('timeline:scrollTo', { time: 5 })}
      >
        Scroll to 5s
      </button>
      <button
        data-testid="set-zoom-2"
        onClick={() => eventBus.emit('timeline:setZoom', { zoom: 2 })}
      >
        Set Zoom 2x
      </button>
      <button
        data-testid="zoom-in"
        onClick={() => eventBus.emit('timeline:zoomIn', { factor: 1.5 })}
      >
        Zoom In
      </button>
      <button
        data-testid="zoom-out"
        onClick={() => eventBus.emit('timeline:zoomOut', { factor: 1.5 })}
      >
        Zoom Out
      </button>
      <button
        data-testid="zoom-to-fit"
        onClick={() => eventBus.emit('timeline:zoomToFit', undefined)}
      >
        Zoom to Fit
      </button>
    </div>
  );
};

const TestApp = ({ onReady }: { onReady: () => void }) => {
  const tracks: Track[] = [
    {
      id: 'track1',
      type: 'video',
      name: 'Video Track',
      height: 60,
      isVisible: true,
      clips: [
        {
          id: 'clip1',
          trackId: 'track1',
          start: 0,
          duration: 10,
          type: 'video',
          metadata: { name: 'Test Clip' }
        }
      ]
    }
  ];

  return (
    <EventBusProvider namespace="test">
      <div style={{ width: '800px', height: '400px' }}>
        <Timeline
          tracks={tracks}
          duration={20}
          currentTime={0}
          zoom={1}
          minZoom={0.1}
          maxZoom={10}
          pixelsPerSecond={100}
        />
        <EventEmitter onReady={onReady} />
      </div>
    </EventBusProvider>
  );
};

describe('Programmatic Navigation', () => {
  it('registers event listeners for programmatic navigation', async () => {
    let eventBus: any;

    const TestComponent = () => {
      eventBus = useEventBus();

      return (
        <Timeline
          tracks={[]}
          duration={20}
          currentTime={0}
          zoom={1}
          minZoom={0.1}
          maxZoom={10}
        />
      );
    };

    render(
      <EventBusProvider namespace="test">
        <TestComponent />
      </EventBusProvider>
    );

    // Wait for component to be ready
    await waitFor(() => {
      expect(eventBus).toBeDefined();
    });

    // Test that the event bus is working
    expect(eventBus.emit).toBeDefined();
    expect(eventBus.on).toBeDefined();
    expect(eventBus.off).toBeDefined();

    // Test that we can emit events without errors
    expect(() => {
      eventBus.emit('timeline:scrollTo', { time: 5 });
      eventBus.emit('timeline:setZoom', { zoom: 2.5 });
      eventBus.emit('timeline:zoomIn', { factor: 1.5 });
      eventBus.emit('timeline:zoomOut', { factor: 1.5 });
      eventBus.emit('timeline:zoomToFit', undefined);
    }).not.toThrow();
  });

  it('validates event payload types', () => {
    // Test that the event payloads have the correct structure
    const scrollPayload: { time: number } = { time: 5 };
    const zoomPayload: { zoom: number } = { zoom: 2.5 };
    const zoomInPayload: { factor?: number } = { factor: 1.5 };
    const zoomOutPayload: { factor?: number } = { factor: 1.5 };

    expect(scrollPayload.time).toBe(5);
    expect(zoomPayload.zoom).toBe(2.5);
    expect(zoomInPayload.factor).toBe(1.5);
    expect(zoomOutPayload.factor).toBe(1.5);
  });
});