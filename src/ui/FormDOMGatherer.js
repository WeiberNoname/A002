/**
 * Settings Form DOM Gatherer Module (<70 lines)
 * Queries all slider, checkbox, and dropdown DOM elements and builds save settings callbacks.
 */

export function gatherSettingsFormElements() {
  return {
    langSelect: document.getElementById('lang-select'),
    widthSlider: document.getElementById('win-width'),
    heightSlider: document.getElementById('win-height'),
    scaleSlider: document.getElementById('model-scale'),
    bobbingCheck: document.getElementById('model-bobbing'),
    spinXCheck: document.getElementById('spin-x'),
    spinYCheck: document.getElementById('spin-y'),
    spinZCheck: document.getElementById('spin-z'),
    speedXSlider: document.getElementById('speed-x'),
    speedYSlider: document.getElementById('speed-y'),
    speedZSlider: document.getElementById('speed-z'),
    targetFpsSlider: document.getElementById('target-fps'),
    numTargetFps: document.getElementById('num-target-fps'),
    gpuOptimizeCheck: document.getElementById('gpu-optimize'),
    gpuLowPowerCheck: document.getElementById('gpu-low-power'),
    idleFpsSaverCheck: document.getElementById('idle-fps-saver'),
    dynamicBatterySaverCheck: document.getElementById('dynamic-battery-saver'),
    mouseOptimizeCheck: document.getElementById('mouse-optimize'),
    settingsLeftCheck: document.getElementById('settings-left'),
    lockPositionCheck: document.getElementById('lock-position'),
    viewOnlyCheck: document.getElementById('view-only'),
    enablePhysicsCheck: document.getElementById('enable-physics'),
    physicsFloorCheck: document.getElementById('physics-floor'),
    physicsGravitySlider: document.getElementById('physics-gravity'),
    physicsElasticitySlider: document.getElementById('physics-elasticity'),
    modelSelect: document.getElementById('model-select'),
    animSelect: document.getElementById('anim-select'),
    fontScaleSlider: document.getElementById('font-scale'),
    mascotChatFontSelect: document.getElementById('mascot-chat-font'),
    mascotChatFontCustom: document.getElementById('mascot-chat-font-custom'),
    mascotChatFontSizeSlider: document.getElementById('mascot-chat-font-size'),
    mascotChatFontSystemSelect: document.getElementById('mascot-chat-font-system'),
    mascotChatFontSystemCustom: document.getElementById('mascot-chat-font-system-custom'),
    mascotChatFontSizeSystemSlider: document.getElementById('mascot-chat-font-size-system'),
    mascotVoicePresetSelect: document.getElementById('mascot-voice-preset'),
    mascotVoiceSelect: document.getElementById('mascot-voice-select'),
    mascotVoicePitchSlider: document.getElementById('mascot-voice-pitch'),
    mascotVoiceRateSlider: document.getElementById('mascot-voice-rate')
  };
}

export function buildSaveSettingsCallback(deps) {
  const { handleSaveSettingsUtil, context } = deps;
  return async (closeSettings) => {
    const elements = gatherSettingsFormElements();
    await handleSaveSettingsUtil({
      ...context,
      ...elements,
      closeSettings
    });
  };
}
