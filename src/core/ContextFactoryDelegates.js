/**
 * Context Factory Delegates Module (<85 lines)
 * Encapsulates building interaction state accessors and model context proxies.
 */

export function buildInteractionStateAccessors(gettersSetters) {
  const {
    isSettingsOpen, isMouseOverCharacter, isMouseOverUI, isDragging,
    dragStartedOnMascot, isDraggingGear, dragStartScreenX, dragStartScreenY,
    dragMoveDistance, isNavigating, navType, navStartMouseX, navStartMouseY,
    navStartRotationX, navStartRotationY, navStartTranslationX, navStartTranslationY,
    navStartTranslationZ, altKeyHeld, shiftKeyHeld, ctrlKeyHeld, keyDHeld,
    isPhysicsDragging, cameraPitch, cameraYaw, fpsKeyW, fpsKeyA, fpsKeyS,
    fpsKeyD, fpsKeySpace, fpsKeyShift
  } = gettersSetters;

  return {
    getIsSettingsOpen: isSettingsOpen.get, setIsSettingsOpen: isSettingsOpen.set,
    getIsMouseOverCharacter: isMouseOverCharacter.get, setIsMouseOverCharacter: isMouseOverCharacter.set,
    getIsMouseOverUI: isMouseOverUI.get, setIsMouseOverUI: isMouseOverUI.set,
    getIsDragging: isDragging.get, setIsDragging: isDragging.set,
    getDragStartedOnMascot: dragStartedOnMascot.get, setDragStartedOnMascot: dragStartedOnMascot.set,
    getIsDraggingGear: isDraggingGear.get, setIsDraggingGear: isDraggingGear.set,
    getDragStartScreenX: dragStartScreenX.get, setDragStartScreenX: dragStartScreenX.set,
    getDragStartScreenY: dragStartScreenY.get, setDragStartScreenY: dragStartScreenY.set,
    getDragMoveDistance: dragMoveDistance.get, setDragMoveDistance: dragMoveDistance.set,
    getIsNavigating: isNavigating.get, setIsNavigating: isNavigating.set,
    getNavType: navType.get, setNavType: navType.set,
    getNavStartMouseX: navStartMouseX.get, setNavStartMouseX: navStartMouseX.set,
    getNavStartMouseY: navStartMouseY.get, setNavStartMouseY: navStartMouseY.set,
    getNavStartRotationX: navStartRotationX.get, setNavStartRotationX: navStartRotationX.set,
    getNavStartRotationY: navStartRotationY.get, setNavStartRotationY: navStartRotationY.set,
    getNavStartTranslationX: navStartTranslationX.get, setNavStartTranslationX: navStartTranslationX.set,
    getNavStartTranslationY: navStartTranslationY.get, setNavStartTranslationY: navStartTranslationY.set,
    getNavStartTranslationZ: navStartTranslationZ.get, setNavStartTranslationZ: navStartTranslationZ.set,
    getAltKeyHeld: altKeyHeld.get, setAltKeyHeld: altKeyHeld.set,
    getShiftKeyHeld: shiftKeyHeld.get, setShiftKeyHeld: shiftKeyHeld.set,
    getCtrlKeyHeld: ctrlKeyHeld.get, setCtrlKeyHeld: ctrlKeyHeld.set,
    getKeyDHeld: keyDHeld.get, setKeyDHeld: keyDHeld.set,
    getIsPhysicsDragging: isPhysicsDragging.get, setIsPhysicsDragging: isPhysicsDragging.set,
    getCameraPitch: cameraPitch.get, setCameraPitch: cameraPitch.set,
    getCameraYaw: cameraYaw.get, setCameraYaw: cameraYaw.set,
    getFpsKeyW: fpsKeyW.get, setFpsKeyW: fpsKeyW.set,
    getFpsKeyA: fpsKeyA.get, setFpsKeyA: fpsKeyA.set,
    getFpsKeyS: fpsKeyS.get, setFpsKeyS: fpsKeyS.set,
    getFpsKeyD: fpsKeyD.get, setFpsKeyD: fpsKeyD.set,
    getFpsKeySpace: fpsKeySpace.get, setFpsKeySpace: fpsKeySpace.set,
    getFpsKeyShift: fpsKeyShift.get, setFpsKeyShift: fpsKeyShift.set
  };
}
