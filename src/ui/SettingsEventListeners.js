/**
 * Settings UI Event Listeners Module (<180 lines)
 * Encapsulates DOM element queries, live slider value label updates, studio preset triggers,
 * gear/close button hover states, and settings header window drag listeners.
 */

import { setupDiagnosticsUI } from './SettingsDiagnosticsUI.js';
import { setupSettingsPanelResize } from './SettingsPanelResizeHandler.js';
import { soundManager } from '../core/SoundManager.js';
import { speechSynthesisService } from '../services/SpeechSynthesisService.js';

export function setupSettingsUI(deps) {
  const {
    currentSettings,
    ipcRenderer,
    t,
    showSpeechBubble,
    updateStageLighting,
    saveSettingsFile,
    syncSlidersUI,
    populateModelDropdown,
    populateAnimationDropdown,
    forceRefreshAllPreviews,
    setupStudioTabs,
    handleSaveSettings,
    resetCameraAndPosition,
    state
  } = deps;

  const gearBtn = document.getElementById('settings-btn');
  const panel = document.getElementById('settings-panel');
  const langSelect = document.getElementById('lang-select');
  const widthSlider = document.getElementById('win-width');
  const heightSlider = document.getElementById('win-height');
  const scaleSlider = document.getElementById('model-scale');
  const bobbingCheck = document.getElementById('model-bobbing');

  const spinXCheck = document.getElementById('spin-x');
  const spinYCheck = document.getElementById('spin-y');
  const spinZCheck = document.getElementById('spin-z');

  const speedXSlider = document.getElementById('speed-x');
  const speedYSlider = document.getElementById('speed-y');
  const speedZSlider = document.getElementById('speed-z');
  const targetFpsSlider = document.getElementById('target-fps');
  const numTargetFps = document.getElementById('num-target-fps');
  const valTargetFps = document.getElementById('val-target-fps');

  const gpuOptimizeCheck = document.getElementById('gpu-optimize');
  const mouseOptimizeCheck = document.getElementById('mouse-optimize');
  const settingsLeftCheck = document.getElementById('settings-left');
  const lockPositionCheck = document.getElementById('lock-position');
  const viewOnlyCheck = document.getElementById('view-only');
  const enablePhysicsCheck = document.getElementById('enable-physics');
  const physicsFloorCheck = document.getElementById('physics-floor');
  const physicsGravitySlider = document.getElementById('physics-gravity');
  const physicsElasticitySlider = document.getElementById('physics-elasticity');
  const valPhysicsGravity = document.getElementById('val-physics-gravity');
  const valPhysicsElasticity = document.getElementById('val-physics-elasticity');
  const modelSelect = document.getElementById('model-select');
  const animSelect = document.getElementById('anim-select');

  const valWidth = document.getElementById('val-width');
  const valHeight = document.getElementById('val-height');
  const valScale = document.getElementById('val-scale');

  const valSpeedX = document.getElementById('val-speed-x');
  const valSpeedY = document.getElementById('val-speed-y');
  const valSpeedZ = document.getElementById('val-speed-z');

  const fontScaleSlider = document.getElementById('font-scale');
  const valFontScale = document.getElementById('val-font-scale');

  if (setupStudioTabs) setupStudioTabs();

  const refreshPreviewsBtn = document.getElementById('refresh-previews-btn');
  if (refreshPreviewsBtn) {
    refreshPreviewsBtn.addEventListener('click', () => {
      if (forceRefreshAllPreviews) forceRefreshAllPreviews();
    });
  }

  const closeBtn = document.getElementById('app-close-btn');
  const updateHoverState = (overUI) => {
    state.isMouseOverUI = overUI;
    if (deps.updateIgnoreMouseState) deps.updateIgnoreMouseState();
  };

  if (gearBtn) {
    gearBtn.style.display = 'flex';
    gearBtn.addEventListener('mouseenter', () => updateHoverState(true));
    gearBtn.addEventListener('mouseleave', () => updateHoverState(false));
  }

  if (closeBtn) {
    closeBtn.style.display = 'flex';
    closeBtn.addEventListener('mouseenter', () => updateHoverState(true));
    closeBtn.addEventListener('mouseleave', () => updateHoverState(false));
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ipcRenderer.send('close-app');
    });
  }

  const detectEdge = setupSettingsPanelResize({
    panel,
    currentSettings,
    ipcRenderer,
    saveSettingsFile,
    widthSlider,
    heightSlider,
    valWidth,
    valHeight,
    camera: deps.camera,
    renderer: deps.renderer,
    state
  });

  const settingsHeader = document.getElementById('settings-header');
  if (settingsHeader) {
    settingsHeader.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || currentSettings.lockPosition || (state && state.isResizingPanel)) return;
      if (detectEdge && detectEdge(e)) return;
      state.isDragging = true;
      state.dragStartScreenX = e.screenX;
      state.dragStartScreenY = e.screenY;
      state.dragMoveDistance = 0;
      settingsHeader.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
      if (deps.updateIgnoreMouseState) deps.updateIgnoreMouseState();
    });
  }

  if (widthSlider) widthSlider.max = window.screen.width;
  if (heightSlider) heightSlider.max = window.screen.height;

  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const newModel = modelSelect.value;
      currentSettings.activeModel = newModel;
      currentSettings.activeAnimation = 'default';
      if (saveSettingsFile) saveSettingsFile();

      if (newModel === 'procedural') {
        if (deps.fallbackToProcedural) deps.fallbackToProcedural();
      } else if (newModel === 'humanoid') {
        if (deps.loadHumanoidModel) deps.loadHumanoidModel();
      } else if (deps.loadCustomModel) {
        const regAsset = window.__assetRegistryManager ? window.__assetRegistryManager.getAssets('model').find(a => a.name === newModel || a.id === newModel) : null;
        if (regAsset && (regAsset.objectUrl || regAsset.file)) {
          deps.loadCustomModel(regAsset.objectUrl);
        } else if (deps.getAssetsPath && deps.path) {
          const fullPath = deps.path.join(deps.getAssetsPath(), newModel);
          deps.loadCustomModel(fullPath);
        }
      }
      if (populateAnimationDropdown) populateAnimationDropdown();
    });
  }

  if (animSelect) {
    animSelect.addEventListener('change', () => {
      currentSettings.activeAnimation = animSelect.value;
      if (deps.applySelectedAnimation) deps.applySelectedAnimation();
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  const bindSliderInput = (elem, valElem, format = (v) => v) => {
    if (elem && valElem) elem.addEventListener('input', () => { valElem.innerText = format(elem.value); });
  };
  bindSliderInput(widthSlider, valWidth);
  bindSliderInput(heightSlider, valHeight);
  bindSliderInput(scaleSlider, valScale, (v) => parseFloat(v).toFixed(2));
  bindSliderInput(speedXSlider, valSpeedX, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(speedYSlider, valSpeedY, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(speedZSlider, valSpeedZ, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(physicsGravitySlider, valPhysicsGravity, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(physicsElasticitySlider, valPhysicsElasticity, (v) => parseFloat(v).toFixed(2));

  if (targetFpsSlider) {
    targetFpsSlider.addEventListener('input', () => {
      const val = parseInt(targetFpsSlider.value, 10);
      if (valTargetFps) valTargetFps.innerText = val;
      if (numTargetFps) numTargetFps.value = val;
      currentSettings.targetFps = val;
    });
  }

  if (numTargetFps) {
    numTargetFps.addEventListener('input', () => {
      let val = parseInt(numTargetFps.value, 10);
      if (isNaN(val)) return;
      val = Math.max(15, Math.min(240, val));
      if (valTargetFps) valTargetFps.innerText = val;
      if (targetFpsSlider) targetFpsSlider.value = val;
      currentSettings.targetFps = val;
    });
  }

  if (fontScaleSlider) {
    fontScaleSlider.addEventListener('input', () => {
      const scale = parseFloat(fontScaleSlider.value);
      if (!isNaN(scale)) {
        if (valFontScale) valFontScale.innerText = scale.toFixed(2);
        if (panel) panel.style.setProperty('--panel-font-scale', scale);
      }
    });
  }

  const mascotChatFontSelect = document.getElementById('mascot-chat-font');
  const mascotChatFontCustom = document.getElementById('mascot-chat-font-custom');
  const customFontContainer = document.getElementById('mascot-chat-font-custom-container');

  const mascotChatFontSysSelect = document.getElementById('mascot-chat-font-system');
  const mascotChatFontSysCustom = document.getElementById('mascot-chat-font-system-custom');
  const customFontSysContainer = document.getElementById('mascot-chat-font-system-custom-container');

  const updateChatFontLive = (fontVal, sourceSelect) => {
    currentSettings.mascotChatFont = fontVal || 'inherit';
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--mascot-chat-font', currentSettings.mascotChatFont);
    }
    if (deps.directChatUI && typeof deps.directChatUI.applyFont === 'function') {
      deps.directChatUI.applyFont(currentSettings.mascotChatFont, currentSettings.mascotChatFontSize);
    } else if (typeof window !== 'undefined' && window.directChatUI && typeof window.directChatUI.applyFont === 'function') {
      window.directChatUI.applyFont(currentSettings.mascotChatFont, currentSettings.mascotChatFontSize);
    }
    const previewBox = document.getElementById('mascot-font-preview-box');
    if (previewBox) {
      const effectiveFont = (currentSettings.mascotChatFont && currentSettings.mascotChatFont !== 'inherit') ? currentSettings.mascotChatFont : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      previewBox.style.setProperty('font-family', effectiveFont, 'important');
      previewBox.style.setProperty('font-size', `${currentSettings.mascotChatFontSize || 14}px`, 'important');
    }

    const otherSelect = (sourceSelect === mascotChatFontSelect) ? mascotChatFontSysSelect : mascotChatFontSelect;
    const otherCustom = (sourceSelect === mascotChatFontSelect) ? mascotChatFontSysCustom : mascotChatFontCustom;
    const otherContainer = (sourceSelect === mascotChatFontSelect) ? customFontSysContainer : customFontContainer;

    if (otherSelect && sourceSelect) {
      otherSelect.value = sourceSelect.value;
      if (otherContainer) otherContainer.style.display = (sourceSelect.value === 'custom') ? 'flex' : 'none';
      if (otherCustom && sourceSelect.value === 'custom') {
        const srcCustom = (sourceSelect === mascotChatFontSelect) ? mascotChatFontCustom : mascotChatFontSysCustom;
        if (srcCustom) otherCustom.value = srcCustom.value;
      }
    }
  };

  const wireFontControlListeners = (selectEl, customEl, containerEl) => {
    if (selectEl) {
      selectEl.addEventListener('change', () => {
        const val = selectEl.value;
        if (val === 'custom') {
          if (containerEl) containerEl.style.display = 'flex';
          if (customEl && customEl.value.trim()) {
            updateChatFontLive(customEl.value.trim(), selectEl);
          }
        } else {
          if (containerEl) containerEl.style.display = 'none';
          updateChatFontLive(val, selectEl);
        }
      });
    }
    if (customEl) {
      customEl.addEventListener('input', () => {
        if (selectEl && selectEl.value === 'custom') {
          updateChatFontLive(customEl.value.trim(), selectEl);
        }
      });
    }
  };

  wireFontControlListeners(mascotChatFontSelect, mascotChatFontCustom, customFontContainer);
  wireFontControlListeners(mascotChatFontSysSelect, mascotChatFontSysCustom, customFontSysContainer);

  // Live Mascot Chat Font Size Controls
  const fontSizeInput = document.getElementById('mascot-chat-font-size');
  const fontSizeSysInput = document.getElementById('mascot-chat-font-size-system');

  const updateChatFontSizeLive = (newSize, sourceInput) => {
    const sizeVal = Math.max(10, Math.min(28, parseInt(newSize, 10) || 14));
    currentSettings.mascotChatFontSize = sizeVal;

    const otherInput = (sourceInput === fontSizeInput) ? fontSizeSysInput : fontSizeInput;
    if (otherInput) otherInput.value = sizeVal;

    if (deps.directChatUI && typeof deps.directChatUI.applyFont === 'function') {
      deps.directChatUI.applyFont(currentSettings.mascotChatFont, currentSettings.mascotChatFontSize);
    } else if (typeof window !== 'undefined' && window.directChatUI && typeof window.directChatUI.applyFont === 'function') {
      window.directChatUI.applyFont(currentSettings.mascotChatFont, currentSettings.mascotChatFontSize);
    }

    const previewBox = document.getElementById('mascot-font-preview-box');
    if (previewBox) {
      previewBox.style.setProperty('font-size', `${sizeVal}px`, 'important');
    }
  };

  if (fontSizeInput) {
    fontSizeInput.addEventListener('input', () => updateChatFontSizeLive(fontSizeInput.value, fontSizeInput));
  }
  if (fontSizeSysInput) {
    fontSizeSysInput.addEventListener('input', () => updateChatFontSizeLive(fontSizeSysInput.value, fontSizeSysInput));
  }

  const btnGotoChatFont = document.getElementById('btn-goto-chat-font');
  if (btnGotoChatFont) {
    btnGotoChatFont.addEventListener('click', () => {
      const studioTabBtn = document.querySelector('.studio-tab-btn[data-tab="tab-display"]');
      if (studioTabBtn) studioTabBtn.click();
      const targetCard = document.getElementById('mascot-mail-chat-card');
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.7)';
        setTimeout(() => { targetCard.style.boxShadow = ''; }, 2500);
      }
    });
  }

  const btnTestChatFont = document.getElementById('btn-test-chat-font');
  if (btnTestChatFont) {
    btnTestChatFont.addEventListener('click', () => {
      const font = currentSettings.mascotChatFont || 'inherit';
      const size = currentSettings.mascotChatFontSize || 14;
      const sampleText = `💌 Active Chat Font: ${font === 'inherit' ? 'System Default' : font} (${size}px)! Greetings from your companion!`;
      if (typeof window !== 'undefined' && window.directChatUI && typeof window.directChatUI.showSpeechBubble === 'function') {
        window.directChatUI.showSpeechBubble(sampleText);
      } else if (deps.directChatUI && typeof deps.directChatUI.showSpeechBubble === 'function') {
        deps.directChatUI.showSpeechBubble(sampleText);
      } else if (showSpeechBubble) {
        showSpeechBubble(sampleText);
      }
    });
  }

  // Mascot Voice Controls Event Listeners
  const voicePresetSelect = document.getElementById('mascot-voice-preset');
  const voiceSelect = document.getElementById('mascot-voice-select');
  const voicePitchSlider = document.getElementById('mascot-voice-pitch');
  const voicePitchVal = document.getElementById('mascot-voice-pitch-val');
  const voiceRateSlider = document.getElementById('mascot-voice-rate');
  const voiceRateVal = document.getElementById('mascot-voice-rate-val');
  const btnTestMascotVoice = document.getElementById('btn-test-mascot-voice');

  if (voicePresetSelect) {
    voicePresetSelect.addEventListener('change', () => {
      const preset = voicePresetSelect.value;
      currentSettings.mascotVoicePreset = preset;
      if (preset === 'female_anime') {
        currentSettings.mascotVoicePitch = 1.25;
        currentSettings.mascotVoiceRate = 1.0;
        currentSettings.mascotVoiceName = 'auto';
      } else if (preset === 'female_natural') {
        currentSettings.mascotVoicePitch = 1.0;
        currentSettings.mascotVoiceRate = 1.0;
        currentSettings.mascotVoiceName = 'auto';
      } else if (preset === 'cute_pet') {
        currentSettings.mascotVoicePitch = 1.45;
        currentSettings.mascotVoiceRate = 1.1;
        currentSettings.mascotVoiceName = 'auto';
      } else if (preset === 'male_gentle') {
        currentSettings.mascotVoicePitch = 0.95;
        currentSettings.mascotVoiceRate = 1.0;
        currentSettings.mascotVoiceName = 'auto';
      } else if (preset === 'cyber_robot') {
        currentSettings.mascotVoicePitch = 0.75;
        currentSettings.mascotVoiceRate = 0.9;
        currentSettings.mascotVoiceName = 'auto';
      }
      if (voicePitchSlider) {
        voicePitchSlider.value = currentSettings.mascotVoicePitch;
        if (voicePitchVal) voicePitchVal.textContent = `${parseFloat(currentSettings.mascotVoicePitch).toFixed(2)}x`;
      }
      if (voiceRateSlider) {
        voiceRateSlider.value = currentSettings.mascotVoiceRate;
        if (voiceRateVal) voiceRateVal.textContent = `${parseFloat(currentSettings.mascotVoiceRate).toFixed(2)}x`;
      }
      if (voiceSelect) {
        voiceSelect.value = currentSettings.mascotVoiceName;
      }
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
      currentSettings.mascotVoiceName = voiceSelect.value;
      if (voicePresetSelect && voiceSelect.value !== 'auto') {
        voicePresetSelect.value = 'custom';
        currentSettings.mascotVoicePreset = 'custom';
      }
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (voicePitchSlider) {
    voicePitchSlider.addEventListener('input', () => {
      const p = parseFloat(voicePitchSlider.value) || 1.25;
      currentSettings.mascotVoicePitch = p;
      if (voicePitchVal) voicePitchVal.textContent = `${p.toFixed(2)}x`;
      if (voicePresetSelect && voicePresetSelect.value !== 'custom') {
        voicePresetSelect.value = 'custom';
        currentSettings.mascotVoicePreset = 'custom';
      }
    });
    voicePitchSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (voiceRateSlider) {
    voiceRateSlider.addEventListener('input', () => {
      const r = parseFloat(voiceRateSlider.value) || 1.0;
      currentSettings.mascotVoiceRate = r;
      if (voiceRateVal) voiceRateVal.textContent = `${r.toFixed(2)}x`;
      if (voicePresetSelect && voicePresetSelect.value !== 'custom') {
        voicePresetSelect.value = 'custom';
        currentSettings.mascotVoicePreset = 'custom';
      }
    });
    voiceRateSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (btnTestMascotVoice) {
    btnTestMascotVoice.addEventListener('click', () => {
      const text = "Hello! I'm your desktop companion, how are you feeling today?";
      const svc = deps.speechSynthesisService || speechSynthesisService;
      if (svc && typeof svc.speak === 'function') {
        svc.speak(text, {
          pitch: currentSettings.mascotVoicePitch,
          rate: currentSettings.mascotVoiceRate,
          voiceName: currentSettings.mascotVoiceName,
          preset: currentSettings.mascotVoicePreset
        });
      }
    });
  }

  const closeSettings = () => {
    state.isSettingsOpen = false;
    if (panel) panel.classList.add('hidden');
    soundManager.syncAtmosphere(currentSettings);
    ipcRenderer.send('set-ignore-mouse', true);
  };

  if (gearBtn) {
    gearBtn.addEventListener('click', () => {
      if (state.dragMoveDistance >= 8) return;
      if (state.isSettingsOpen) {
        if (syncSlidersUI) syncSlidersUI();
        closeSettings();
      } else {
        state.isSettingsOpen = true;
        if (populateModelDropdown) populateModelDropdown();
        if (syncSlidersUI) syncSlidersUI();
        if (panel) panel.classList.remove('hidden');
        ipcRenderer.send('set-ignore-mouse', false);
      }
    });
  }

  const panelCloseBtn = document.getElementById('close-btn');
  if (panelCloseBtn) {
    panelCloseBtn.addEventListener('click', () => {
      if (syncSlidersUI) syncSlidersUI();
      closeSettings();
    });
  }

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (handleSaveSettings) await handleSaveSettings(closeSettings);
    });
  }

  const disableClickThrough = () => ipcRenderer.send('set-ignore-mouse', false);
  if (gearBtn) gearBtn.addEventListener('mouseenter', disableClickThrough);
  if (closeBtn) closeBtn.addEventListener('mouseenter', disableClickThrough);
  if (panel) panel.addEventListener('mouseenter', disableClickThrough);

  setupDiagnosticsUI({ ipcRenderer, showSpeechBubble, resetCameraAndPosition });
}
