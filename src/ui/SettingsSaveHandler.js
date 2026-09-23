/**
 * Settings Save & Commit Handler Module (<130 lines)
 * Handles applying form setting modifications, physics reconfiguration,
 * mascot model swapping, camera distance Z framing, and Electron window resizing.
 */

import { soundManager } from '../core/SoundManager.js';

export async function handleSaveSettings(deps) {
  const {
    currentSettings,
    langSelect,
    changeLanguage,
    updateStageLighting,
    widthSlider,
    heightSlider,
    scaleSlider,
    bobbingCheck,
    spinXCheck,
    spinYCheck,
    spinZCheck,
    speedXSlider,
    speedYSlider,
    speedZSlider,
    gpuOptimizeCheck,
    mouseOptimizeCheck,
    settingsLeftCheck,
    lockPositionCheck,
    viewOnlyCheck,
    enablePhysicsCheck,
    physicsFloorCheck,
    physicsGravitySlider,
    physicsElasticitySlider,
    modelSelect,
    animSelect,
    fontScaleSlider,
    physicsEngine,
    saveSettingsFile,
    state,
    THREE,
    camera,
    renderer,
    path,
    getAssetsPath,
    ipcRenderer,
    fallbackToProcedural,
    loadCustomModel,
    applySelectedAnimation,
    updateGearPosition,
    updateXYZVisibility,
    populateModelDropdown,
    closeSettings
  } = deps;

  if (langSelect && langSelect.value !== currentSettings.language) {
    currentSettings.language = langSelect.value;
    if (changeLanguage) await changeLanguage(currentSettings.language);
    if (populateModelDropdown) populateModelDropdown();
  }

  if (updateStageLighting) updateStageLighting();

  currentSettings.width = parseInt(widthSlider.value, 10);
  currentSettings.height = parseInt(heightSlider.value, 10);
  currentSettings.scale = parseFloat(scaleSlider.value);
  currentSettings.bobbing = bobbingCheck.checked;

  currentSettings.spinX = spinXCheck.checked;
  currentSettings.spinY = spinYCheck.checked;
  currentSettings.spinZ = spinZCheck.checked;

  currentSettings.speedX = parseFloat(speedXSlider.value);
  currentSettings.speedY = parseFloat(speedYSlider.value);
  currentSettings.speedZ = parseFloat(speedZSlider.value);

  const targetFpsSliderDom = deps.targetFpsSlider || document.getElementById('target-fps');
  const numTargetFpsDom = deps.numTargetFps || document.getElementById('num-target-fps');
  if (targetFpsSliderDom || numTargetFpsDom) {
    const fpsVal = parseInt(targetFpsSliderDom ? targetFpsSliderDom.value : numTargetFpsDom.value, 10) || 60;
    currentSettings.targetFps = Math.max(15, Math.min(240, fpsVal));
  }

  currentSettings.gpuOptimize = gpuOptimizeCheck.checked;
  const gpuLowPowerDom = deps.gpuLowPowerCheck || document.getElementById('gpu-low-power');
  const idleFpsSaverDom = deps.idleFpsSaverCheck || document.getElementById('idle-fps-saver');
  const dynamicBatterySaverDom = deps.dynamicBatterySaverCheck || document.getElementById('dynamic-battery-saver');
  if (gpuLowPowerDom) currentSettings.gpuLowPower = gpuLowPowerDom.checked;
  if (idleFpsSaverDom) currentSettings.idleFpsSaver = idleFpsSaverDom.checked;
  if (dynamicBatterySaverDom) currentSettings.dynamicBatterySaver = dynamicBatterySaverDom.checked;
  currentSettings.mouseOptimize = mouseOptimizeCheck.checked;
  currentSettings.settingsLeft = settingsLeftCheck.checked;
  currentSettings.lockPosition = lockPositionCheck.checked;
  currentSettings.viewOnly = viewOnlyCheck.checked;

  const synthVisionModelDom = document.getElementById('beta-synth-vision-model');
  if (synthVisionModelDom) currentSettings.synthVisionModel = synthVisionModelDom.value;
  const synthVisionDetailDom = document.getElementById('beta-synth-vision-detail');
  if (synthVisionDetailDom) currentSettings.synthVisionDetail = synthVisionDetailDom.value;
  const synthTextModelDom = document.getElementById('beta-synth-text-model');
  if (synthTextModelDom) currentSettings.synthTextModel = synthTextModelDom.value;
  const synthCountDom = document.getElementById('beta-synth-count');
  if (synthCountDom) currentSettings.synthCaptionCount = parseInt(synthCountDom.value, 10) || 3;
  const synthStyleDom = document.getElementById('beta-synth-style');
  if (synthStyleDom) currentSettings.synthStyle = synthStyleDom.value;
  const synthPacingDom = document.getElementById('beta-synth-pacing');
  if (synthPacingDom) currentSettings.synthCaptionPacing = parseFloat(synthPacingDom.value) || 3.0;
  const synthLangDom = document.getElementById('beta-synth-language');
  if (synthLangDom) currentSettings.synthLanguage = synthLangDom.value;
  const synthAutoLoopDom = document.getElementById('beta-synth-auto-loop');
  if (synthAutoLoopDom) currentSettings.synthAutoLoop = synthAutoLoopDom.checked;
  const synthAutoIntervalDom = document.getElementById('beta-synth-auto-interval');
  if (synthAutoIntervalDom) currentSettings.synthAutoInterval = parseInt(synthAutoIntervalDom.value, 10) || 15;
  const synthTTSEnableDom = document.getElementById('beta-synth-tts-enable');
  if (synthTTSEnableDom) currentSettings.synthTTSEnabled = synthTTSEnableDom.checked;
  const synthTTSPitchDom = document.getElementById('beta-synth-tts-pitch');
  if (synthTTSPitchDom) currentSettings.synthTTSPitch = parseFloat(synthTTSPitchDom.value) || 1.15;
  const synthTTSRateDom = document.getElementById('beta-synth-tts-rate');
  if (synthTTSRateDom) currentSettings.synthTTSRate = parseFloat(synthTTSRateDom.value) || 1.05;
  const synthTTSVolDom = document.getElementById('beta-synth-tts-volume');
  if (synthTTSVolDom) currentSettings.synthTTSVolume = (parseFloat(synthTTSVolDom.value) || 100) / 100.0;

  soundManager.syncAtmosphere(currentSettings);

  if (enablePhysicsCheck) currentSettings.enablePhysics = enablePhysicsCheck.checked;
  if (physicsFloorCheck) currentSettings.physicsFloor = physicsFloorCheck.checked;
  if (physicsGravitySlider) currentSettings.physicsGravity = parseFloat(physicsGravitySlider.value);
  if (physicsElasticitySlider) currentSettings.physicsElasticity = parseFloat(physicsElasticitySlider.value);

  const showXYZCheck = document.getElementById('show-xyz-coords');
  const showGridCheck = document.getElementById('show-ground-grid');
  const enableFpsCheck = document.getElementById('enable-fps-mode');
  if (showXYZCheck) currentSettings.showXYZCoords = showXYZCheck.checked;
  if (showGridCheck) currentSettings.showGroundGrid = showGridCheck.checked;
  if (enableFpsCheck) {
    const fpsWasEnabled = currentSettings.enableFPSMode;
    currentSettings.enableFPSMode = enableFpsCheck.checked;
    if (fpsWasEnabled && !currentSettings.enableFPSMode && camera) {
      camera.position.set(0, 0, 5.5);
      camera.rotation.set(0, 0, 0);
      if (state) {
        state.cameraPitch = 0;
        state.cameraYaw = 0;
        state.fpsKeyW = state.fpsKeyA = state.fpsKeyS = state.fpsKeyD = state.fpsKeySpace = state.fpsKeyShift = false;
      }
    }
  }

  if (updateXYZVisibility) updateXYZVisibility();

  if (physicsEngine) {
    physicsEngine.configure({
      enabled: currentSettings.enablePhysics,
      gravity: currentSettings.physicsGravity,
      restitution: currentSettings.physicsElasticity,
      enableFloor: currentSettings.physicsFloor
    });
    if (!currentSettings.enablePhysics) {
      physicsEngine.reset();
    }
  }

  const oldModel = currentSettings.activeModel;
  const newModel = modelSelect ? modelSelect.value : 'procedural';
  const modelChanged = (oldModel !== newModel);
  currentSettings.activeModel = newModel;

  if (animSelect) currentSettings.activeAnimation = animSelect.value;
  if (fontScaleSlider) currentSettings.fontSizeScale = parseFloat(fontScaleSlider.value);

  const fontSelectDom = deps.mascotChatFontSelect || document.getElementById('mascot-chat-font');
  const fontCustomDom = deps.mascotChatFontCustom || document.getElementById('mascot-chat-font-custom');
  const fontSysSelectDom = deps.mascotChatFontSystemSelect || document.getElementById('mascot-chat-font-system');
  const fontSysCustomDom = deps.mascotChatFontSystemCustom || document.getElementById('mascot-chat-font-system-custom');

  const activeFontSelect = fontSelectDom || fontSysSelectDom;
  const activeFontCustom = (activeFontSelect === fontSelectDom) ? fontCustomDom : (fontSysCustomDom || fontCustomDom);

  if (activeFontSelect) {
    let fontVal = activeFontSelect.value;
    if (fontVal === 'custom' && activeFontCustom && activeFontCustom.value.trim()) {
      fontVal = activeFontCustom.value.trim();
    }
    currentSettings.mascotChatFont = fontVal || 'inherit';
  }

  const fontSizeDom = deps.mascotChatFontSizeSlider || document.getElementById('mascot-chat-font-size') || deps.mascotChatFontSizeSystemSlider || document.getElementById('mascot-chat-font-size-system');
  if (fontSizeDom) {
    currentSettings.mascotChatFontSize = parseInt(fontSizeDom.value, 10) || 14;
  }

  if (deps.directChatUI && typeof deps.directChatUI.applyFont === 'function') {
    deps.directChatUI.applyFont(currentSettings.mascotChatFont, currentSettings.mascotChatFontSize);
  } else if (typeof window !== 'undefined' && window.directChatUI && typeof window.directChatUI.applyFont === 'function') {
    window.directChatUI.applyFont(currentSettings.mascotChatFont, currentSettings.mascotChatFontSize);
  }

  const voicePresetDom = deps.mascotVoicePresetSelect || document.getElementById('mascot-voice-preset');
  if (voicePresetDom) {
    currentSettings.mascotVoicePreset = voicePresetDom.value || 'female_anime';
  }

  const voiceSelectDom = deps.mascotVoiceSelect || document.getElementById('mascot-voice-select');
  if (voiceSelectDom) {
    currentSettings.mascotVoiceName = voiceSelectDom.value || 'auto';
  }

  const voicePitchDom = deps.mascotVoicePitchSlider || document.getElementById('mascot-voice-pitch');
  if (voicePitchDom) {
    currentSettings.mascotVoicePitch = parseFloat(voicePitchDom.value) || 1.25;
  }

  const voiceRateDom = deps.mascotVoiceRateSlider || document.getElementById('mascot-voice-rate');
  if (voiceRateDom) {
    currentSettings.mascotVoiceRate = parseFloat(voiceRateDom.value) || 1.0;
  }

  if (saveSettingsFile) saveSettingsFile();

  const characterGroup = state && state.getCharacterGroup ? state.getCharacterGroup() : null;

  if (modelChanged) {
    if (state) {
      if (state.mixer) {
        state.mixer.stopAllAction();
        state.mixer = null;
      }
      state.idleAction = null;
      state.reactAction = null;
      state.loadedAnimations = [];
      state.availableAnimations = [];
      state.customModelLoaded = false;
    }
    if (characterGroup && deps.scene) {
      deps.scene.remove(characterGroup);
    }

    if (newModel === 'procedural') {
      if (fallbackToProcedural) fallbackToProcedural();
    } else if (newModel === 'humanoid') {
      if (deps.loadHumanoidModel) deps.loadHumanoidModel();
    } else {
      const assetsDir = getAssetsPath();
      const fullPath = path.join(assetsDir, newModel);
      console.log('Swapping active mascot model to:', fullPath);
      if (loadCustomModel) loadCustomModel(fullPath);
    }
  } else {
    if (applySelectedAnimation) applySelectedAnimation();
  }

  if (updateGearPosition) updateGearPosition();

  if (camera && renderer) {
    camera.aspect = currentSettings.width / currentSettings.height;
    camera.updateProjectionMatrix();
    renderer.setSize(currentSettings.width, currentSettings.height);
  }

  if (characterGroup) {
    characterGroup.scale.set(currentSettings.scale, currentSettings.scale, currentSettings.scale);

    if (state && state.customModelLoaded) {
      const innerModel = characterGroup.children[0];
      if (innerModel) {
        const box = new THREE.Box3().setFromObject(innerModel);
        const size = box.getSize(new THREE.Vector3());
        const padding = 1.35;
        const aspect = camera.aspect || (currentSettings.width / currentSettings.height) || 1.0;
        const fovRad = (camera.fov * Math.PI) / 360;
        const requiredDistanceY = (size.y * currentSettings.scale * padding) / (2 * Math.tan(fovRad));
        const requiredDistanceX = (size.x * currentSettings.scale * padding) / (2 * Math.tan(fovRad) * aspect);
        const zPos = Math.max(requiredDistanceY, requiredDistanceX, 2.5) + ((size.z * currentSettings.scale) / 2);
        camera.position.set(0, 0, zPos);
        camera.lookAt(0, 0, 0);
      }
    }
  }

  if (ipcRenderer) {
    ipcRenderer.send('resize-window', { width: currentSettings.width, height: currentSettings.height });
  }

  if (closeSettings) closeSettings();
}
