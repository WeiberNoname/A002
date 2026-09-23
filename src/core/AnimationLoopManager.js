/**
 * Animation Loop Manager Module (<180 lines)
 * Encapsulates frame-by-frame Three.js rendering, skeletal animation updates,
 * continuous mesh rotations, procedural reactions, physics, FPS camera movement, and HUD overlays.
 */

import { updatePerformanceMonitor } from '../ui/PerformanceMonitorUI.js';

export function updateAnimationFrame(deps) {
  const {
    delta,
    elapsed,
    now,
    THREE,
    mixer,
    innerModelGroup,
    characterGroup,
    animationState,
    currentSettings,
    hasSettingsFile,
    reactAction,
    idleAction,
    customModelLoaded,
    physicsEngine,
    camera,
    axesHelper,
    renderer,
    scene,
    updateFPSCamera
  } = deps;

  // 1. Update skeletal animation if active
  if (mixer) {
    mixer.update(delta);
  }

  // 1.3 Update Procedural Humanoid Skeletal Animation if active
  if (innerModelGroup && innerModelGroup.userData && innerModelGroup.userData.humanoidController) {
    const animName = currentSettings.activeAnimation || 'Idle';
    innerModelGroup.userData.humanoidController.updateAnimation(elapsed, animName);
  }

  // 1.4 Update 3D Mascot Mail Flight & Direct Chat Bubble
  if (deps.mascotMailService && typeof deps.mascotMailService.update === 'function') {
    deps.mascotMailService.update(delta);
  }
  if (deps.directChatUI && typeof deps.directChatUI.update === 'function') {
    deps.directChatUI.update();
  }

  // 2. Handle continuous axis spinning if enabled
  if (innerModelGroup) {
    if (currentSettings.spinX) innerModelGroup.rotation.x += delta * currentSettings.speedX;
    if (currentSettings.spinY) innerModelGroup.rotation.y += delta * currentSettings.speedY;
    if (currentSettings.spinZ) innerModelGroup.rotation.z += delta * currentSettings.speedZ;
  }

  // 3. Handle mascot animation state transitions
  if (animationState && characterGroup) {
    if (animationState.type === 'interact') {
      const progress = (now - animationState.startTime) / animationState.duration;

      if (progress >= 1.0) {
        animationState.type = 'idle';
        characterGroup.position.set(0, 0, 0);
        characterGroup.rotation.set(0.08, 0, 0);
        const targetScale = hasSettingsFile ? currentSettings.scale : 1.0;
        characterGroup.scale.set(targetScale, targetScale, targetScale);

        if (mixer) {
          if (reactAction && idleAction) {
            idleAction.reset();
            reactAction.crossFadeTo(idleAction, 0.2, true);
            idleAction.play();
          } else if (idleAction) {
            idleAction.timeScale = 1.0;
          }
        }
      } else {
        if (customModelLoaded) {
          if (currentSettings.bobbing) {
            characterGroup.position.y = Math.sin(elapsed * 1.5) * 0.12;
            characterGroup.rotation.z = Math.sin(elapsed * 0.8) * 0.025;
            characterGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.04;
          } else {
            characterGroup.position.y = 0;
            characterGroup.rotation.z = 0;
            characterGroup.rotation.y = 0;
          }
        } else {
          const height = Math.sin(progress * Math.PI) * 1.3;
          characterGroup.position.y = height;
          characterGroup.rotation.y = progress * Math.PI * 2;

          const baseScale = hasSettingsFile ? currentSettings.scale : 1.0;
          if (progress < 0.2) {
            characterGroup.scale.set(baseScale * 1.15, baseScale * 0.8, baseScale * 1.15);
          } else if (progress < 0.8) {
            characterGroup.scale.set(baseScale * 0.9, baseScale * 1.2, baseScale * 0.9);
          } else {
            const factor = (progress - 0.8) / 0.2;
            const squashY = 0.75 + (factor * 0.25);
            const stretchXZ = 1.2 - (factor * 0.2);
            characterGroup.scale.set(baseScale * stretchXZ, baseScale * squashY, baseScale * stretchXZ);
          }
        }
      }
    } else {
      if (!customModelLoaded) {
        const baseScale = hasSettingsFile ? currentSettings.scale : 1.0;
        const breatheSpeed = 2.5;
        const breatheFactor = Math.sin(elapsed * breatheSpeed);
        characterGroup.scale.y = baseScale * (1.0 + breatheFactor * 0.04);
        characterGroup.scale.x = baseScale * (1.0 - breatheFactor * 0.02);
        characterGroup.scale.z = baseScale * (1.0 - breatheFactor * 0.02);
      }

      if (physicsEngine && physicsEngine.enabled) {
        physicsEngine.update(delta, characterGroup);
      } else if (currentSettings.bobbing) {
        const isSpeaking = typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking;
        const speechOffset = isSpeaking ? Math.sin(elapsed * 12.0) * 0.04 : 0;
        const speechRot = isSpeaking ? Math.sin(elapsed * 16.0) * 0.025 : 0;

        characterGroup.position.y = (Math.sin(elapsed * 1.5) * 0.12) + speechOffset;
        characterGroup.rotation.z = (Math.sin(elapsed * 0.8) * 0.025) + speechRot;
        characterGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.04;
      } else {
        const isSpeaking = typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking;
        if (isSpeaking) {
          characterGroup.position.y = Math.sin(elapsed * 12.0) * 0.04;
          characterGroup.rotation.z = Math.sin(elapsed * 16.0) * 0.025;
        } else {
          characterGroup.position.y = 0;
          characterGroup.rotation.z = 0;
        }
        characterGroup.rotation.y = 0;
      }
    }
  }

  // 4. Update FPS camera
  if (currentSettings.enableFPSMode && updateFPSCamera) {
    updateFPSCamera(delta);
  }

  // 5. Update XYZ Spatial 3D Helper axes position
  if (axesHelper && characterGroup) {
    axesHelper.position.copy(characterGroup.position);
  }

  // 6. Render WebGL Scene
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }

  // 7. Update Performance & Motion Magnitude Monitor (Motion tab)
  const panel = document.getElementById('settings-panel');
  const isSettingsOpen = panel && !panel.classList.contains('hidden');
  if (isSettingsOpen) {
    updatePerformanceMonitor({
      delta,
      now,
      currentSettings,
      isSettingsOpen,
      physicsEngine,
      characterGroup
    });
  }
}
