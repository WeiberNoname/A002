/**
 * Interaction Delegates Module (<90 lines)
 * Encapsulates state proxy construction and setupInteraction delegation call.
 */

export function createInteractionDelegates(deps) {
  const {
    createInteractionStateProxy,
    setupInteractionUtil,
    THREE,
    physicsEngine,
    currentSettings,
    ipcRenderer,
    fs,
    path,
    state,
    stateAccessors,
    sceneAccessors,
    callbacks
  } = deps;

  return {
    setupInteraction: () => {
      const activeState = state || (createInteractionStateProxy && stateAccessors ? createInteractionStateProxy(stateAccessors) : {});

      setupInteractionUtil({
        THREE,
        scene: sceneAccessors.getScene(),
        camera: sceneAccessors.getCamera(),
        renderer: sceneAccessors.getRenderer(),
        getCharacterGroup: sceneAccessors.getCharacterGroup,
        getInnerModelGroup: sceneAccessors.getInnerModelGroup,
        getCollisionProxy: sceneAccessors.getCollisionProxy,
        physicsEngine,
        currentSettings,
        ipcRenderer,
        fs,
        path,
        state: activeState,
        callbacks
      });

      return activeState.updateIgnoreMouseState;
    }
  };
}
