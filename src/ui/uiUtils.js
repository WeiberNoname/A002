/**
 * UI Utilities Module for Desktop Mascot Pet
 * Contains encapsulated DOM layout and control positioning helpers.
 */

/**
 * Updates the position of the settings gear icon and close button dynamically
 * based on the settingsLeft preference.
 * @param {Object} settings - The application settings object containing `settingsLeft`.
 */
export function updateGearPosition(settings) {
  const gearBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('app-close-btn');
  if (!gearBtn) return;

  const isLeft = Boolean(settings && settings.settingsLeft);

  if (isLeft) {
    gearBtn.style.left = '10px';
    gearBtn.style.right = 'auto';
    if (closeBtn) {
      closeBtn.style.left = '46px';
      closeBtn.style.right = 'auto';
    }
  } else {
    gearBtn.style.right = '46px';
    gearBtn.style.left = 'auto';
    if (closeBtn) {
      closeBtn.style.right = '10px';
      closeBtn.style.left = 'auto';
    }
  }
}

/**
 * Displays a speech bubble notification above the pet.
 * Safely suppressed: unessential text notifications on the mascot 3D display are disabled.
 * @param {string} text - Message text to display.
 * @param {number} duration - Duration in milliseconds before fading out (default: 2000ms).
 */
export function showSpeechBubble(text, duration = 6500) {
  if (typeof window !== 'undefined' && window.directChatUI && typeof window.directChatUI.showSpeechBubble === 'function') {
    window.directChatUI.showSpeechBubble(text, duration);
    return;
  }
  const bubble = document.getElementById('mascot-speech-bubble');
  const bubbleText = document.getElementById('speech-bubble-text');
  if (bubble && bubbleText) {
    bubbleText.innerText = text;
    bubble.classList.remove('hidden', 'fade-out');
    bubble.classList.add('pop-in');
    setTimeout(() => {
      if (bubble) bubble.classList.add('hidden');
    }, duration);
  }
}

/**
 * Converts raw code identifiers, file names, or snake_case/kebab-case strings
 * into clean, beautifully formatted human-readable UI titles.
 * e.g. "model_default" -> "Model Default", "fur_elise.mid" -> "Fur Elise"
 * @param {string} str - Raw string or identifier.
 * @returns {string} Clean title string without underscores or file extensions.
 */
export function formatHumanLabel(str) {
  if (!str || typeof str !== 'string') return '';
  let clean = str.replace(/\.(glb|gltf|fbx|obj|png|jpg|jpeg|webp|svg|mid|midi|musicxml|xml)$/i, '');
  clean = clean.replace(/[_-]+/g, ' ').trim();
  return clean.replace(/\b\w/g, (char) => char.toUpperCase());
}
