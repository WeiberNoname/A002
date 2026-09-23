/**
 * Unified Reactive Application State Store (<90 lines)
 * Provides centralized, proxy-based reactive state management with fine-grained subscription listeners.
 */

export class AppStore {
  /**
   * @param {Object} initialOverrides - Optional overrides for initial state
   */
  constructor(initialOverrides = {}) {
    this.listeners = new Map();

    const defaultState = {
      // UI & Modal Flags
      hasSettingsFile: false,
      wasConfigHealed: false,
      isSettingsOpen: false,
      isMouseOverCharacter: false,
      isMouseOverUI: false,
      isDragging: false,
      dragStartedOnMascot: false,
      isDraggingGear: false,
      dragStartScreenX: 0,
      dragStartScreenY: 0,
      dragMoveDistance: 0,
      isResizingPanel: false,

      // Viewport Navigation
      isNavigating: false,
      navType: 'orbit',
      navStartMouseX: 0,
      navStartMouseY: 0,
      navStartRotationX: 0,
      navStartRotationY: 0,
      navStartTranslationX: 0,
      navStartTranslationY: 0,
      navStartTranslationZ: 0,

      // Modifier Keys & Physics Flags
      altKeyHeld: false,
      shiftKeyHeld: false,
      ctrlKeyHeld: false,
      keyDHeld: false,
      isPhysicsDragging: false,

      // First-Person Perspective Keys & Angles
      cameraPitch: 0,
      cameraYaw: 0,
      fpsKeyW: false,
      fpsKeyA: false,
      fpsKeyS: false,
      fpsKeyD: false,
      fpsKeySpace: false,
      fpsKeyShift: false,

      // Mascot Procedural Animation State
      animation: {
        type: 'idle',
        startTime: 0,
        duration: 1000
      },

      ...initialOverrides
    };

    // Reactive Proxy triggers registered listeners whenever properties change
    this.state = new Proxy(defaultState, {
      set: (target, prop, value) => {
        const prev = target[prop];
        target[prop] = value;
        if (prev !== value && this.listeners.has(prop)) {
          this.listeners.get(prop).forEach(cb => {
            try { cb(value, prev); } catch (e) { console.error(`[AppStore] Error in listener for ${String(prop)}:`, e); }
          });
        }
        return true;
      }
    });
  }

  /**
   * Subscribe to changes on a specific state key
   * @param {string} key - Property name
   * @param {Function} callback - Callback function (newVal, prevVal)
   * @returns {Function} Unsubscribe cleanup function
   */
  subscribe(key, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => {
      if (this.listeners.has(key)) {
        this.listeners.get(key).delete(callback);
      }
    };
  }

  /**
   * Update multiple state properties at once
   * @param {Object} updates 
   */
  set(updates) {
    if (!updates || typeof updates !== 'object') return;
    Object.assign(this.state, updates);
  }
}
