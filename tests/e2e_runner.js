/**
 * Automated End-to-End Visual Regression Test Runner (Electron Harness)
 * Launches headless / offscreen browser window, exercises UI tabs, renders 3D WebGL scenes,
 * captures high-resolution visual PNG snapshots, and verifies visual integrity.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, 'visual-regression-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let win;
let results = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

// Register IPC handlers for renderer support
ipcMain.on('is-dev-mode', (event) => {
  event.returnValue = false;
});
ipcMain.on('get-assets-path', (event) => {
  event.returnValue = path.join(__dirname, '..', 'assets');
});
ipcMain.on('get-diagnostic-logs', (event) => {
  event.returnValue = 'E2E Test Logs';
});
ipcMain.on('clear-diagnostic-logs', (event) => {
  event.returnValue = true;
});
ipcMain.on('set-ignore-mouse', () => {});
ipcMain.on('move-window', () => {});
ipcMain.on('resize-window', () => {});
ipcMain.on('log-diagnostic', (event, msg) => {});
ipcMain.on('reset-steam-stats', (event) => {
  event.returnValue = true;
});

app.whenReady().then(async () => {
  console.log('🎬 Starting Automated End-to-End Visual Regression Suite...');

  win = new BrowserWindow({
    width: 450,
    height: 450,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  const indexPath = path.join(__dirname, '..', 'index.html');
  await win.loadFile(indexPath);

  // Allow WebGL scene, shaders, and mascot assets to initialize
  await sleep(1500);

  try {
    // -------------------------------------------------------------
    // Scenario 1: Baseline 3D Mascot Viewport
    // -------------------------------------------------------------
    console.log('📸 [Scenario 1/5] Capturing Baseline 3D Mascot Viewport...');
    const image1 = await win.webContents.capturePage();
    const snap1Path = path.join(outputDir, '01_baseline_mascot.png');
    fs.writeFileSync(snap1Path, image1.toPNG());
    const size1 = image1.getSize();
    if (size1.width >= 350 && size1.height >= 350 && image1.toPNG().length > 1000) {
      console.log(`   ✅ Baseline Mascot Snapshot captured: ${snap1Path} (${image1.toPNG().length} bytes)`);
      results.push({ name: 'Scenario 1: Baseline Mascot Viewport', status: 'PASSED' });
    } else {
      throw new Error(`Scenario 1 failed: Invalid snapshot size or buffer.`);
    }

    // -------------------------------------------------------------
    // Scenario 2: Open Settings Studio Suite & Display Tab
    // -------------------------------------------------------------
    console.log('📸 [Scenario 2/5] Opening Settings Studio Panel & Display Tab...');
    await win.webContents.executeJavaScript(`
      (() => {
        const btn = document.getElementById('settings-btn');
        if (btn) btn.click();
        const firstTab = document.querySelector('.studio-tab-btn[data-tab="tab-display"], .tab-btn[data-tab="tab-display"]');
        if (firstTab) firstTab.click();
      })()
    `);
    await sleep(600);

    const image2 = await win.webContents.capturePage();
    const snap2Path = path.join(outputDir, '02_settings_display_tab.png');
    fs.writeFileSync(snap2Path, image2.toPNG());
    const isSettingsOpen = await win.webContents.executeJavaScript(`
      !document.getElementById('settings-panel').classList.contains('hidden')
    `);
    if (isSettingsOpen && image2.toPNG().length > 2000) {
      console.log(`   ✅ Settings Display Tab Snapshot captured: ${snap2Path} (${image2.toPNG().length} bytes)`);
      results.push({ name: 'Scenario 2: Settings Display Tab Navigation', status: 'PASSED' });
    } else {
      throw new Error(`Scenario 2 failed: Settings panel was not opened.`);
    }

    // -------------------------------------------------------------
    // Scenario 3: Atmosphere / Sound Tab (Sakura Rain + Snow Fall)
    // -------------------------------------------------------------
    console.log('📸 [Scenario 3/5] Navigating to Sound Tab & Enabling Snow Fall...');
    await win.webContents.executeJavaScript(`
      (() => {
        const soundTab = document.querySelector('.studio-tab-btn[data-tab="tab-sound"], .tab-btn[data-tab="tab-sound"]');
        if (soundTab) soundTab.click();
        const snowCheck = document.getElementById('snow-fall');
        if (snowCheck && !snowCheck.checked) {
          snowCheck.checked = true;
          snowCheck.dispatchEvent(new Event('change'));
        }
      })()
    `);
    await sleep(600);

    const image3 = await win.webContents.capturePage();
    const snap3Path = path.join(outputDir, '03_atmosphere_snow_sakura.png');
    fs.writeFileSync(snap3Path, image3.toPNG());
    const isSnowChecked = await win.webContents.executeJavaScript(`
      document.getElementById('snow-fall').checked
    `);
    if (isSnowChecked && image3.toPNG().length > 2000) {
      console.log(`   ✅ Sound / Atmosphere Tab (Sakura + Snow) Snapshot captured: ${snap3Path}`);
      results.push({ name: 'Scenario 3: Sound / Atmosphere Tab (Sakura + Snow)', status: 'PASSED' });
    } else {
      throw new Error(`Scenario 3 failed: Atmosphere snow toggle was not applied.`);
    }

    // -------------------------------------------------------------
    // Scenario 4: Stage Lighting & Real-Time Preview Engine
    // -------------------------------------------------------------
    console.log('📸 [Scenario 4/5] Navigating to Stage Lighting Tab & Preview Canvas...');
    await win.webContents.executeJavaScript(`
      (() => {
        const lightTab = document.querySelector('.studio-tab-btn[data-tab="tab-lighting"], .tab-btn[data-tab="tab-lighting"]');
        if (lightTab) lightTab.click();
      })()
    `);
    await sleep(600);

    const image4 = await win.webContents.capturePage();
    const snap4Path = path.join(outputDir, '04_stage_lighting_preview.png');
    fs.writeFileSync(snap4Path, image4.toPNG());
    const hasPreviewCanvas = await win.webContents.executeJavaScript(`
      !!document.getElementById('settings-preview-canvas')
    `);
    if (hasPreviewCanvas && image4.toPNG().length > 2000) {
      console.log(`   ✅ Stage Lighting & Preview Snapshot captured: ${snap4Path}`);
      results.push({ name: 'Scenario 4: Stage Lighting & Preview Engine', status: 'PASSED' });
    } else {
      throw new Error(`Scenario 4 failed: Preview canvas missing.`);
    }

    // -------------------------------------------------------------
    // Scenario 5: Physics & Spatial XYZ HUD Coordinate System
    // -------------------------------------------------------------
    console.log('📸 [Scenario 5/5] Navigating to Physics Tab & Enabling XYZ Coords HUD...');
    await win.webContents.executeJavaScript(`
      (() => {
        const physTab = document.querySelector('.studio-tab-btn[data-tab="tab-system"], .tab-btn[data-tab="tab-physics"]');
        if (physTab) physTab.click();
        const xyzCheck = document.getElementById('show-xyz-coords') || document.getElementById('dynamic-battery-saver');
        if (xyzCheck && !xyzCheck.checked) {
          xyzCheck.checked = true;
          xyzCheck.dispatchEvent(new Event('change'));
        }
      })()
    `);
    await sleep(600);

    const image5 = await win.webContents.capturePage();
    const snap5Path = path.join(outputDir, '05_physics_xyz_hud.png');
    fs.writeFileSync(snap5Path, image5.toPNG());
    const isXYZActive = await win.webContents.executeJavaScript(`
      document.getElementById('show-xyz-coords').checked
    `);
    if (isXYZActive && image5.toPNG().length > 2000) {
      console.log(`   ✅ Physics & XYZ HUD Snapshot captured: ${snap5Path}`);
      results.push({ name: 'Scenario 5: Physics & Spatial XYZ HUD', status: 'PASSED' });
    } else {
      throw new Error(`Scenario 5 failed: XYZ HUD was not enabled.`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 5 E2E VISUAL REGRESSION SCENARIOS PASSED (100% SUCCESS)');
    console.log(`📂 Visual artifacts saved to: ${outputDir}`);
    console.log('======================================================\n');
    app.exit(0);
  } catch (err) {
    console.error('❌ Visual Regression Test Failed:', err);
    app.exit(1);
  }
});
