/**
 * Core Application State Container
 * Groups related states for FPS Camera, Viewport Navigation, and UI Interaction
 * to replace unencapsulated top-level mutable variables.
 */

export class FPSState {
  constructor() {
    this.cameraPitch = 0;
    this.cameraYaw = 0;
    this.keyW = false;
    this.keyA = false;
    this.keyS = false;
    this.keyD = false;
    this.keySpace = false;
    this.keyShift = false;
  }

  resetKeys() {
    this.keyW = false;
    this.keyA = false;
    this.keyS = false;
    this.keyD = false;
    this.keySpace = false;
    this.keyShift = false;
  }
}

export class NavState {
  constructor() {
    this.isNavigating = false;
    this.navType = 'orbit'; // 'orbit', 'pan', 'zoom'
    this.startMouseX = 0;
    this.startMouseY = 0;
    this.startRotationX = 0;
    this.startRotationY = 0;
    this.startTranslationX = 0;
    this.startTranslationY = 0;
    this.startTranslationZ = 0;
  }
}

export class InteractionState {
  constructor() {
    this.hasSettingsFile = false;
    this.wasConfigHealed = false;
    this.isSettingsOpen = false;
    this.isMouseOverCharacter = false;
    this.isMouseOverUI = false;
    this.isDragging = false;
    this.dragStartedOnMascot = false;
    this.isDraggingGear = false;
    this.dragStartScreenX = 0;
    this.dragStartScreenY = 0;
    this.dragMoveDistance = 0;
    this.altKeyHeld = false;
    this.shiftKeyHeld = false;
    this.ctrlKeyHeld = false;
    this.keyDHeld = false;
    this.isPhysicsDragging = false;
    this.animationState = {
      type: 'idle',
      startTime: 0,
      duration: 1000
    };
  }
}
