/**
 * Lighting Manager
 * Manages standard 3-point scene illumination (ambient, key, fill, rim lights)
 * so 3D mascots are rendered with crisp, balanced lighting.
 */


/**
 * Updates stage studio light intensities proportionally.
 * @param {Object} ambientLight - THREE.AmbientLight instance.
 * @param {Object} keyLight - THREE.DirectionalLight instance.
 * @param {Object} fillLight - THREE.PointLight instance.
 * @param {Object} rimLight - THREE.DirectionalLight instance.
 * @param {Object} settings - Current application settings.
 */
export function updateStageLighting(ambientLight, keyLight, fillLight, rimLight, settings) {
  if (!ambientLight) return;

  const isStudioEnabled = settings ? settings.enableStudioLights !== false : true;
  const masterAmb = settings && typeof settings.ambientIntensity === 'number' ? settings.ambientIntensity : 0.7;

  if (!isStudioEnabled) {
    ambientLight.intensity = 0;
    if (keyLight) keyLight.intensity = 0;
    if (fillLight) fillLight.intensity = 0;
    if (rimLight) rimLight.intensity = 0;
  } else {
    const factor = masterAmb / 0.7;
    ambientLight.intensity = masterAmb;
    if (keyLight) keyLight.intensity = 1.0 * factor;
    if (fillLight) fillLight.intensity = 0.6 * factor;
    if (rimLight) rimLight.intensity = 0.5 * factor;
  }
}
