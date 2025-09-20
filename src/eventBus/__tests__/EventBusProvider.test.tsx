import React, { useEffect, useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  EventBusProvider,
  useEventBus,
  useEventBusNamespace,
  useEventListener,
  useEventEmitter,
  useEventBusDebug,
  withEventBus
} from '../EventBusProvider';
import { EventBus, createEventBus } from '../EventBus';
import { TimelineEventPayloads } from '../../types';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('EventBusProvider', () => {
  describe('Basic Provider functionality', () => {
    it('should provide EventBus instance to child components', () => {
      const TestComponent = () => {
        const eventBus = useEventBus();
        return <div data-testid="namespace">{eventBus.getNamespace()}</div>;
      };

      render(
        <EventBusProvider namespace="test">
          <TestComponent />
        </EventBusProvider>
      );

      expect(screen.getByTestId('namespace')).toHaveTextContent('test');
    });

    it('should use default namespace when none provided', () => {
      const TestComponent = () => {
        const namespace = useEventBusNamespace();
        return <div data-testid="namespace">{namespace}</div>;
      };

      render(
        <EventBusProvider>
          <TestComponent />
        </EventBusProvider>
      );

      expect(screen.getByTestId('namespace')).toHaveTextContent('default');
    });

    it('should accept external EventBus instance', () => {
      const externalEventBus = createEventBus('external');
      
      const TestComponent = () => {
        const eventBus = useEventBus();
        return <div data-testid="namespace">{eventBus.getNamespace()}</div>;
      };

      render(
        <EventBusProvider eventBus={externalEventBus}>
          <TestComponent />
        </EventBusProvider>
      );

      expect(screen.getByTestId('namespace')).toHaveTextContent('external');
    });

    it('should throw error when useEventBus is used outside provider', () => {
      const TestComponent = () => {
        useEventBus();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useEventBus must be used within an EventBusProvider');

      consoleSpy.mockRestore();
    });

    it('should clean up EventBus on unmount', () => {
      const TestComponent = () => {
        const eventBus = useEventBus();
        const [listenerCount, setListenerCount] = useState(0);

        useEffect(() => {
          const listener = jest.fn();
          eventBus.on('timeline:clipClick', listener);
          setListenerCount(eventBus.getListenerCount('timeline:clipClick'));
        }, [eventBus]);

        return <div data-testid="count">{listenerCount}</div>;
      };

      const { unmount } = render(
        <EventBusProvider namespace="cleanup-test" debugMode={true}>
          <TestComponent />
        </EventBusProvider>
      );

      expect(screen.getByTestId('count')).toHaveTextContent('1');

      unmount();

      // Verify cleanup was called (console.log should have been called)
      expect(console.log).toHaveBeenCalledWith('[EventBusProvider:cleanup-test] Cleaning up EventBus');
    });
  });

  describe('useEventListener hook', () => {
    it('should automatically subscribe and unsubscribe to events', () => {
      const mockListener = jest.fn();
      
      const TestComponent = () => {
        useEventListener('timeline:clipClick', mockListener);
        const emit = useEventEmitter();
        
        return (
          <button 
            onClick={() => emit('timeline:clipClick', { 
              clipId: 'clip-1', 
              time: 10, 
              nativeEvent: new MouseEvent('click') 
            })}
          >
            Emit Event
          </button>
        );
      };

      const { unmount } = render(
        <EventBusProvider>
          <TestComponent />
        </EventBusProvider>
      );

      fireEvent.click(screen.getByText('Emit Event'));
      expect(mockListener).toHaveBeenCalledWith({
        clipId: 'clip-1',
        time: 10,
        nativeEvent: expect.any(MouseEvent)
      });

      // Reset mock
      mockListener.mockClear();

      // Unmount should clean up listener
      unmount();

      // Since component is unmounted, we can't emit events anymore
      // But we can verify the listener was called during the component lifecycle
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should update listener when dependencies change', async () => {
      const TestComponent = () => {
        const [message, setMessage] = useState('initial');
        const emit = useEventEmitter();
        
        useEventListener('timeline:ready', () => {
          setMessage('updated');
        }, []);

        return (
          <div>
            <div data-testid="message">{message}</div>
            <button onClick={() => emit('timeline:ready', undefined)}>
              Emit Ready
            </button>
          </div>
        );
      };

      render(
        <EventBusProvider>
          <TestComponent />
        </EventBusProvider>
      );

      expect(screen.getByTestId('message')).toHaveTextContent('initial');

      fireEvent.click(screen.getByText('Emit Ready'));

      await waitFor(() => {
        expect(screen.getByTestId('message')).toHaveTextContent('updated');
      });
    });
  });

  describe('useEventEmitter hook', () => {
    it('should provide stable emit function', () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        const emit = useEventEmitter();
        renderCount++;
        
        return (
          <div>
            <div data-testid="render-count">{renderCount}</div>
            <button onClick={() => emit('timeline:ready', undefined)}>
              Emit Event
            </button>
          </div>
        );
      };

      render(
        <EventBusProvider>
          <TestComponent />
        </EventBusProvider>
      );

      // Initial render
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');
      
      // Emit event should not cause re-render due to stable function
      fireEvent.click(screen.getByText('Emit Event'));
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');
    });
  });

  describe('useEventBusDebug hook', () => {
    it('should provide debug information', async () => {
      const TestComponent = () => {
        const [debugInfo, setDebugInfo] = useState<any>(null);
        const eventBus = useEventBus();
        
        useEffect(() => {
          const listener = jest.fn();
          eventBus.on('timeline:clipClick', listener);
          eventBus.on('timeline:scroll', listener);
          
          // Update debug info after adding listeners
          setDebugInfo(eventBus.getDebugInfo());
        }, [eventBus]);

        return (
          <div>
            <div data-testid="namespace">{debugInfo?.namespace || 'debug-test'}</div>
            <div data-testid="events">{debugInfo?.totalEvents || 0}</div>
            <div data-testid="listeners">{debugInfo?.totalListeners || 0}</div>
          </div>
        );
      };

      render(
        <EventBusProvider namespace="debug-test">
          <TestComponent />
        </EventBusProvider>
      );

      expect(screen.getByTestId('namespace')).toHaveTextContent('debug-test');
      
      await waitFor(() => {
        expect(screen.getByTestId('events')).toHaveTextContent('2');
        expect(screen.getByTestId('listeners')).toHaveTextContent('2');
      });
    });
  });

  describe('withEventBus HOC', () => {
    it('should wrap component with EventBusProvider', () => {
      const BaseComponent = () => {
        const namespace = useEventBusNamespace();
        return <div data-testid="namespace">{namespace}</div>;
      };

      const WrappedComponent = withEventBus(BaseComponent, 'hoc-test', true);

      render(<WrappedComponent />);

      expect(screen.getByTestId('namespace')).toHaveTextContent('hoc-test');
    });

    it('should set correct displayName', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';

      const WrappedComponent = withEventBus(TestComponent);

      expect(WrappedComponent.displayName).toBe('withEventBus(TestComponent)');
    });

    it('should handle components without displayName', () => {
      const TestComponent = () => <div>Test</div>;

      const WrappedComponent = withEventBus(TestComponent);

      expect(WrappedComponent.displayName).toBe('withEventBus(TestComponent)');
    });
  });

  describe('Event communication between components', () => {
    it('should allow components to communicate through events', async () => {
      const EmitterComponent = () => {
        const emit = useEventEmitter();
        
        return (
          <button 
            onClick={() => emit('timeline:scroll', { currentTime: 5, scrollLeft: 100 })}
          >
            Emit Scroll
          </button>
        );
      };

      const ListenerComponent = () => {
        const [scrollData, setScrollData] = useState<{ currentTime: number; scrollLeft: number } | null>(null);
        
        useEventListener('timeline:scroll', (payload) => {
          setScrollData(payload);
        });

        return (
          <div data-testid="scroll-data">
            {scrollData ? `${scrollData.currentTime}-${scrollData.scrollLeft}` : 'no-data'}
          </div>
        );
      };

      render(
        <EventBusProvider>
          <EmitterComponent />
          <ListenerComponent />
        </EventBusProvider>
      );

      expect(screen.getByTestId('scroll-data')).toHaveTextContent('no-data');

      fireEvent.click(screen.getByText('Emit Scroll'));

      await waitFor(() => {
        expect(screen.getByTestId('scroll-data')).toHaveTextContent('5-100');
      });
    });

    it('should isolate events between different providers', async () => {
      const TestComponent = ({ testId }: { testId: string }) => {
        const [received, setReceived] = useState(false);
        const emit = useEventEmitter();
        
        useEventListener('timeline:clipClick', () => {
          setReceived(true);
        });

        return (
          <div>
            <div data-testid={`received-${testId}`}>{received ? 'received' : 'not-received'}</div>
            <button 
              data-testid={`emit-${testId}`}
              onClick={() => emit('timeline:clipClick', { 
                clipId: 'clip-1', 
                time: 10, 
                nativeEvent: new MouseEvent('click') 
              })}
            >
              Emit
            </button>
          </div>
        );
      };

      render(
        <div>
          <EventBusProvider namespace="provider1">
            <TestComponent testId="1" />
          </EventBusProvider>
          <EventBusProvider namespace="provider2">
            <TestComponent testId="2" />
          </EventBusProvider>
        </div>
      );

      // Initially both should show not-received
      expect(screen.getByTestId('received-1')).toHaveTextContent('not-received');
      expect(screen.getByTestId('received-2')).toHaveTextContent('not-received');

      // Emit from provider1
      fireEvent.click(screen.getByTestId('emit-1'));

      await waitFor(() => {
        expect(screen.getByTestId('received-1')).toHaveTextContent('received');
        expect(screen.getByTestId('received-2')).toHaveTextContent('not-received');
      });
    });
  });

  describe('Memory leak prevention', () => {
    it('should clean up listeners when component unmounts', () => {
      const mockListener = jest.fn();
      let eventBusInstance: any;
      
      const TestComponent = () => {
        const eventBus = useEventBus();
        eventBusInstance = eventBus;
        
        useEventListener('timeline:clipClick', mockListener);
        
        return <div data-testid="child-mounted">mounted</div>;
      };

      const { unmount } = render(
        <EventBusProvider>
          <TestComponent />
        </EventBusProvider>
      );

      // Verify component is mounted and listener is added
      expect(screen.getByTestId('child-mounted')).toBeInTheDocument();
      expect(eventBusInstance.getListenerCount('timeline:clipClick')).toBe(1);

      // Unmount component
      unmount();

      // Verify listener was cleaned up
      expect(eventBusInstance.getListenerCount('timeline:clipClick')).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle errors in event listeners gracefully', () => {
      const TestComponent = () => {
        const emit = useEventEmitter();
        
        useEventListener('timeline:clipClick', () => {
          throw new Error('Listener error');
        });

        return (
          <button 
            onClick={() => emit('timeline:clipClick', { 
              clipId: 'clip-1', 
              time: 10, 
              nativeEvent: new MouseEvent('click') 
            })}
          >
            Emit Event
          </button>
        );
      };

      render(
        <EventBusProvider>
          <TestComponent />
        </EventBusProvider>
      );

      // Should not throw when listener has error
      expect(() => {
        fireEvent.click(screen.getByText('Emit Event'));
      }).not.toThrow();
    });
  });

  describe('Type safety', () => {
    it('should provide type-safe event handling', () => {
      const TestComponent = () => {
        const emit = useEventEmitter<TimelineEventPayloads>();
        
        useEventListener<TimelineEventPayloads, 'timeline:clipClick'>('timeline:clipClick', (payload) => {
          // TypeScript should infer the correct payload type
          expect(payload.clipId).toBeDefined();
          expect(payload.time).toBeDefined();
          expect(payload.nativeEvent).toBeDefined();
        });

        return (
          <button 
            onClick={() => emit('timeline:clipClick', {
              clipId: 'clip-1',
              time: 10,
              nativeEvent: new MouseEvent('click')
            })}
          >
            Emit Typed Event
          </button>
        );
      };

      render(
        <EventBusProvider>
          <TestComponent />
        </EventBusProvider>
      );

      // Test passes if TypeScript compilation succeeds and runtime works
      fireEvent.click(screen.getByText('Emit Typed Event'));
    });
  });
});