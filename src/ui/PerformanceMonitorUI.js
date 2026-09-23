/**
 * Real-Time Performance & Motion Magnitude Monitor Module (<120 lines)
 * Computes live rendering FPS, frame latency, kinetic motion/spin magnitude, and JS heap memory.
 */

let lastPerfUpdate = 0;
let frameCount = 0;
let fpsTimer = 0;
let smoothedFps = 60;

export function updatePerformanceMonitor(deps) {
  const { delta, now, currentSettings, isSettingsOpen, physicsEngine } = deps;
  if (!isSettingsOpen) return;

  frameCount++;
  fpsTimer += delta;

  if (now - lastPerfUpdate < 150) return; // 6.6Hz throttle for readable, jitter-free DOM display
  lastPerfUpdate = now;

  if (fpsTimer > 0) {
    const rawFps = frameCount / fpsTimer;
    smoothedFps = smoothedFps * 0.7 + rawFps * 0.3;
    frameCount = 0;
    fpsTimer = 0;
  }

  const fpsVal = document.getElementById('perf-fps-val');
  const fpsBar = document.getElementById('perf-fps-bar');
  const latencyVal = document.getElementById('perf-latency-val');
  const latencyBar = document.getElementById('perf-latency-bar');
  const magVal = document.getElementById('perf-magnitude-val');
  const magBar = document.getElementById('perf-magnitude-bar');
  const memVal = document.getElementById('perf-memory-val');
  const memBar = document.getElementById('perf-memory-bar');
  const statusBadge = document.getElementById('perf-status-badge');

  const displayFps = Math.min(240, Math.max(1, Math.round(smoothedFps)));
  const targetFps = currentSettings.targetFps || 60;
  const fpsPercent = Math.min(100, Math.max(5, Math.round((displayFps / targetFps) * 100)));

  if (fpsVal) fpsVal.innerText = `${displayFps} FPS (${targetFps} Max)`;
  if (fpsBar) fpsBar.style.width = `${fpsPercent}%`;

  const latencyMs = Math.max(0.1, delta * 1000).toFixed(1);
  const latencyPercent = Math.min(100, Math.max(5, Math.round((parseFloat(latencyMs) / (1000 / targetFps)) * 100)));
  if (latencyVal) latencyVal.innerText = `${latencyMs} ms`;
  if (latencyBar) latencyBar.style.width = `${latencyPercent}%`;

  // Calculate composite angular & linear motion magnitude
  const vx = currentSettings.spinX ? (currentSettings.speedX || 0) : 0;
  const vy = currentSettings.spinY ? (currentSettings.speedY || 0) : 0;
  const vz = currentSettings.spinZ ? (currentSettings.speedZ || 0) : 0;
  const angularMag = Math.sqrt(vx * vx + vy * vy + vz * vz); // Max ~8.66 rad/s

  let bobbingMag = currentSettings.bobbing ? 0.6 : 0.0;
  let physicsMag = 0.0;
  if (currentSettings.enablePhysics && physicsEngine && physicsEngine.velocity) {
    const pVel = physicsEngine.velocity;
    physicsMag = Math.sqrt(pVel.x * pVel.x + pVel.y * pVel.y + pVel.z * pVel.z);
  }

  const totalMag = (angularMag + bobbingMag + physicsMag * 0.5).toFixed(2);
  const magPercent = Math.min(100, Math.round((totalMag / 8.66) * 100));

  if (magVal) magVal.innerText = `${totalMag} rad/s (${magPercent}%)`;
  if (magBar) magBar.style.width = `${Math.max(4, magPercent)}%`;

  // Memory usage
  if (performance && performance.memory) {
    const usedMB = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
    const totalMB = (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(1);
    const memPercent = Math.min(100, Math.round((performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100));
    if (memVal) memVal.innerText = `${usedMB} / ${totalMB} MB`;
    if (memBar) memBar.style.width = `${memPercent}%`;
  } else {
    if (memVal) memVal.innerText = `Active (Low Overhead)`;
    if (memBar) memBar.style.width = `20%`;
  }

  // Health Status Badge
  if (statusBadge) {
    if (displayFps >= targetFps * 0.85) {
      statusBadge.innerText = 'OPTIMAL 🟢';
      statusBadge.className = 'perf-status-badge optimal';
    } else if (displayFps >= targetFps * 0.5) {
      statusBadge.innerText = 'NORMAL 🟡';
      statusBadge.className = 'perf-status-badge normal';
    } else {
      statusBadge.innerText = 'SAVER / THROTTLED 🟠';
      statusBadge.className = 'perf-status-badge throttled';
    }
  }
}
