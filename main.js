const { app, BrowserWindow, ipcMain, screen, desktopCapturer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const Logger = require('./src/main/Logger.js');
const SteamService = require('./src/main/SteamService.js');
const ToolchainManager = require('./src/main/ToolchainManager.js');
const TelemetryService = require('./src/main/TelemetryService.js');

const { spawn, exec } = require('child_process');

function getAssetsPath() {
  return Logger.getAssetsPath();
}

function logDiagnostic(message) {
  Logger.logDiagnostic(message);
}

function ensureLocalOllamaRunning() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\space', 'AppData', 'Local');
  const ollamaExePath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');

  if (fs.existsSync(ollamaExePath)) {
    try {
      const child = spawn(ollamaExePath, ['serve'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: Object.assign({}, process.env, { OLLAMA_HOST: '127.0.0.1:11434', OLLAMA_ORIGINS: '*' })
      });
      child.unref();
      Logger.logDiagnostic('[LLM Bridge] Auto-started local Ollama daemon on 127.0.0.1:11434.');
    } catch (e) {
      Logger.logDiagnostic(`[LLM Bridge] Ollama launch notice: ${e.message}`);
    }
  }
}

// Auto-start Ollama if installed
ensureLocalOllamaRunning();

logDiagnostic('=== Application Session Started ===');

const isDevMode = process.argv.includes('--dev');
logDiagnostic(`Developer Mode active: ${isDevMode}`);

let isSteamOverlayActive = false;
let edgeCheckInterval = null;
const steamService = new SteamService();

function startSteamRepaintLoop() {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.steamworksRepaintInterval) {
    mainWindow.steamworksRepaintInterval = setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.webContents.isPainting()) {
          mainWindow.webContents.invalidate();
        }
      } else {
        stopSteamRepaintLoop();
      }
    }, 1000 / 60);
    Logger.logDiagnostic('[Steam] Active overlay repaint loop started (60 FPS).');
  }
}

function stopSteamRepaintLoop() {
  if (mainWindow && mainWindow.steamworksRepaintInterval) {
    clearInterval(mainWindow.steamworksRepaintInterval);
    mainWindow.steamworksRepaintInterval = null;
    Logger.logDiagnostic('[Steam] Overlay inactive: Repaint loop deactivated to save idle CPU/GPU.');
  }
}

steamService.initialize((active) => {
  isSteamOverlayActive = active;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (active) {
      if (edgeCheckInterval) {
        clearInterval(edgeCheckInterval);
        edgeCheckInterval = null;
      }
      startSteamRepaintLoop();
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.focus();
      mainWindow.setFullScreen(true);
      mainWindow.webContents.send('steam-overlay-active', true);
    } else {
      stopSteamRepaintLoop();
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      mainWindow.webContents.send('steam-overlay-active', false);
    }
  }
});

let steamClient = steamService.getClient();

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const winWidth = 350;
  const winHeight = 350;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    // Position near the bottom-right of the primary screen, just above the taskbar
    x: screenWidth - winWidth - 50,
    y: screenHeight - winHeight - 50,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Elevate to screen-saver z-order level so window stays on top of Snipping Tool and system overlays
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile('index.html');

  // Start with click-through enabled (ignoring clicks) for transparent parts (unless in dev mode).
  // forward: true ensures mouse movements are still tracked inside the window.
  mainWindow.setIgnoreMouseEvents(!isDevMode, { forward: true });

  mainWindow.on('blur', () => {
    if (!isSteamOverlayActive && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    Logger.logDiagnostic(`[Renderer Console] ${message}`);
    console.log(`[Renderer Console] ${message}`);
  });

  mainWindow.webContents.on('render-process-gone', (e, details) => {
    Logger.logDiagnostic(`[Renderer Process Gone] reason: ${details.reason}, exitCode: ${details.exitCode}`);
  });

  if (isDevMode) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    logDiagnostic('Developer mode: Detached DevTools window opened.');
  }

  mainWindow.on('closed', function () {
    stopSteamRepaintLoop();
    if (edgeCheckInterval) {
      clearInterval(edgeCheckInterval);
      edgeCheckInterval = null;
    }
    mainWindow = null;
  });
}

function getGPUPowerPreference() {
  const assetsDir = getAssetsPath();
  const settingsFile = path.join(assetsDir, 'settings');
  const settingsTxtFile = path.join(assetsDir, 'settings.txt');
  let filePath = null;
  if (fs.existsSync(settingsFile)) filePath = settingsFile;
  else if (fs.existsSync(settingsTxtFile)) filePath = settingsTxtFile;
  
  let mode = 'high-performance';
  if (filePath && fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const lines = data.split('\n');
      lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const val = parts[1].trim();
          if (key === 'gpuLowPower' && val === 'true') {
            mode = 'low-power';
          } else if (key === 'gpuOptimize' && val === 'false' && mode !== 'low-power') {
            mode = 'default';
          }
        }
      });
    } catch (e) {
      console.error('Error reading settings in main:', e);
    }
  }
  return mode;
}

// Disable GPU occlusion tracking to prevent chromium from suspending rendering
// when window overlaps with other apps
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');

// Dynamically configure Chromium hardware switches based on dual-GPU preference
const gpuPowerMode = getGPUPowerPreference();
if (gpuPowerMode === 'high-performance') {
  // Force NVIDIA Optimus & AMD Enduro driver shims at process environment level
  process.env['SHIM_MCCOMPAT'] = '0x00000001';
  process.env['__NV_PRIME_RENDER_OFFLOAD'] = '1';
  process.env['__GLX_VENDOR_LIBRARY_NAME'] = 'nvidia';

  app.commandLine.appendSwitch('force_high_performance_gpu');
  app.commandLine.appendSwitch('force-high-performance-gpu', 'true');
  app.commandLine.appendSwitch('ignore-gpu-blocklist', 'true');
  app.commandLine.appendSwitch('enable-gpu-rasterization', 'true');
  app.commandLine.appendSwitch('use-angle', 'd3d11');
} else if (gpuPowerMode === 'low-power') {
  app.commandLine.appendSwitch('prefer-low-power-gpu', 'true');
  app.commandLine.appendSwitch('use-angle', 'd3d11');
}

// Disable automatic DPI scaling to prevent window enlarging/shrinking when dragging across monitors
app.commandLine.appendSwitch('force-device-scale-factor', '1');

// Steam Overlay hooks for Electron
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (steamClient && steamClient.isInitialized) {
    steamClient.shutdown();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// IPC handler to toggle mouse click-through capability
ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (isSteamOverlayActive) return; // Prevent renderer from overriding active overlay focus
  if (mainWindow) {
    const finalIgnore = isDevMode ? false : ignore;
    mainWindow.setIgnoreMouseEvents(finalIgnore, { forward: true });

    // Active polling fallback: check if cursor is outside window boundaries when click-through is enabled
    if (finalIgnore) {
      if (!edgeCheckInterval) {
        edgeCheckInterval = setInterval(() => {
          if (!mainWindow || mainWindow.isDestroyed()) {
            clearInterval(edgeCheckInterval);
            edgeCheckInterval = null;
            return;
          }
          const { x, y } = screen.getCursorScreenPoint();
          const bounds = mainWindow.getBounds();

          const isOutside = x < bounds.x || x > bounds.x + bounds.width ||
                            y < bounds.y || y > bounds.y + bounds.height;

          if (isOutside) {
            mainWindow.setIgnoreMouseEvents(false);
            mainWindow.webContents.send('force-hover-exit');
            clearInterval(edgeCheckInterval);
            edgeCheckInterval = null;
          }
        }, 100);
      }
    } else {
      if (edgeCheckInterval) {
        clearInterval(edgeCheckInterval);
        edgeCheckInterval = null;
      }
    }
  }
});

// IPC handler to return the assets path synchronously
ipcMain.on('get-assets-path', (event) => {
  event.returnValue = getAssetsPath();
});

// IPC handler to move the window when dragging the character
ipcMain.on('move-window', (event, delta) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(Math.round(x + delta.x), Math.round(y + delta.y));
  }
});

// IPC handler to dynamically resize the window based on 3D asset dimensions
ipcMain.on('resize-window', (event, size) => {
  if (mainWindow) {
    if (size.bounds) {
      mainWindow.setBounds({
        x: Math.round(size.bounds.x),
        y: Math.round(size.bounds.y),
        width: Math.round(size.bounds.width),
        height: Math.round(size.bounds.height)
      });
      return;
    }

    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    const deltaW = Math.round(size.width - w);
    const deltaH = Math.round(size.height - h);
    
    if (size.edge) {
      // Direction-aware edge resize: only adjust position if top/left edges are pulled
      let newX = x;
      let newY = y;
      if (size.edge.includes('w')) newX = Math.round(x - deltaW);
      if (size.edge.includes('n')) newY = Math.round(y - deltaH);
      mainWindow.setBounds({
        x: newX,
        y: newY,
        width: Math.round(size.width),
        height: Math.round(size.height)
      });
    } else {
      // Default: anchor bottom-right for slider / model change
      mainWindow.setBounds({
        x: Math.round(x - deltaW),
        y: Math.round(y - deltaH),
        width: Math.round(size.width),
        height: Math.round(size.height)
      });
    }
  }
});


// IPC handler to return absolute diagnostic log contents
ipcMain.on('get-diagnostic-logs', (event) => {
  try {
    const diagnosticsLogPath = path.join(getAssetsPath(), 'diagnostics.log');
    if (fs.existsSync(diagnosticsLogPath)) {
      event.returnValue = fs.readFileSync(diagnosticsLogPath, 'utf8');
    } else {
      event.returnValue = 'No diagnostic logs found.';
    }
  } catch (e) {
    event.returnValue = `Error reading diagnostics log: ${e.message}`;
  }
});

// IPC handler to clear diagnostics log
ipcMain.on('clear-diagnostic-logs', (event) => {
  try {
    const diagnosticsLogPath = path.join(getAssetsPath(), 'diagnostics.log');
    fs.writeFileSync(diagnosticsLogPath, `[${new Date().toISOString()}] Diagnostics cleared.\n`, 'utf8');
    event.returnValue = true;
  } catch (e) {
    event.returnValue = false;
  }
});

// IPC handler to query developer mode status
ipcMain.on('is-dev-mode', (event) => {
  event.returnValue = isDevMode;
});

// IPC handler for renderer diagnostics logging
ipcMain.on('log-diagnostic', (event, message) => {
  logDiagnostic(message);
});

// IPC handler to close the application cleanly
ipcMain.on('close-app', () => {
  logDiagnostic('Close application requested via UI close button.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

// Developer utility: IPC handler to reset Steam user stats/achievements for testing
ipcMain.on('reset-steam-stats', (event) => {
  if (steamClient && steamClient.isInitialized && steamClient.userStats && typeof steamClient.userStats.resetAllStats === 'function') {
    try {
      steamClient.userStats.resetAllStats(true);
      if (typeof steamClient.userStats.storeStats === 'function') {
        steamClient.userStats.storeStats();
      }
      logDiagnostic('[Steam Dev Utility] Successfully triggered resetAllStats(true) on Steam Cloud.');
      event.returnValue = true;
    } catch (err) {
      logDiagnostic(`[Steam Dev Utility] Error resetting stats: ${err.message || err}`);
      event.returnValue = false;
    }
  } else {
    logDiagnostic('[Steam Dev Utility] resetAllStats not available on current steamClient.');
    event.returnValue = false;
  }
});


ipcMain.on('open-external-url', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('steam://'))) {
    shell.openExternal(url).catch(err => {
      logDiagnostic(`[External URL] Failed to open: ${err.message}`);
    });
  }
});

// ==========================================================================
// Screen Vision Snapshot Capture (Local Multimodal Vision AI Bridge)
// ==========================================================================
ipcMain.handle('capture-screen-snapshot', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    
    // Scale down to max 1280x720 for fast local inference and low VRAM footprint
    const scale = Math.min(1.0, 1280 / width, 720 / height);
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: targetW, height: targetH }
    });

    if (sources && sources.length > 0) {
      const base64Jpeg = sources[0].thumbnail.toJPEG(80).toString('base64');
      logDiagnostic(`[Screen Vision] Captured screen snapshot (${targetW}x${targetH}, base64 len: ${base64Jpeg.length}).`);
      return { success: true, base64: base64Jpeg, width: targetW, height: targetH };
    }
    return { success: false, error: 'No screen sources available' };
  } catch (err) {
    logDiagnostic(`[Screen Vision Error] ${err.message}`);
    return { success: false, error: err.message };
  }
});

// ==========================================================================
// Autonomous Coding Agent Workspace & Shell Execution IPC Bridge
// ==========================================================================
function getAgentWorkspacePath() {
  const wsPath = path.resolve(__dirname, 'workspace');
  if (!fs.existsSync(wsPath)) {
    try {
      fs.mkdirSync(wsPath, { recursive: true });
    } catch (e) {
      logDiagnostic(`[Agent Workspace] Failed to create dir: ${e.message}`);
    }
  }
  return wsPath;
}

function isPathInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

ipcMain.handle('agent:get-workspace-path', async () => {
  const ws = getAgentWorkspacePath();
  return { success: true, workspacePath: ws };
});

ipcMain.handle('agent:open-workspace-folder', async () => {
  const ws = getAgentWorkspacePath();
  try {
    await shell.openPath(ws);
    return { success: true, workspacePath: ws };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:write-file', async (event, { filePath, content }) => {
  try {
    const ws = getAgentWorkspacePath();
    const target = path.resolve(ws, filePath);
    if (!isPathInside(target, ws) && target !== ws) {
      return { success: false, error: 'Target path must reside inside workspace sandbox' };
    }
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target, content, 'utf8');
    const bytes = Buffer.byteLength(content, 'utf8');
    logDiagnostic(`[Agent Bridge] Wrote ${bytes} bytes to ${path.relative(ws, target)}`);
    return { success: true, relativePath: path.relative(ws, target), bytes };
  } catch (err) {
    logDiagnostic(`[Agent Bridge Error] write-file failed: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:read-file', async (event, { filePath }) => {
  try {
    const ws = getAgentWorkspacePath();
    const target = path.resolve(ws, filePath);
    if (!isPathInside(target, ws) && target !== ws) {
      return { success: false, error: 'Target path must reside inside workspace sandbox' };
    }
    if (!fs.existsSync(target)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    const content = fs.readFileSync(target, 'utf8');
    return { success: true, content, size: Buffer.byteLength(content, 'utf8') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('agent:list-files', async (event, { subDir = '' } = {}) => {
  try {
    const ws = getAgentWorkspacePath();
    const target = path.resolve(ws, subDir);
    if (!isPathInside(target, ws) && target !== ws) {
      return { success: false, error: 'Directory must reside inside workspace sandbox' };
    }
    if (!fs.existsSync(target)) {
      return { success: true, files: [] };
    }
    const entries = fs.readdirSync(target, { withFileTypes: true });
    const files = entries.map(e => {
      const full = path.join(target, e.name);
      let size = 0;
      let mtime = null;
      try {
        const s = fs.statSync(full);
        size = s.size;
        mtime = s.mtime;
      } catch {}
      return {
        name: e.name,
        relativePath: path.relative(ws, full),
        isDirectory: e.isDirectory(),
        size,
        mtime
      };
    });
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

let toolchainManagerInstance = null;
function getToolchainManager() {
  if (!toolchainManagerInstance) {
    toolchainManagerInstance = new ToolchainManager({
      rootDir: __dirname,
      toolchainDir: path.join(getAgentWorkspacePath(), '.toolchain')
    });
    toolchainManagerInstance.init();
  }
  return toolchainManagerInstance;
}

let telemetryServiceInstance = null;
function getTelemetryService() {
  if (!telemetryServiceInstance) {
    telemetryServiceInstance = new TelemetryService({
      rootDir: __dirname,
      workspaceDir: getAgentWorkspacePath()
    });
  }
  return telemetryServiceInstance;
}

ipcMain.handle('agent:check-environment', async () => {
  return await getToolchainManager().checkEnvironment();
});

ipcMain.handle('agent:generate-telemetry-bundle', async () => {
  const ts = getTelemetryService();
  const tm = getToolchainManager();
  return await ts.generateFeedbackBundle(tm);
});

ipcMain.handle('agent:run-tests', async () => {
  return new Promise((resolve) => {
    const nodeExe = process.execPath && process.execPath.endsWith('node.exe') ? process.execPath : 'node';
    const child = spawn(nodeExe, [path.join(__dirname, 'tests', 'run_tests.mjs')], {
      cwd: __dirname,
      windowsHide: true,
      env: getToolchainManager().getExecutionEnvironment()
    });
    let out = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { out += d.toString(); });
    child.on('close', async (code) => {
      const ts = getTelemetryService();
      const tm = getToolchainManager();
      const bundleRes = await ts.generateFeedbackBundle(tm);
      resolve({
        success: code === 0,
        exitCode: code,
        output: out,
        bundle: bundleRes
      });
    });
    child.on('error', async (err) => {
      resolve({
        success: false,
        exitCode: -1,
        output: `Error running tests: ${err.message}`,
        bundle: null
      });
    });
  });
});

ipcMain.handle('agent:read-file-base64', async (event, { filePath }) => {
  try {
    const ws = getAgentWorkspacePath();
    const target = path.resolve(ws, filePath);
    if (!isPathInside(target, ws)) {
      return { success: false, error: 'Target path must reside inside workspace sandbox' };
    }
    if (!fs.existsSync(target)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    const ext = path.extname(target).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.bmp') mimeType = 'image/bmp';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.gif') mimeType = 'image/gif';

    const data = fs.readFileSync(target);
    const base64 = data.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return { success: true, mimeType, dataUrl, size: data.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function resolveShell() {
  if (process.platform !== 'win32') {
    return {
      exe: '/bin/sh',
      args: (cmd) => ['-c', cmd]
    };
  }

  const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows';
  const psCandidates = [
    path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    path.join(sysRoot, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  ];

  for (const c of psCandidates) {
    if (fs.existsSync(c)) {
      return {
        exe: c,
        args: (cmd) => ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd]
      };
    }
  }

  const comspec = process.env.COMSPEC || path.join(sysRoot, 'System32', 'cmd.exe');
  return {
    exe: comspec,
    args: (cmd) => ['/d', '/s', '/c', cmd]
  };
}

ipcMain.handle('agent:execute-command', async (event, { command, timeoutMs = 45000 }) => {
  const ws = getAgentWorkspacePath();
  const startTime = Date.now();
  logDiagnostic(`[Agent Shell] Executing in ${ws}: ${command}`);

  return new Promise((resolve) => {
    const shellInfo = resolveShell();
    const shellExe = shellInfo.exe;
    const shellArgs = shellInfo.args(command);

    let stdoutData = '';
    let stderrData = '';
    let isSettled = false;

    let childProc;
    try {
      const toolchainEnv = getToolchainManager().getExecutionEnvironment();
      childProc = spawn(shellExe, shellArgs, {
        cwd: ws,
        windowsHide: true,
        env: toolchainEnv
      });
    } catch (spawnErr) {
      return resolve({
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: `Failed to spawn process: ${spawnErr.message}`,
        durationMs: Date.now() - startTime
      });
    }

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          childProc.kill('SIGTERM');
        } catch {}
        resolve({
          success: false,
          exitCode: 124, // Timeout standard exit code
          stdout: stdoutData.slice(-50000),
          stderr: (stderrData + `\n[Command timed out after ${timeoutMs}ms]`).slice(-50000),
          durationMs: Date.now() - startTime
        });
      }
    }, timeoutMs);

    childProc.stdout.on('data', (d) => {
      stdoutData += d.toString('utf8');
      if (stdoutData.length > 100000) {
        stdoutData = stdoutData.slice(-100000);
      }
    });

    childProc.stderr.on('data', (d) => {
      stderrData += d.toString('utf8');
      if (stderrData.length > 100000) {
        stderrData = stderrData.slice(-100000);
      }
    });

    childProc.on('close', (code) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        logDiagnostic(`[Agent Shell] Process finished (code ${code}) in ${durationMs}ms`);
        resolve({
          success: code === 0,
          exitCode: code !== null ? code : 0,
          stdout: stdoutData,
          stderr: stderrData,
          durationMs
        });
      }
    });

    childProc.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          success: false,
          exitCode: -1,
          stdout: stdoutData,
          stderr: `Process error: ${err.message}`,
          durationMs: Date.now() - startTime
        });
      }
    });
  });
});






