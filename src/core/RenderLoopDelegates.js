/**
 * Render Loop & Preview Viewport Delegates Module (<70 lines)
 * Encapsulates Three.js animation frame rendering, FPS camera WASD updates, spatial grid HUD toggles, and offscreen preview viewport rendering.
 */

export function createRenderLoopDelegates(deps) {
  const {
    clock,
    THREE,
    updateAnimationFrameUtil,
    updateFPSCameraUtil,
    updateXYZVisibilityUtil,
    getContext
  } = deps;

  let idleDeltaAccumulator = 0;
  let batteryDeltaAccumulator = 0;
  let fpsTargetDeltaAccumulator = 0;

  const animate = () => {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    const now = Date.now();

    const ctx = getContext();
    const currentSettings = ctx.currentSettings || {};

    // Dynamic Battery Saver Option: Throttles to ~15 FPS when unfocused or idle
    if (currentSettings.dynamicBatterySaver === true) {
      const isUnfocused = typeof document !== 'undefined' && !document.hasFocus();
      const isHovered = ctx.isMouseOverCharacter || ctx.isMouseOverUI || ctx.isSettingsOpen;
      const isInteracting = ctx.animationState && ctx.animationState.type === 'interact';
      const isDragging = ctx.isDragging || ctx.isResizingPanel;
      const isPhysicsActive = ctx.physicsEngine && ctx.physicsEngine.enabled && ctx.physicsEngine.isDragging;
      const isFpsActive = currentSettings.enableFPSMode;

      const isInactive = isUnfocused || (!isHovered && !isInteracting && !isDragging && !isPhysicsActive && !isFpsActive);

      if (isInactive) {
        batteryDeltaAccumulator += delta;
        if (batteryDeltaAccumulator < 0.066) {
          return; // Skip rendering frame to cap at ~15 FPS in battery saver mode
        }
        batteryDeltaAccumulator %= 0.066;
      } else {
        batteryDeltaAccumulator = 0;
      }
    } else if (currentSettings.idleFpsSaver) {
      const isInteracting = ctx.animationState && ctx.animationState.type === 'interact';
      const isDragging = ctx.isDragging;
      const isPhysicsActive = ctx.physicsEngine && ctx.physicsEngine.enabled && ctx.physicsEngine.isDragging;
      const isFpsActive = currentSettings.enableFPSMode;

      if (!isInteracting && !isDragging && !isPhysicsActive && !isFpsActive) {
        idleDeltaAccumulator += delta;
        if (idleDeltaAccumulator < 0.032) {
          return; // Skip rendering frame to cap at ~30 FPS
        }
        idleDeltaAccumulator %= 0.032;
      } else {
        idleDeltaAccumulator = 0;
      }
    } else {
      idleDeltaAccumulator = 0;
      batteryDeltaAccumulator = 0;
    }

    // Target FPS Speed Limiter (from Motion & Spin settings)
    const targetFps = parseInt(currentSettings.targetFps, 10) || 60;
    if (targetFps > 0 && targetFps < 240) {
      const targetInterval = 1.0 / targetFps;
      fpsTargetDeltaAccumulator += delta;
      if (fpsTargetDeltaAccumulator < targetInterval - 0.001) {
        return; // Skip rendering frame to cap at user configured target FPS
      }
      fpsTargetDeltaAccumulator %= targetInterval;
    } else {
      fpsTargetDeltaAccumulator = 0;
    }

    updateAnimationFrameUtil({
      delta,
      elapsed,
      now,
      THREE,
      ...ctx
    });
  };

  const updateFPSCamera = (delta) => {
    const ctx = getContext();
    updateFPSCameraUtil({
      currentSettings: ctx.currentSettings,
      camera: ctx.camera,
      THREE,
      keys: ctx.keys,
      delta
    });
  };

  const updateXYZVisibility = () => {
    const ctx = getContext();
    updateXYZVisibilityUtil({
      axesHelper: ctx.axesHelper,
      gridHelper: ctx.gridHelper,
      currentSettings: ctx.currentSettings,
      isSettingsOpen: ctx.isSettingsOpen,
      renderer: ctx.renderer,
      isMouseOverCharacter: ctx.isMouseOverCharacter
    });
  };

  return {
    animate,
    updateFPSCamera,
    updateXYZVisibility
  };
}
