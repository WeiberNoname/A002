/**
 * Application State Container Module (<90 lines)
 * Encapsulates global state defaults and state container object construction.
 */

export function createAppStateContainer() {
  return {
    // FPS Perspective State
    fps: {
      cameraPitch: 0,
      cameraYaw: 0,
      fpsKeyW: false,
      fpsKeyA: false,
      fpsKeyS: false,
      fpsKeyD: false,
      fpsKeySpace: false,
      fpsKeyShift: false
    },
    // UI & Hover Flags
    ui: {
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
      dragMoveDistance: 0
    },
    // Viewport Orbit/Pan/Zoom Navigation
    navigation: {
      isNavigating: false,
      navType: 'orbit',
      navStartMouseX: 0,
      navStartMouseY: 0,
      navStartRotationX: 0,
      navStartRotationY: 0,
      navStartTranslationX: 0,
      navStartTranslationY: 0,
      navStartTranslationZ: 0
    },
    // Modifier Keys
    modifiers: {
      altKeyHeld: false,
      shiftKeyHeld: false,
      ctrlKeyHeld: false,
      keyDHeld: false,
      isPhysicsDragging: false
    },
    // Animation State
    animation: {
      type: 'idle',
      startTime: 0,
      duration: 1000
    }
  };
}
