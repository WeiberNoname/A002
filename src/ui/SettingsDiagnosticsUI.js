/**
 * Diagnostics & Utility Controls Module (<100 lines)
 * Encapsulates diagnostic logs console reading, log clearing, Steam stats reset, and camera reset UI listeners.
 */

export function setupDiagnosticsUI({ showSpeechBubble, resetCameraAndPosition }) {
  const resetCameraBtn = document.getElementById('reset-camera-btn');
  if (resetCameraBtn) {
    resetCameraBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (resetCameraAndPosition) resetCameraAndPosition();
      if (showSpeechBubble) showSpeechBubble("Camera & Position reset to initial state! 🔄", 2500);
    });
  }
}
