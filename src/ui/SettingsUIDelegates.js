/**
 * Settings UI Delegates Module (<80 lines)
 * Encapsulates setupSettingsUI delegation call.
 */

export function createSettingsUIDelegates(deps) {
  const {
    setupSettingsUIUtil,
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
    setupStudioTabsUtil,
    handleSaveSettings,
    resetCameraAndPosition,
    updateIgnoreMouseState,
    applySelectedAnimation,
    fallbackToProcedural,
    loadCustomModel,
    getAssetsPath,
    path,
    stateAccessors
  } = deps;

  return {
    setupSettingsUI: () => {
      setupSettingsUIUtil({
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
        setupStudioTabs: setupStudioTabsUtil,
        handleSaveSettings,
        resetCameraAndPosition,
        updateIgnoreMouseState,
        applySelectedAnimation,
        fallbackToProcedural,
        loadHumanoidModel: deps.loadHumanoidModel,
        loadCustomModel,
        getAssetsPath,
        path,
        state: stateAccessors
      });
    }
  };
}
