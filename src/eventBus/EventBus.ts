import { TimelineEventPayloads, EventListener, EventBusInterface, EventBusError } from '../types';

/**
 * Generic EventBus class with TypeScript support and namespace functionality
 * Supports multiple timeline instances through namespace isolation
 */
export class EventBus<T = TimelineEventPayloads> implements EventBusInterface<T> {
  private listeners: Map<string, Set<EventListener<any>>> = new Map();
  private namespace: string;
  private debugMode: boolean;

  constructor(namespace: string = 'default', debugMode: boolean = false) {
    this.namespace = namespace;
    this.debugMode = debugMode;
    
    if (this.debugMode) {
      console.log(`[EventBus:${this.namespace}] Initialized`);
    }
  }

  /**
   * Emit an event with payload to all registered listeners
   */
  emit<K extends keyof T>(event: K, payload: T[K]): void {
    try {
      const namespacedEvent = this.getNamespacedEvent(event);
      const eventListeners = this.listeners.get(String(namespacedEvent));
      
      if (this.debugMode) {
        console.log(`[EventBus:${this.namespace}] Emitting event:`, namespacedEvent, payload);
      }
      
      if (eventListeners && eventListeners.size > 0) {
        // Create a copy of listeners to avoid issues if listeners are modified during emission
        const listenersArray = Array.from(eventListeners);
        
        listenersArray.forEach(listener => {
          try {
            listener(payload);
          } catch (error) {
            console.error(`[EventBus:${this.namespace}] Error in listener for event ${String(namespacedEvent)}:`, error);
            // Don't throw here to prevent one bad listener from breaking others
          }
        });
      } else if (this.debugMode) {
        console.warn(`[EventBus:${this.namespace}] No listeners for event:`, namespacedEvent);
      }
    } catch (error) {
      const errorMessage = `Failed to emit event ${String(event)}`;
      console.error(`[EventBus:${this.namespace}] ${errorMessage}:`, error);
      throw new EventBusError(errorMessage, String(event));
    }
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof T>(event: K, listener: EventListener<T[K]>): void {
    try {
      if (typeof listener !== 'function') {
        throw new EventBusError('Listener must be a function', String(event));
      }

      const namespacedEvent = this.getNamespacedEvent(event);
      const eventKey = String(namespacedEvent);
      
      if (!this.listeners.has(eventKey)) {
        this.listeners.set(eventKey, new Set());
      }
      
      const eventListeners = this.listeners.get(eventKey)!;
      eventListeners.add(listener);
      
      if (this.debugMode) {
        console.log(`[EventBus:${this.namespace}] Added listener for event:`, namespacedEvent, `(${eventListeners.size} total)`);
      }
    } catch (error) {
      const errorMessage = `Failed to subscribe to event ${String(event)}`;
      console.error(`[EventBus:${this.namespace}] ${errorMessage}:`, error);
      throw new EventBusError(errorMessage, String(event));
    }
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof T>(event: K, listener: EventListener<T[K]>): void {
    try {
      const namespacedEvent = this.getNamespacedEvent(event);
      const eventKey = String(namespacedEvent);
      const eventListeners = this.listeners.get(eventKey);
      
      if (eventListeners) {
        const removed = eventListeners.delete(listener);
        
        if (this.debugMode) {
          console.log(`[EventBus:${this.namespace}] ${removed ? 'Removed' : 'Failed to remove'} listener for event:`, namespacedEvent, `(${eventListeners.size} remaining)`);
        }
        
        // Clean up empty listener sets
        if (eventListeners.size === 0) {
          this.listeners.delete(eventKey);
        }
      } else if (this.debugMode) {
        console.warn(`[EventBus:${this.namespace}] No listeners found for event:`, namespacedEvent);
      }
    } catch (error) {
      const errorMessage = `Failed to unsubscribe from event ${String(event)}`;
      console.error(`[EventBus:${this.namespace}] ${errorMessage}:`, error);
      throw new EventBusError(errorMessage, String(event));
    }
  }

  /**
   * Clear all listeners for all events
   */
  clear(): void {
    try {
      const eventCount = this.listeners.size;
      this.listeners.clear();
      
      if (this.debugMode) {
        console.log(`[EventBus:${this.namespace}] Cleared all listeners (${eventCount} events)`);
      }
    } catch (error) {
      console.error(`[EventBus:${this.namespace}] Failed to clear listeners:`, error);
      throw new EventBusError('Failed to clear listeners', 'clear');
    }
  }

  /**
   * Clear listeners for a specific event
   */
  clearEvent<K extends keyof T>(event: K): void {
    try {
      const namespacedEvent = this.getNamespacedEvent(event);
      const eventKey = String(namespacedEvent);
      const eventListeners = this.listeners.get(eventKey);
      
      if (eventListeners) {
        const listenerCount = eventListeners.size;
        this.listeners.delete(eventKey);
        
        if (this.debugMode) {
          console.log(`[EventBus:${this.namespace}] Cleared ${listenerCount} listeners for event:`, namespacedEvent);
        }
      }
    } catch (error) {
      const errorMessage = `Failed to clear listeners for event ${String(event)}`;
      console.error(`[EventBus:${this.namespace}] ${errorMessage}:`, error);
      throw new EventBusError(errorMessage, String(event));
    }
  }

  /**
   * Get the number of listeners for a specific event
   */
  getListenerCount<K extends keyof T>(event: K): number {
    const namespacedEvent = this.getNamespacedEvent(event);
    const eventListeners = this.listeners.get(String(namespacedEvent));
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * Get all registered event names
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get namespace for this EventBus instance
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * Check if there are any listeners for a specific event
   */
  hasListeners<K extends keyof T>(event: K): boolean {
    const namespacedEvent = this.getNamespacedEvent(event);
    const eventListeners = this.listeners.get(String(namespacedEvent));
    return eventListeners ? eventListeners.size > 0 : false;
  }

  /**
   * Create a namespaced event name
   * For default namespace, returns the original event name
   * For custom namespace, returns "timeline:namespace:eventName"
   */
  private getNamespacedEvent<K extends keyof T>(event: K): string {
    if (this.namespace === 'default') {
      return String(event);
    }
    
    const eventStr = String(event);
    // If event already starts with "timeline:", add namespace after it
    if (eventStr.startsWith('timeline:')) {
      const eventPart = eventStr.substring(9); // Remove "timeline:" prefix
      return `timeline:${this.namespace}:${eventPart}`;
    }
    
    // For non-timeline events, just add namespace
    return `${this.namespace}:${eventStr}`;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (enabled) {
      console.log(`[EventBus:${this.namespace}] Debug mode enabled`);
    }
  }

  /**
   * Get debug information about the EventBus state
   */
  getDebugInfo(): {
    namespace: string;
    totalEvents: number;
    totalListeners: number;
    events: Array<{ event: string; listenerCount: number }>;
  } {
    const events = Array.from(this.listeners.entries()).map(([event, listeners]) => ({
      event: String(event),
      listenerCount: listeners.size
    }));

    const totalListeners = events.reduce((sum, { listenerCount }) => sum + listenerCount, 0);

    return {
      namespace: this.namespace,
      totalEvents: this.listeners.size,
      totalListeners,
      events
    };
  }
}

// Export a default instance for convenience
export const defaultEventBus = new EventBus<TimelineEventPayloads>('default');

// Factory function to create namespaced EventBus instances
export function createEventBus<T = TimelineEventPayloads>(
  namespace: string,
  debugMode: boolean = false
): EventBus<T> {
  return new EventBus<T>(namespace, debugMode);
}