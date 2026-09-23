/**
 * Settings UI Config Builder Module (<75 lines)
 * Encapsulates dependency injection bundle construction for handleSaveSettings.
 */

export function buildSaveSettingsConfig(deps) {
  const {
    currentSettings,
    changeLanguage,
    updateStageLighting,
    physicsEngine,
    saveSettingsFile,
    state,
    THREE,
    scene,
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
    populateModelDropdown
  } = deps;

  return {
    currentSettings,
    changeLanguage,
    updateStageLighting,
    physicsEngine,
    saveSettingsFile,
    state,
    THREE,
    scene,
    camera,
    renderer,
    path,
    getAssetsPath,
    ipcRenderer,
    fallbackToProcedural,
    loadHumanoidModel: deps.loadHumanoidModel,
    loadCustomModel,
    applySelectedAnimation,
    updateGearPosition,
    updateXYZVisibility,
    populateModelDropdown
  };
}
