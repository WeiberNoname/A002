/**
 * ScreenVisionBetaUI.js
 * Controller for the Beta Screen Vision AI card in the Studio Tab.
 * Connects screen snapshot capture with local Ollama multimodal vision models,
 * visual thumbnail rendering, periodic automated screen analysis loop,
 * and live-chat reflection injection with audience reaction cascades.
 */

import { screenVisionService } from '../services/ScreenVisionService.js';

export class ScreenVisionBetaUI {
  constructor({ currentSettings = {}, saveSettingsFile = null } = {}) {
    this.currentSettings = currentSettings;
    this.saveSettingsFile = saveSettingsFile;
    this.autoIntervalId = null;
    this.isAnalyzing = false;

    this.captureBtn = null;
    this.modelSelect = null;
    this.detailSelect = null;
    this.autoLoopCheckbox = null;
    this.intervalInput = null;
    this.outputBox = null;
    this.statusTag = null;
    this.latencyTag = null;
    this.thumbnailImg = null;
    this.visionText = null;
  }

  init() {
    this.captureBtn = document.getElementById('btn-beta-capture-vision');
    this.modelSelect = document.getElementById('beta-vision-model');
    this.detailSelect = document.getElementById('beta-vision-detail');
    this.autoLoopCheckbox = document.getElementById('beta-vision-autoloop');
    this.intervalInput = document.getElementById('beta-vision-interval');
    this.outputBox = document.getElementById('beta-vision-output-box');
    this.statusTag = document.getElementById('beta-vision-status-tag');
    this.latencyTag = document.getElementById('beta-vision-latency-tag');
    this.thumbnailImg = document.getElementById('beta-vision-thumbnail');
    this.visionText = document.getElementById('beta-vision-text');

    if (this.modelSelect && this.currentSettings.screenVisionModel) {
      this.modelSelect.value = this.currentSettings.screenVisionModel;
      this.modelSelect.addEventListener('change', () => {
        this.currentSettings.screenVisionModel = this.modelSelect.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.detailSelect) {
      if (this.currentSettings.screenVisionDetail) {
        this.detailSelect.value = this.currentSettings.screenVisionDetail;
      }
      this.detailSelect.addEventListener('change', () => {
        this.currentSettings.screenVisionDetail = this.detailSelect.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.intervalInput) {
      const savedInterval = Math.max(5, Math.min(300, parseInt(this.currentSettings.screenVisionInterval, 10) || 10));
      this.intervalInput.value = savedInterval;
      this.intervalInput.addEventListener('input', () => {
        const val = Math.max(5, Math.min(300, parseInt(this.intervalInput.value, 10) || 10));
        this.currentSettings.screenVisionInterval = val;
        if (this.autoLoopCheckbox && this.autoLoopCheckbox.checked) {
          this.startAutoLoop();
        }
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.autoLoopCheckbox) {
      this.autoLoopCheckbox.checked = !!this.currentSettings.screenVisionAutoLoop;
      this.autoLoopCheckbox.addEventListener('change', () => {
        const isEnabled = this.autoLoopCheckbox.checked;
        this.currentSettings.screenVisionAutoLoop = isEnabled;
        if (isEnabled) {
          this.startAutoLoop();
        } else {
          this.stopAutoLoop();
        }
        if (this.saveSettingsFile) this.saveSettingsFile();
      });

      if (this.autoLoopCheckbox.checked) {
        this.startAutoLoop();
      }
    }

    if (this.captureBtn) {
      this.captureBtn.addEventListener('click', () => {
        this.handleCaptureAndAnalyze({ isAuto: false });
      });
    }
  }

  /**
   * Starts the autonomous screen watcher periodic analysis loop.
   */
  startAutoLoop() {
    this.stopAutoLoop();
    const sec = Math.max(5, Math.min(300, parseInt(this.intervalInput?.value || this.currentSettings.screenVisionInterval || 10, 10)));
    
    if (this.statusTag) {
      this.statusTag.innerText = `🔄 Auto-Watcher Active (${sec}s loop)`;
      this.statusTag.style.color = '#38bdf8';
    }

    this.autoIntervalId = setInterval(() => {
      if (!this.isAnalyzing && !screenVisionService.isAnalyzing) {
        this.handleCaptureAndAnalyze({ isAuto: true });
      }
    }, sec * 1000);
  }

  /**
   * Stops the autonomous screen watcher loop.
   */
  stopAutoLoop() {
    if (this.autoIntervalId) {
      clearInterval(this.autoIntervalId);
      this.autoIntervalId = null;
    }
    if (this.statusTag && (!this.captureBtn || !this.captureBtn.disabled)) {
      this.statusTag.innerText = '⏸️ Auto-Watcher Paused';
      this.statusTag.style.color = '#9ca3af';
    }
  }

  async handleCaptureAndAnalyze({ isAuto = false } = {}) {
    if (this.isAnalyzing || screenVisionService.isAnalyzing) return;
    const model = this.modelSelect ? this.modelSelect.value : (this.currentSettings.screenVisionModel || 'moondream');
    const detail = this.detailSelect ? this.detailSelect.value : (this.currentSettings.screenVisionDetail || 'medium');

    this.isAnalyzing = true;
    if (this.captureBtn && !isAuto) {
      this.captureBtn.disabled = true;
      this.captureBtn.innerText = '⏳ Capturing & Analyzing...';
    }
    if (this.outputBox) this.outputBox.style.display = 'flex';
    if (this.statusTag) {
      this.statusTag.style.color = '#f59e0b';
      this.statusTag.innerText = isAuto ? '📸 Auto Snapshot Analyzing...' : '📸 Taking Snapshot...';
    }
    if (this.visionText) {
      this.visionText.innerText = 'Analyzing visual pixels with local AI model...';
    }

    try {
      const result = await screenVisionService.captureAndAnalyzeScreen({
        model,
        detail,
        onStatus: (msg) => {
          if (this.statusTag) this.statusTag.innerText = msg;
        }
      });

      if (result.success) {
        if (this.statusTag) {
          this.statusTag.style.color = '#22c55e';
          this.statusTag.innerText = '✅ Analysis Complete';
        }
        if (this.visionText) {
          this.visionText.innerText = result.text;
        }
        if (this.thumbnailImg && result.dataUrl) {
          this.thumbnailImg.src = result.dataUrl;
          this.thumbnailImg.style.display = 'block';
        }
        if (this.latencyTag) {
          this.latencyTag.innerText = `${result.durationMs}ms`;
        }

        // Broadcast vision commentary to Live Caption HUD if enabled
        if (result.text) {
          this.broadcastVisionCommentary(result.text, result.model);
        }
      } else {
        if (this.statusTag) {
          this.statusTag.style.color = '#ef4444';
          this.statusTag.innerText = '❌ Analysis Failed';
        }
        if (this.visionText) {
          this.visionText.innerText = `Error: ${result.error || 'Unknown error'}`;
        }
      }
    } catch (err) {
      if (this.statusTag) {
        this.statusTag.style.color = '#ef4444';
        this.statusTag.innerText = '❌ Error';
      }
      if (this.visionText) {
        this.visionText.innerText = err.message;
      }
    } finally {
      this.isAnalyzing = false;
      if (this.captureBtn) {
        this.captureBtn.disabled = false;
        this.captureBtn.innerText = '📸 Capture & Analyze Screen';
      }
    }
  }

  broadcastVisionCommentary(text, model) {
    if (!text) return;
    const cleanText = text.replace(/^Output:\s*/i, '').trim();
    if (!cleanText) return;

    // Broadcast via IPC to Pop-Out Independent Live Caption HUD Window
    const api = window.electronAPI || (typeof window.require === 'function' ? window.require('electron').ipcRenderer : null);
    if (api && typeof api.send === 'function') {
      if (this.currentSettings.liveCaptionMirrorVision !== false) {
        api.send('broadcast-live-caption', {
          text: cleanText,
          model: model || 'Vision AI',
          source: 'SCREEN VISION'
        });
      }
    }
  }
}

export function setupScreenVisionBetaUI(deps = {}) {
  const ui = new ScreenVisionBetaUI(deps);
  ui.init();
  return ui;
}
