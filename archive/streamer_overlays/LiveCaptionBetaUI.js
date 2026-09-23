/**
 * LiveCaptionBetaUI.js
 * Controller for the Beta Live Caption Window in the Studio Tab.
 * Manages launching the independent floating caption HUD, broadcasting test subtitles,
 * and seamlessly routing Screen Vision reflections into the live caption window.
 */

export class LiveCaptionBetaUI {
  constructor({ currentSettings = {}, saveSettingsFile = null } = {}) {
    this.currentSettings = currentSettings;
    this.saveSettingsFile = saveSettingsFile;

    this.btnLaunch = null;
    this.btnTest = null;
    this.btnClear = null;
    this.mirrorToggle = null;
    this.clickThroughToggle = null;
    this.statusTag = null;
    this.lastBroadcastText = '';

    // Appearance controls
    this.inputBgColor = null;
    this.labelBgHex = null;
    this.sliderOpacity = null;
    this.labelOpacityVal = null;
    this.inputFontColor = null;
    this.labelFontHex = null;
    this.sliderFontSize = null;
    this.labelFontSizeVal = null;
  }

  init() {
    this.btnLaunch = document.getElementById('btn-beta-launch-caption-window');
    this.btnTest = document.getElementById('btn-beta-test-caption');
    this.btnClear = document.getElementById('btn-beta-clear-caption-window');
    this.mirrorToggle = document.getElementById('beta-caption-mirror-vision');
    this.statusTag = document.getElementById('beta-caption-hud-status');

    // Appearance inputs
    this.inputBgColor = document.getElementById('beta-caption-bg-color');
    this.labelBgHex = document.getElementById('beta-caption-bg-hex');
    this.sliderOpacity = document.getElementById('beta-caption-opacity');
    this.labelOpacityVal = document.getElementById('beta-caption-opacity-val');
    this.inputFontColor = document.getElementById('beta-caption-font-color');
    this.labelFontHex = document.getElementById('beta-caption-font-hex');
    this.sliderFontSize = document.getElementById('beta-caption-font-size');
    this.labelFontSizeVal = document.getElementById('beta-caption-font-size-val');

    this.initAppearanceControls();

    if (this.btnLaunch) {
      this.btnLaunch.addEventListener('click', () => {
        const api = window.electronAPI;
        if (api && typeof api.toggleLiveCaptionWindow === 'function') {
          api.toggleLiveCaptionWindow();
        } else if (api && typeof api.send === 'function') {
          api.send('toggle-live-caption-window');
        }
        this.updateStatus('🪟 Caption Window Toggled');
      });
    }

    if (this.btnTest) {
      this.btnTest.addEventListener('click', () => {
        this.broadcastSampleCaption();
      });
    }

    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => {
        this.clearCaptionWindow();
      });
    }

    if (this.mirrorToggle) {
      this.mirrorToggle.checked = this.currentSettings.liveCaptionMirrorVision !== false;
      this.mirrorToggle.addEventListener('change', () => {
        this.currentSettings.liveCaptionMirrorVision = this.mirrorToggle.checked;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    this.clickThroughToggle = document.getElementById('beta-caption-click-through');
    if (this.clickThroughToggle) {
      this.clickThroughToggle.checked = this.currentSettings.liveCaptionClickThrough === true;
      this.clickThroughToggle.addEventListener('change', () => {
        const enabled = this.clickThroughToggle.checked;
        this.currentSettings.liveCaptionClickThrough = enabled;
        if (this.saveSettingsFile) this.saveSettingsFile();
        const api = window.electronAPI;
        if (api && typeof api.setCaptionClickThrough === 'function') {
          api.setCaptionClickThrough(enabled);
        } else if (api && typeof api.send === 'function') {
          api.send('set-caption-click-through', enabled);
        }
        this.updateStatus(enabled ? '🖱️ Click-Through Enabled' : '🖐️ Click-Through Disabled');
      });
    }

    // Initialize click-through state on boot
    if (this.currentSettings.liveCaptionClickThrough) {
      const api = window.electronAPI;
      if (api && typeof api.setCaptionClickThrough === 'function') {
        api.setCaptionClickThrough(true);
      } else if (api && typeof api.send === 'function') {
        api.send('set-caption-click-through', true);
      }
    }

    // Listen for style updates from the floating caption window
    const api = window.electronAPI;
    if (api && typeof api.on === 'function') {
      api.on('caption-style-update', (style) => {
        if (!style) return;
        if (style.bgColor && this.inputBgColor) {
          this.inputBgColor.value = style.bgColor;
          if (this.labelBgHex) this.labelBgHex.innerText = style.bgColor.toUpperCase();
          this.currentSettings.liveCaptionBgColor = style.bgColor;
        }
        if (style.opacity !== undefined && this.sliderOpacity) {
          const pct = Math.round(style.opacity * 100);
          this.sliderOpacity.value = pct;
          if (this.labelOpacityVal) this.labelOpacityVal.innerText = `${pct}%`;
          this.currentSettings.liveCaptionBgOpacity = style.opacity;
        }
        if (style.fontColor && this.inputFontColor) {
          this.inputFontColor.value = style.fontColor;
          if (this.labelFontHex) this.labelFontHex.innerText = style.fontColor.toUpperCase();
          this.currentSettings.liveCaptionFontColor = style.fontColor;
        }
        if (style.fontSize !== undefined && this.sliderFontSize) {
          this.sliderFontSize.value = style.fontSize;
          if (this.labelFontSizeVal) this.labelFontSizeVal.innerText = `${style.fontSize}px`;
          this.currentSettings.liveCaptionFontSize = style.fontSize;
        }
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    // Auto-launch on boot if user configured it
    if (this.currentSettings.liveCaptionAutoOpen) {
      if (api && typeof api.openLiveCaptionWindow === 'function') {
        api.openLiveCaptionWindow();
      }
    }
  }

  /**
   * Initializes background color, opacity, and font color controls with settings.
   */
  initAppearanceControls() {
    const defaultBg = this.currentSettings.liveCaptionBgColor || '#0b0f19';
    const defaultOp = this.currentSettings.liveCaptionBgOpacity !== undefined ? this.currentSettings.liveCaptionBgOpacity : 0.90;
    const defaultFont = this.currentSettings.liveCaptionFontColor || '#ffffff';

    if (this.inputBgColor) {
      this.inputBgColor.value = defaultBg;
      if (this.labelBgHex) this.labelBgHex.innerText = defaultBg.toUpperCase();
      const onBgChange = (e) => {
        const hex = e.target.value;
        if (this.labelBgHex) this.labelBgHex.innerText = hex.toUpperCase();
        this.currentSettings.liveCaptionBgColor = hex;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastCaptionStyle();
      };
      this.inputBgColor.addEventListener('input', onBgChange);
      this.inputBgColor.addEventListener('change', onBgChange);
    }

    if (this.sliderOpacity) {
      const pct = Math.round(defaultOp * 100);
      this.sliderOpacity.value = pct;
      if (this.labelOpacityVal) this.labelOpacityVal.innerText = `${pct}%`;
      const onOpChange = (e) => {
        const opVal = parseInt(e.target.value, 10) / 100;
        if (this.labelOpacityVal) this.labelOpacityVal.innerText = `${parseInt(e.target.value, 10)}%`;
        this.currentSettings.liveCaptionBgOpacity = opVal;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastCaptionStyle();
      };
      this.sliderOpacity.addEventListener('input', onOpChange);
      this.sliderOpacity.addEventListener('change', onOpChange);
    }

    if (this.inputFontColor) {
      this.inputFontColor.value = defaultFont;
      if (this.labelFontHex) this.labelFontHex.innerText = defaultFont.toUpperCase();
      const onFontChange = (e) => {
        const hex = e.target.value;
        if (this.labelFontHex) this.labelFontHex.innerText = hex.toUpperCase();
        this.currentSettings.liveCaptionFontColor = hex;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastCaptionStyle();
      };
      this.inputFontColor.addEventListener('input', onFontChange);
      this.inputFontColor.addEventListener('change', onFontChange);
    }

    if (this.sliderFontSize) {
      const defaultSize = this.currentSettings.liveCaptionFontSize || 16;
      this.sliderFontSize.value = defaultSize;
      if (this.labelFontSizeVal) this.labelFontSizeVal.innerText = `${defaultSize}px`;
      const onSizeChange = (e) => {
        const sizeVal = parseInt(e.target.value, 10) || 16;
        if (this.labelFontSizeVal) this.labelFontSizeVal.innerText = `${sizeVal}px`;
        this.currentSettings.liveCaptionFontSize = sizeVal;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastCaptionStyle();
      };
      this.sliderFontSize.addEventListener('input', onSizeChange);
      this.sliderFontSize.addEventListener('change', onSizeChange);
    }
  }

  /**
   * Broadcasts style preferences to floating caption window.
   */
  broadcastCaptionStyle() {
    const api = window.electronAPI;
    if (api && typeof api.send === 'function') {
      api.send('broadcast-caption-style', {
        bgColor: this.currentSettings.liveCaptionBgColor || '#0b0f19',
        opacity: this.currentSettings.liveCaptionBgOpacity !== undefined ? this.currentSettings.liveCaptionBgOpacity : 0.90,
        fontColor: this.currentSettings.liveCaptionFontColor || '#ffffff',
        fontSize: this.currentSettings.liveCaptionFontSize || 16
      });
    }
  }

  /**
   * Broadcasts a caption message to the floating caption window via IPC.
   * @param {Object} data - { text, model, source, durationMs, counter }
   */
  broadcastCaption(data) {
    if (!data || !data.text) return;
    this.lastBroadcastText = data.text;
    const api = window.electronAPI;
    if (api && typeof api.send === 'function') {
      api.send('broadcast-live-caption', {
        text: data.text,
        model: data.model || 'Local AI',
        source: data.source || 'VISION AI',
        durationMs: data.durationMs || 0,
        counter: data.counter || ''
      });
    }
    this.updateStatus(`📡 Subtitle Sent: "${data.text.slice(0, 30)}..."`);
  }

  /**
   * Broadcasts an instant test subtitle.
   */
  broadcastSampleCaption() {
    const samples = [
      'Visual scene observed: dynamic action in progress with high-contrast vibrant colors!',
      'Active workspace detected: multi-window multitasking with focused user interaction.',
      'Artwork and character visuals rendered cleanly across the scene.',
      'Smooth streaming gameplay detected with lively on-screen motion!'
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    this.broadcastCaption({
      text: pick,
      model: 'Test Streamer',
      source: 'DEMO',
      durationMs: 120
    });
  }

  /**
   * Clears the independent caption window.
   */
  clearCaptionWindow() {
    const api = window.electronAPI;
    if (api && typeof api.send === 'function') {
      api.send('clear-live-caption');
    }
    this.updateStatus('🧹 Caption Window Cleared');
  }

  updateStatus(msg) {
    if (this.statusTag) {
      this.statusTag.innerText = msg;
    }
  }
}

export let liveCaptionBetaUI = null;

export function setupLiveCaptionBetaUI(deps = {}) {
  liveCaptionBetaUI = new LiveCaptionBetaUI(deps);
  liveCaptionBetaUI.init();
  return liveCaptionBetaUI;
}
