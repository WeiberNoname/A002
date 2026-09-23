/**
 * Model & Preview Delegates Module (<70 lines)
 * Encapsulates model scanner, GLTF loader, and background preview generator context delegation wrappers.
 */

export function createModelDelegates(deps) {
  const {
    fs,
    getAssetsPath,
    getModelLoaderCtx,
    getPreviewGeneratorCtx,
    scanForModelsUtil,
    detectAndLoadAssetUtil,
    fallbackToProceduralUtil,
    loadCustomModelUtil,
    applySelectedAnimationUtil,
    generateModelPreviewUtil,
    populateModelDropdownUtil,
    startBackgroundPreviewGeneratorUtil,
    generateMascotPreviewInBackgroundUtil,
    forceRefreshAllPreviewsUtil,
    state
  } = deps;

  return {
    scanForModels: () => {
      state.discoveredModels = scanForModelsUtil(fs, getAssetsPath);
    },
    detectAndLoadAsset: () => {
      detectAndLoadAssetUtil(getModelLoaderCtx());
    },
    fallbackToProcedural: () => {
      fallbackToProceduralUtil(getModelLoaderCtx());
    },
    loadCustomModel: (filePath) => {
      loadCustomModelUtil(getModelLoaderCtx(), filePath);
    },
    applySelectedAnimation: () => {
      applySelectedAnimationUtil(getModelLoaderCtx());
    },
    generateModelPreview: (modelKey) => {
      generateModelPreviewUtil(getPreviewGeneratorCtx(), modelKey);
    },
    populateModelDropdown: () => {
      populateModelDropdownUtil(getPreviewGeneratorCtx());
    },
    startBackgroundPreviewGenerator: () => {
      startBackgroundPreviewGeneratorUtil(getPreviewGeneratorCtx());
    },
    generateMascotPreviewInBackground: (modelKey) => {
      generateMascotPreviewInBackgroundUtil(getPreviewGeneratorCtx(), modelKey);
    },
    forceRefreshAllPreviews: () => {
      forceRefreshAllPreviewsUtil(getPreviewGeneratorCtx());
    }
  };
}
