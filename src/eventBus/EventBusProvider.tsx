import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { EventBus, createEventBus } from './EventBus';
import { TimelineEventPayloads, EventListener } from '../types';

// Context type
interface EventBusContextType<T = TimelineEventPayloads> {
  eventBus: EventBus<T>;
  namespace: string;
}

// Create the context
const EventBusContext = createContext<EventBusContextType | null>(null);

// Provider props
interface EventBusProviderProps {
  children: ReactNode;
  namespace?: string;
  debugMode?: boolean;
  eventBus?: EventBus<TimelineEventPayloads>;
}

/**
 * EventBusProvider component that provides EventBus instance to child components
 * Supports custom namespace for multiple timeline instances
 */
export function EventBusProvider({
  children,
  namespace = 'default',
  debugMode = false,
  eventBus: externalEventBus
}: EventBusProviderProps) {
  // Use external eventBus if provided, otherwise create a new one
  const eventBusRef = useRef<EventBus<TimelineEventPayloads>>(
    externalEventBus || createEventBus<TimelineEventPayloads>(namespace, debugMode)
  );

  // Update debug mode if it changes
  useEffect(() => {
    eventBusRef.current.setDebugMode(debugMode);
  }, [debugMode]);

  // Cleanup on unmount
  useEffect(() => {
    const eventBus = eventBusRef.current;
    
    return () => {
      if (debugMode) {
        console.log(`[EventBusProvider:${namespace}] Cleaning up EventBus`);
      }
      eventBus.clear();
    };
  }, [namespace, debugMode]);

  const contextValue: EventBusContextType = {
    eventBus: eventBusRef.current,
    namespace
  };

  return (
    <EventBusContext.Provider value={contextValue}>
      {children}
    </EventBusContext.Provider>
  );
}

/**
 * Hook to access the EventBus from context
 * Provides type-safe access to event bus methods
 */
export function useEventBus<T = TimelineEventPayloads>(): EventBus<T> {
  const context = useContext(EventBusContext);
  
  if (!context) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  
  return context.eventBus as EventBus<T>;
}

/**
 * Hook to get the current namespace
 */
export function useEventBusNamespace(): string {
  const context = useContext(EventBusContext);
  
  if (!context) {
    throw new Error('useEventBusNamespace must be used within an EventBusProvider');
  }
  
  return context.namespace;
}

/**
 * Hook that automatically subscribes to an event and cleans up on unmount
 * Provides automatic cleanup to prevent memory leaks
 */
export function useEventListener<T = TimelineEventPayloads, K extends keyof T = keyof T>(
  event: K,
  listener: EventListener<T[K]>,
  deps: React.DependencyList = []
): void {
  const eventBus = useEventBus<T>();
  const listenerRef = useRef(listener);

  // Update listener ref when dependencies change
  useEffect(() => {
    listenerRef.current = listener;
  }, [listener, ...deps]);

  useEffect(() => {
    // Create a stable listener that calls the current listener
    const stableListener: EventListener<T[K]> = (payload) => {
      listenerRef.current(payload);
    };

    eventBus.on(event, stableListener);

    return () => {
      eventBus.off(event, stableListener);
    };
  }, [eventBus, event]);
}

/**
 * Hook that provides a stable emit function
 * Useful for passing to child components without causing re-renders
 */
export function useEventEmitter<T = TimelineEventPayloads>(): EventBus<T>['emit'] {
  const eventBus = useEventBus<T>();
  
  // Return the bound emit method to maintain stability
  return eventBus.emit.bind(eventBus);
}

/**
 * Hook that provides debug information about the EventBus
 * Useful for development and debugging
 */
export function useEventBusDebug(): {
  namespace: string;
  totalEvents: number;
  totalListeners: number;
  events: Array<{ event: string; listenerCount: number }>;
} {
  const eventBus = useEventBus();
  const contextNamespace = useEventBusNamespace();
  const debugInfo = eventBus.getDebugInfo();
  
  return {
    namespace: contextNamespace,
    totalEvents: debugInfo.totalEvents,
    totalListeners: debugInfo.totalListeners,
    events: debugInfo.events
  };
}

/**
 * Higher-order component that provides EventBus context
 * Alternative to using EventBusProvider directly
 */
export function withEventBus<P extends object>(
  Component: React.ComponentType<P>,
  namespace?: string,
  debugMode?: boolean
) {
  const WrappedComponent = (props: P) => (
    <EventBusProvider namespace={namespace} debugMode={debugMode}>
      <Component {...props} />
    </EventBusProvider>
  );

  WrappedComponent.displayName = `withEventBus(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}