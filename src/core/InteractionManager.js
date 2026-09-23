/**
 * Core Interaction Manager Module
 * Handles viewport interaction, mouse raycasting, Blender-style MMB orbit/pan/zoom,
 * Physics D+Drag launching, window move IPC calls, FPS pointer lock & WASD movement,
 * and drag-and-drop 3D asset import listeners.
 */

/**
 * Initializes interaction listeners and mouse/keyboard handlers.
 * @param {Object} ctx - Context object holding references to scene, camera, renderer, settings, physics engine, and callbacks.
 */
export function setupInteraction(ctx) {
  const {
    THREE,
    scene,
    camera,
    renderer,
    getCharacterGroup,
    getInnerModelGroup,
    getCollisionProxy,
    physicsEngine,
    currentSettings,
    ipcRenderer,
    fs,
    path,
    state,
    callbacks
  } = ctx;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let lastRaycastTime = 0;

  function updateIgnoreMouseState() {
    const isHoveringMascot = state.isMouseOverCharacter && !state.isSettingsOpen;
    const isViewOnlyActive = currentSettings.viewOnly && isHoveringMascot;

    const container = document.getElementById('container');
    if (container) {
      if (isViewOnlyActive) {
        container.style.opacity = '0.0';
        container.style.transition = 'opacity 0.2s ease';
      } else {
        container.style.opacity = '1.0';
        container.style.transition = 'opacity 0.2s ease';
      }
    }

    document.body.classList.toggle('mouse-over-mascot', state.isMouseOverUI || state.isSettingsOpen);

    const effectiveHover = state.isMouseOverCharacter && !isViewOnlyActive;

    const shouldFocus = state.isSettingsOpen ||
      effectiveHover ||
      state.isMouseOverUI ||
      Boolean(typeof window !== 'undefined' && window.isHoveringDirectChat) ||
      Boolean(typeof window !== 'undefined' && (window.isDevLabOpen || window.isHoveringDevLab)) ||
      state.isDragging ||
      state.isResizingPanel ||
      state.isNavigating ||
      currentSettings.enableFPSMode ||
      state.altKeyHeld ||
      state.shiftKeyHeld ||
      state.ctrlKeyHeld;

    ipcRenderer.send('set-ignore-mouse', !shouldFocus);
  }

  // Bind updateIgnoreMouseState to state and window for external calls if needed
  state.updateIgnoreMouseState = updateIgnoreMouseState;
  if (typeof window !== 'undefined') {
    window.updateIgnoreMouseState = updateIgnoreMouseState;
  }

  // Track mouse movements
  window.addEventListener('mousemove', (event) => {
    state.altKeyHeld = event.altKey;
    state.shiftKeyHeld = event.shiftKey;
    state.ctrlKeyHeld = event.ctrlKey;

    if (currentSettings.enableFPSMode && !state.isSettingsOpen) {
      const sensitivity = 0.003;
      state.cameraYaw -= event.movementX * sensitivity;
      state.cameraPitch -= event.movementY * sensitivity;

      const maxPitch = Math.PI / 2 - 0.02;
      state.cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, state.cameraPitch));

      camera.rotation.set(state.cameraPitch, state.cameraYaw, 0, 'YXZ');
      return;
    }

    const innerModelGroup = getInnerModelGroup();
    if (state.isNavigating) {
      if (innerModelGroup) {
        const deltaX = event.clientX - state.navStartMouseX;
        const deltaY = event.clientY - state.navStartMouseY;

        if (state.navType === 'orbit') {
          innerModelGroup.rotation.y = state.navStartRotationY + deltaX * 0.01;
          innerModelGroup.rotation.x = state.navStartRotationX + deltaY * 0.01;
        } else if (state.navType === 'pan') {
          innerModelGroup.position.x = state.navStartTranslationX + deltaX * 0.005;
          innerModelGroup.position.y = state.navStartTranslationY - deltaY * 0.005;
        } else if (state.navType === 'roll') {
          const currentAngle = Math.atan2(event.clientY - state.navCenterY, event.clientX - state.navCenterX);
          let deltaAngle = currentAngle - state.navStartAngle;
          innerModelGroup.rotation.z = state.navStartRotationZ + deltaAngle;
          if (currentSettings) currentSettings.rotZ = innerModelGroup.rotation.z;
        } else if (state.navType === 'zoom') {
          if (camera) {
            const newZ = (state.navStartCameraZ || 5.5) + deltaY * 0.02;
            camera.position.z = Math.max(1.0, Math.min(30.0, newZ));
          }
        }
      }
      return;
    }

    const characterGroup = getCharacterGroup();
    if (state.isPhysicsDragging) {
      const deltaX = event.screenX - state.dragStartScreenX;
      const deltaY = event.screenY - state.dragStartScreenY;

      state.dragStartScreenX = event.screenX;
      state.dragStartScreenY = event.screenY;

      physicsEngine.onDragMove(event.screenX, event.screenY);

      physicsEngine.position.x += deltaX * 0.008;
      physicsEngine.position.y -= deltaY * 0.008;
      if (characterGroup) {
        characterGroup.position.set(physicsEngine.position.x, physicsEngine.position.y, physicsEngine.position.z);
      }
      return;
    }

    if (state.isDragging) {
      const deltaX = event.screenX - state.dragStartScreenX;
      const deltaY = event.screenY - state.dragStartScreenY;
      state.dragMoveDistance += Math.abs(deltaX) + Math.abs(deltaY);

      state.dragStartScreenX = event.screenX;
      state.dragStartScreenY = event.screenY;

      physicsEngine.onDragMove(event.screenX, event.screenY);
      ipcRenderer.send('move-window', { x: deltaX, y: deltaY });
      return;
    }

    if (event.target.tagName !== 'CANVAS') {
      if (state.isMouseOverCharacter) {
        state.isMouseOverCharacter = false;
        document.body.style.cursor = 'default';
        updateIgnoreMouseState();
      }
      return;
    }

    if (currentSettings.mouseOptimize) {
      const now = Date.now();
      if (now - lastRaycastTime < 16) return;
      lastRaycastTime = now;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    let intersects = [];
    const collisionProxy = getCollisionProxy();
    if (currentSettings.mouseOptimize && collisionProxy) {
      intersects = raycaster.intersectObject(collisionProxy);
    } else if (characterGroup && characterGroup.children) {
      intersects = raycaster.intersectObjects(characterGroup.children, true);
    }

    const raycastHit = (intersects.length > 0);
    if (raycastHit !== state.isMouseOverCharacter) {
      state.isMouseOverCharacter = raycastHit;
      document.body.style.cursor = state.isMouseOverCharacter ? 'pointer' : 'default';
    }
    updateIgnoreMouseState();
  });

  window.addEventListener('mouseleave', () => {
    if (state.isMouseOverCharacter) {
      state.isMouseOverCharacter = false;
      document.body.style.cursor = 'default';
      updateIgnoreMouseState();
    }
  });

  window.addEventListener('mousedown', (event) => {
    const gearBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('app-close-btn');
    const settingsHeader = document.getElementById('settings-header');

    const isClickOnHeader = settingsHeader && settingsHeader.contains(event.target);
    const isClickOnGear = gearBtn && gearBtn.contains(event.target);
    const isClickOnClose = closeBtn && closeBtn.contains(event.target);

    if (isClickOnClose) return;
    if (state.isSettingsOpen && !isClickOnHeader && !isClickOnGear) return;

    if (currentSettings.enableFPSMode && renderer && renderer.domElement) {
      if (document.pointerLockElement !== renderer.domElement) {
        try {
          renderer.domElement.requestPointerLock();
        } catch (e) {
          console.warn("Could not lock pointer:", e);
        }
      }
    }

    state.altKeyHeld = event.altKey;
    state.shiftKeyHeld = event.shiftKey;
    state.ctrlKeyHeld = event.ctrlKey;

    const isMMB = event.button === 1;
    if (isMMB) {
      event.preventDefault();
    }

    const isOrbit = event.altKey || (isMMB && !event.shiftKey && !event.ctrlKey);
    const isPan = event.shiftKey;
    const isRoll = event.ctrlKey;

    const innerModelGroup = getInnerModelGroup();
    if (isOrbit || isPan || isRoll) {
      if (innerModelGroup) {
        state.isNavigating = true;
        state.navType = isOrbit ? 'orbit' : (isPan ? 'pan' : 'roll');
        state.navStartMouseX = event.clientX;
        state.navStartMouseY = event.clientY;
        state.navStartRotationX = innerModelGroup.rotation.x;
        state.navStartRotationY = innerModelGroup.rotation.y;
        state.navStartRotationZ = innerModelGroup.rotation.z;
        state.navStartTranslationX = innerModelGroup.position.x;
        state.navStartTranslationY = innerModelGroup.position.y;
        state.navStartTranslationZ = innerModelGroup.position.z;

        if (isRoll) {
          const rect = (renderer && renderer.domElement) ? renderer.domElement.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
          state.navCenterX = rect.left + rect.width / 2;
          state.navCenterY = rect.top + rect.height / 2;
          state.navStartAngle = Math.atan2(event.clientY - state.navCenterY, event.clientX - state.navCenterX);
        }

        document.body.style.cursor = isOrbit ? 'all-scroll' : (isPan ? 'move' : 'sync');
        updateIgnoreMouseState();
      }
      return;
    }

    if (currentSettings.lockPosition) return;
    if (event.button === 0) {
      const isDDrag = state.keyDHeld || event.key === 'd' || event.key === 'D' || event.code === 'KeyD';
      if (isDDrag) {
        event.preventDefault();
        state.isPhysicsDragging = true;
        state.isDragging = false;

        if (!physicsEngine.enabled) {
          physicsEngine.configure({ enabled: true });
          currentSettings.enablePhysics = true;
          const enableCheck = document.getElementById('enable-physics');
          if (enableCheck) enableCheck.checked = true;
        }

        state.dragStartScreenX = event.screenX;
        state.dragStartScreenY = event.screenY;

        physicsEngine.onDragStart(event.screenX, event.screenY);
        document.body.style.cursor = 'grabbing';
        if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Physics Throw Active! 🚀 (Release to launch)", 1800);
        updateIgnoreMouseState();
        return;
      }

      const settingsPanel = document.getElementById('settings-panel');
      const isClickOnPanel = settingsPanel && settingsPanel.contains(event.target);
      const isClickOnInteractive = event.target.closest('input, select, button, textarea');

      const shouldDrag = state.isMouseOverCharacter ||
        isClickOnGear ||
        isClickOnHeader ||
        (isClickOnPanel && !isClickOnInteractive);

      if (shouldDrag) {
        state.isDragging = true;
        state.dragStartScreenX = event.screenX;
        state.dragStartScreenY = event.screenY;
        state.dragMoveDistance = 0;
        document.body.style.cursor = 'grabbing';
        if (settingsHeader && isClickOnHeader) {
          settingsHeader.style.cursor = 'grabbing';
        }

        state.dragStartedOnMascot = state.isMouseOverCharacter;
        state.isDraggingGear = isClickOnGear;

        physicsEngine.onDragStart(event.screenX, event.screenY);
        updateIgnoreMouseState();
      }
    }
  });

  window.addEventListener('mouseup', (event) => {
    state.altKeyHeld = event.altKey;
    state.shiftKeyHeld = event.shiftKey;
    state.ctrlKeyHeld = event.ctrlKey;

    const isMMB = event.button === 1;
    if (isMMB) {
      event.preventDefault();
    }

    if (state.isNavigating) {
      state.isNavigating = false;
      document.body.style.cursor = state.isMouseOverCharacter ? 'pointer' : 'default';
      updateIgnoreMouseState();
      return;
    }

    if (state.isPhysicsDragging) {
      state.isPhysicsDragging = false;
      physicsEngine.onDragEnd(event.screenX, event.screenY);
      document.body.style.cursor = state.isMouseOverCharacter ? 'pointer' : 'default';
      updateIgnoreMouseState();
      return;
    }

    if (state.isDragging) {
      state.isDragging = false;
      physicsEngine.onDragEnd(event.screenX, event.screenY);
      const settingsHeader = document.getElementById('settings-header');
      if (settingsHeader) settingsHeader.style.cursor = 'grab';
      document.body.style.cursor = state.isMouseOverCharacter ? 'pointer' : 'default';
      updateIgnoreMouseState();

      if (state.dragMoveDistance < 8 && state.dragStartedOnMascot) {
        if (callbacks.triggerInteraction) callbacks.triggerInteraction();
      }
    }
  });

  window.addEventListener('wheel', (event) => {
    if (state.isSettingsOpen) return;
    if (camera) {
      const zoomSpeed = 0.003;
      const minZ = 1.0;
      const maxZ = 30.0;
      camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z + event.deltaY * zoomSpeed));
    }
  }, { passive: true });

  window.addEventListener('dblclick', (event) => {
    if (state.isSettingsOpen) return;
    if (event.altKey) {
      if (callbacks.resetCameraAndPosition) callbacks.resetCameraAndPosition();
      if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("View reset! 🔄", 1500);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Alt') state.altKeyHeld = true;
    if (event.key === 'Shift') state.shiftKeyHeld = true;
    if (event.key === 'Control') state.ctrlKeyHeld = true;
    if (event.key === 'd' || event.key === 'D' || event.code === 'KeyD') state.keyDHeld = true;

    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

    if (!isTyping && currentSettings.enableFPSMode) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        currentSettings.enableFPSMode = false;
        if (callbacks.resetCameraAndPosition) callbacks.resetCameraAndPosition();
        if (callbacks.saveSettingsFile) callbacks.saveSettingsFile();
        if (callbacks.updateXYZVisibility) callbacks.updateXYZVisibility();
        updateIgnoreMouseState();

        const fpsCheck = document.getElementById('enable-fps-mode');
        if (fpsCheck) fpsCheck.checked = false;

        if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Exited FPS Camera Mode (ESC) 🐰", 2200);
        return;
      }
      if (event.code === 'KeyW' || event.key === 'w' || event.key === 'W') state.fpsKeyW = true;
      if (event.code === 'KeyS' || event.key === 's' || event.key === 'S') state.fpsKeyS = true;
      if (event.code === 'KeyA' || event.key === 'a' || event.key === 'A') state.fpsKeyA = true;
      if (event.code === 'KeyD' || event.key === 'd' || event.key === 'D') state.fpsKeyD = true;
      if (event.code === 'Space' || event.key === ' ') state.fpsKeySpace = true;
      if (event.key === 'Shift') state.fpsKeyShift = true;
    }

    updateIgnoreMouseState();

    if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
      event.preventDefault();
      currentSettings.enableFPSMode = !currentSettings.enableFPSMode;
      if (!currentSettings.enableFPSMode) {
        camera.position.set(0, 0, 5.5);
        camera.rotation.set(0, 0, 0);
        state.cameraPitch = 0;
        state.cameraYaw = 0;
        state.fpsKeyW = state.fpsKeyA = state.fpsKeyS = state.fpsKeyD = state.fpsKeySpace = state.fpsKeyShift = false;
      }
      if (callbacks.saveSettingsFile) callbacks.saveSettingsFile();
      updateIgnoreMouseState();

      const fpsCheck = document.getElementById('enable-fps-mode');
      if (fpsCheck) fpsCheck.checked = currentSettings.enableFPSMode;

      if (callbacks.showSpeechBubble) callbacks.showSpeechBubble(currentSettings.enableFPSMode ? "FPS Camera Mode: Enabled 🎥 (WASD+Space/Shift)" : "FPS Camera Mode: Disabled 🐰", 2500);
    }

    const isCtrlV = event.ctrlKey && (event.key === 'v' || event.key === 'V');
    if (isCtrlV) {
      if (!isTyping) {
        event.preventDefault();
        currentSettings.viewOnly = !currentSettings.viewOnly;

        const viewOnlyCheck = document.getElementById('view-only');
        if (viewOnlyCheck) {
          viewOnlyCheck.checked = currentSettings.viewOnly;
        }

        if (callbacks.saveSettingsFile) callbacks.saveSettingsFile();
        updateIgnoreMouseState();

        if (callbacks.showSpeechBubble) callbacks.showSpeechBubble(currentSettings.viewOnly ? "View Only Mode: Enabled 👁️" : "View Only Mode: Disabled 🐰", 2500);
      }
    }

    if (event.ctrlKey && event.shiftKey && (event.key === 'C' || event.key === 'c')) {
      event.preventDefault();
      currentSettings.showXYZCoords = !currentSettings.showXYZCoords;
      if (callbacks.updateXYZVisibility) callbacks.updateXYZVisibility();
      if (callbacks.saveSettingsFile) callbacks.saveSettingsFile();

      const showCoordsCheck = document.getElementById('show-xyz-coords');
      if (showCoordsCheck) showCoordsCheck.checked = currentSettings.showXYZCoords;

      if (callbacks.showSpeechBubble) callbacks.showSpeechBubble(currentSettings.showXYZCoords ? "XYZ Coordinates: Enabled 📐" : "XYZ Coordinates: Disabled 📐", 2200);
    }

    const innerModelGroup = getInnerModelGroup();
    if (!state.isSettingsOpen && innerModelGroup) {
      if (!isTyping) {
        const key = event.key;
        if (key === '1') {
          innerModelGroup.rotation.set(0, 0, 0);
          if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Front View 🐰", 1200);
        } else if (key === '3') {
          innerModelGroup.rotation.set(0, Math.PI / 2, 0);
          if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Right View ➡️", 1200);
        } else if (key === '7') {
          innerModelGroup.rotation.set(Math.PI / 2, 0, 0);
          if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Top View ⬇️", 1200);
        } else if (key === '9') {
          innerModelGroup.rotation.y += Math.PI;
          if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Opposite View 🔄", 1200);
        } else if (key === '.' || key.toLowerCase() === 'f') {
          innerModelGroup.rotation.set(0, 0, 0);
          innerModelGroup.position.set(0, 0, 0);
          if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Frame Selected / Reset view 🔄", 1500);
        }
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.key === 'Alt') state.altKeyHeld = false;
    if (event.key === 'Shift') state.shiftKeyHeld = false;
    if (event.key === 'Control') state.ctrlKeyHeld = false;
    if (event.key === 'd' || event.key === 'D' || event.code === 'KeyD') state.keyDHeld = false;

    if (event.code === 'KeyW' || event.key === 'w' || event.key === 'W') state.fpsKeyW = false;
    if (event.code === 'KeyS' || event.key === 's' || event.key === 'S') state.fpsKeyS = false;
    if (event.code === 'KeyA' || event.key === 'a' || event.key === 'A') state.fpsKeyA = false;
    if (event.code === 'KeyD' || event.key === 'd' || event.key === 'D') state.fpsKeyD = false;
    if (event.code === 'Space' || event.key === ' ') state.fpsKeySpace = false;
    if (event.key === 'Shift') state.fpsKeyShift = false;

    updateIgnoreMouseState();
  });

  document.addEventListener('pointerlockchange', () => {
    const isLocked = !!document.pointerLockElement;
    if (!isLocked && currentSettings.enableFPSMode && !state.isSettingsOpen) {
      currentSettings.enableFPSMode = false;
      if (callbacks.resetCameraAndPosition) callbacks.resetCameraAndPosition();
      if (callbacks.saveSettingsFile) callbacks.saveSettingsFile();
      if (callbacks.updateXYZVisibility) callbacks.updateXYZVisibility();
      updateIgnoreMouseState();
      if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Pointer Unlocked - Exited FPS Mode 🐰", 2000);
    }
  });

  window.addEventListener('blur', () => {
    state.isNavigating = false;
    state.isPhysicsDragging = false;
    state.altKeyHeld = false;
    state.shiftKeyHeld = false;
    state.ctrlKeyHeld = false;
    state.keyDHeld = false;
    document.body.style.cursor = 'default';
    updateIgnoreMouseState();
  });

  const gearBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('app-close-btn');
  const settingsPanel = document.getElementById('settings-panel');

  if (gearBtn) {
    gearBtn.addEventListener('mouseenter', () => {
      state.isMouseOverUI = true;
      updateIgnoreMouseState();
    });
    gearBtn.addEventListener('mouseleave', () => {
      state.isMouseOverUI = false;
      updateIgnoreMouseState();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', () => {
      state.isMouseOverUI = true;
      updateIgnoreMouseState();
    });
    closeBtn.addEventListener('mouseleave', () => {
      state.isMouseOverUI = false;
      updateIgnoreMouseState();
    });
  }

  if (settingsPanel) {
    settingsPanel.addEventListener('mouseenter', () => {
      state.isMouseOverUI = true;
      updateIgnoreMouseState();
    });
    settingsPanel.addEventListener('mouseleave', () => {
      state.isMouseOverUI = false;
      updateIgnoreMouseState();
    });
  }

  window.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    ipcRenderer.send('set-ignore-mouse', false);
  });

  window.addEventListener('dragleave', () => {
    updateIgnoreMouseState();
  });

  window.addEventListener('drop', (event) => {
    event.preventDefault();
    updateIgnoreMouseState();

    const files = event.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const isGlb = file.name.endsWith('.glb');
    const isGltf = file.name.endsWith('.gltf');
    if (!isGlb && !isGltf) {
      if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Please drop a .glb or .gltf model file! 🐹", 3000);
      return;
    }

    const localFilePath = file.path;
    if (!localFilePath) {
      if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Could not read file path 😢", 3000);
      return;
    }

    if (!callbacks.getAssetsPath) return;
    const assetsDir = callbacks.getAssetsPath();
    const fileName = path.basename(localFilePath);
    const destPath = path.join(assetsDir, fileName);

    try {
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      fs.copyFileSync(localFilePath, destPath);
    } catch (e) {
      console.error("Failed to copy dropped file:", e);
      if (callbacks.showSpeechBubble) callbacks.showSpeechBubble("Failed to import model 😢", 3000);
      return;
    }

    if (callbacks.showSpeechBubble) callbacks.showSpeechBubble(`Imported mascot:\n${fileName} 🎉`, 4000);

    if (callbacks.onModelImported) callbacks.onModelImported(fileName, destPath);
  });
}
