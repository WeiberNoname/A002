/**
 * EventBus
 * Centralized, decoupled Reactive Event & State Communication Bus.
 * Connects settings changes, asset ingestion, 3D model switches, and audio events
 * with fine-grained subscription channels and automatic error-isolated dispatching.
 */

export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  static getInstance() {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * Subscribes a listener to a specific event channel.
   * @param {string} event - Event name (e.g. 'settings:changed', 'asset:registered')
   * @param {Function} handler - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!event || typeof handler !== 'function') return () => {};

    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(handler);

    return () => this.off(event, handler);
  }

  /**
   * Subscribes a listener to fire only once for an event.
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    if (!event || typeof handler !== 'function') return () => {};

    const wrappedHandler = (payload) => {
      this.off(event, wrappedHandler);
      handler(payload);
    };
    return this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribes a listener from an event channel.
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   */
  off(event, handler) {
    if (!event || !this.handlers.has(event)) return;
    this.handlers.get(event).delete(handler);
    if (this.handlers.get(event).size === 0) {
      this.handlers.delete(event);
    }
  }

  /**
   * Emits an event with a payload to all registered listeners.
   * @param {string} event - Event name
   * @param {*} payload - Event data payload
   */
  emit(event, payload) {
    if (!event) return;

    // 1. Direct channel listeners
    if (this.handlers.has(event)) {
      const callbacks = Array.from(this.handlers.get(event));
      callbacks.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventBus] Error in handler for event '${event}':`, err);
        }
      });
    }

    // 2. Wildcard namespace listeners (e.g. 'settings:*' for 'settings:changed')
    const colonIdx = event.indexOf(':');
    if (colonIdx !== -1) {
      const wildcardEvent = event.substring(0, colonIdx + 1) + '*';
      if (this.handlers.has(wildcardEvent)) {
        const wildcardCallbacks = Array.from(this.handlers.get(wildcardEvent));
        wildcardCallbacks.forEach(cb => {
          try {
            cb({ event, payload });
          } catch (err) {
            console.error(`[EventBus] Error in wildcard handler for '${wildcardEvent}':`, err);
          }
        });
      }
    }
  }

  /**
   * Clears all listeners for an event or all events if none specified.
   * @param {string} [event] - Optional event name
   */
  clear(event) {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventBus = EventBus.getInstance();
