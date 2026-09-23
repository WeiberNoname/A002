/**
 * Model & Preview Context Factory Module (<80 lines)
 * Constructs standard dependency injection context objects for ModelLoader and PreviewGenerator.
 */

export function getModelLoaderCtx(deps) {
  const {
    THREE,
    GLTFLoader,
    scene,
    camera,
    renderer,
    fs,
    path,
    pathToFileURL,
    currentSettings,
    ipcRenderer,
    getAssetsPath,
    state,
    callbacks
  } = deps;

  return {
    THREE,
    GLTFLoader,
    scene,
    camera,
    renderer,
    fs,
    path,
    pathToFileURL,
    currentSettings,
    ipcRenderer,
    getAssetsPath,
    state,
    callbacks
  };
}

export function getPreviewGeneratorCtx(deps) {
  const {
    THREE,
    GLTFLoader,
    scene,
    camera,
    renderer,
    fs,
    path,
    pathToFileURL,
    getAssetsPath,
    currentSettings,
    ipcRenderer,
    t,
    state,
    callbacks
  } = deps;

  return {
    THREE,
    GLTFLoader,
    scene,
    camera,
    renderer,
    fs,
    path,
    pathToFileURL,
    getAssetsPath,
    currentSettings,
    ipcRenderer,
    t,
    state,
    callbacks
  };
}
