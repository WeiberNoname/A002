/**
 * VisionCaptionSynthesizerBetaUI.js
 * Controller for the Beta Vision-to-LLM Caption Synthesizer card in Studio Tab.
 * Executes the full screen capture -> neural vision -> text LLM caption synthesis flow,
 * and outputs the synthesized captions directly into an editable text box for user review.
 */

import { visionCaptionSynthesizerService } from '../services/VisionCaptionSynthesizerService.js';
import { speechSynthesisService } from '../services/SpeechSynthesisService.js';
import { showSpeechBubble } from '../ui/uiUtils.js';

export class VisionCaptionSynthesizerBetaUI {
  constructor({ currentSettings = {}, saveSettingsFile = null } = {}) {
    this.currentSettings = currentSettings;
    this.saveSettingsFile = saveSettingsFile;
    this.isGenerating = false;

    // DOM Elements
    this.visionModelSelect = null;
    this.detailSelect = null;
    this.textModelSelect = null;
    this.countSelect = null;
    this.pacingSelect = null;
    this.styleSelect = null;
    this.langSelect = null;

    this.autoLoopCheckbox = null;
    this.autoIntervalSelect = null;
    this.autoStreamHUDCheckbox = null;
    this.btnToggleLoop = null;

    this.ttsEnableCheckbox = null;
    this.ttsPitchInput = null;
    this.ttsRateInput = null;
    this.ttsVolInput = null;
    this.btnTTSPreview = null;

    this.btnGenerate = null;
    this.btnStreamSeq = null;
    this.btnCopy = null;
    this.btnSendCaption = null;
    this.btnSendBubble = null;
    this.btnClear = null;

    this.outputBox = null;
    this.statusTag = null;
    this.latencyTag = null;
    this.thumbnailImg = null;
    this.visionTextElem = null;
    this.outputTextarea = null;

    this.sequenceTimeouts = [];
    this.lastCaptionsList = [];
    this.isStreamingSequence = false;
    this.isAutoLoopRunning = false;
    this.loopTimerId = null;
  }

  init() {
    this.visionModelSelect = document.getElementById('beta-synth-vision-model');
    this.detailSelect = document.getElementById('beta-synth-vision-detail');
    this.textModelSelect = document.getElementById('beta-synth-text-model');
    this.countSelect = document.getElementById('beta-synth-count');
    this.pacingSelect = document.getElementById('beta-synth-pacing');
    this.styleSelect = document.getElementById('beta-synth-style');
    this.langSelect = document.getElementById('beta-synth-language');

    this.autoLoopCheckbox = document.getElementById('beta-synth-auto-loop');
    this.autoIntervalSelect = document.getElementById('beta-synth-auto-interval');
    this.autoStreamHUDCheckbox = document.getElementById('beta-synth-auto-stream-hud');
    this.btnToggleLoop = document.getElementById('btn-beta-synth-toggle-loop');

    this.ttsEnableCheckbox = document.getElementById('beta-synth-tts-enable');
    this.ttsPitchInput = document.getElementById('beta-synth-tts-pitch');
    this.ttsRateInput = document.getElementById('beta-synth-tts-rate');
    this.ttsVolInput = document.getElementById('beta-synth-tts-volume');
    this.btnTTSPreview = document.getElementById('btn-beta-synth-tts-preview');

    this.btnGenerate = document.getElementById('btn-beta-synth-generate');
    this.btnStreamSeq = document.getElementById('btn-beta-synth-stream-seq');
    this.btnCopy = document.getElementById('btn-beta-synth-copy');
    this.btnSendCaption = document.getElementById('btn-beta-synth-send-caption');
    this.btnSendBubble = document.getElementById('btn-beta-synth-send-bubble');
    this.btnClear = document.getElementById('btn-beta-synth-clear');

    this.outputBox = document.getElementById('beta-synth-output-box');
    this.statusTag = document.getElementById('beta-synth-status-tag');
    this.latencyTag = document.getElementById('beta-synth-latency-tag');
    this.thumbnailImg = document.getElementById('beta-synth-thumbnail');
    this.visionTextElem = document.getElementById('beta-synth-vision-text');
    this.outputTextarea = document.getElementById('beta-synth-output-text');

    // Restore settings & bind change events
    if (this.ttsEnableCheckbox) {
      this.ttsEnableCheckbox.checked = !!this.currentSettings.synthTTSEnabled;
      this.ttsEnableCheckbox.addEventListener('change', () => {
        this.currentSettings.synthTTSEnabled = this.ttsEnableCheckbox.checked;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.ttsPitchInput && this.currentSettings.synthTTSPitch !== undefined) {
      this.ttsPitchInput.value = this.currentSettings.synthTTSPitch.toFixed(2);
      this.ttsPitchInput.addEventListener('change', () => {
        this.currentSettings.synthTTSPitch = parseFloat(this.ttsPitchInput.value) || 1.15;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.ttsRateInput && this.currentSettings.synthTTSRate !== undefined) {
      this.ttsRateInput.value = this.currentSettings.synthTTSRate.toFixed(2);
      this.ttsRateInput.addEventListener('change', () => {
        this.currentSettings.synthTTSRate = parseFloat(this.ttsRateInput.value) || 1.05;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.ttsVolInput && this.currentSettings.synthTTSVolume !== undefined) {
      this.ttsVolInput.value = Math.round(this.currentSettings.synthTTSVolume * 100);
      this.ttsVolInput.addEventListener('change', () => {
        this.currentSettings.synthTTSVolume = (parseFloat(this.ttsVolInput.value) || 100) / 100.0;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.btnTTSPreview) {
      this.btnTTSPreview.addEventListener('click', () => {
        this.handleTTSPreview();
      });
    }

    if (this.visionModelSelect && this.currentSettings.synthVisionModel) {
      this.visionModelSelect.value = this.currentSettings.synthVisionModel;
      this.visionModelSelect.addEventListener('change', () => {
        this.currentSettings.synthVisionModel = this.visionModelSelect.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.detailSelect && this.currentSettings.synthVisionDetail) {
      this.detailSelect.value = this.currentSettings.synthVisionDetail;
      this.detailSelect.addEventListener('change', () => {
        this.currentSettings.synthVisionDetail = this.detailSelect.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.textModelSelect && this.currentSettings.synthTextModel) {
      this.textModelSelect.value = this.currentSettings.synthTextModel;
      this.textModelSelect.addEventListener('change', () => {
        this.currentSettings.synthTextModel = this.textModelSelect.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.countSelect && this.currentSettings.synthCaptionCount) {
      this.countSelect.value = this.currentSettings.synthCaptionCount.toString();
      this.countSelect.addEventListener('change', () => {
        this.currentSettings.synthCaptionCount = parseInt(this.countSelect.value, 10) || 3;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.pacingSelect && this.currentSettings.synthCaptionPacing) {
      this.pacingSelect.value = this.currentSettings.synthCaptionPacing.toFixed(1);
      this.pacingSelect.addEventListener('change', () => {
        this.currentSettings.synthCaptionPacing = parseFloat(this.pacingSelect.value) || 3.0;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.autoIntervalSelect && this.currentSettings.synthAutoInterval) {
      this.autoIntervalSelect.value = this.currentSettings.synthAutoInterval.toString();
      this.autoIntervalSelect.addEventListener('change', () => {
        this.currentSettings.synthAutoInterval = parseInt(this.autoIntervalSelect.value, 10) || 15;
        if (this.saveSettingsFile) this.saveSettingsFile();
        if (this.isAutoLoopRunning) {
          this.startAutoLoop(); // Restart loop with new interval
        }
      });
    }

    if (this.autoStreamHUDCheckbox) {
      this.autoStreamHUDCheckbox.checked = this.currentSettings.synthAutoPlayHUD !== false;
      this.autoStreamHUDCheckbox.addEventListener('change', () => {
        this.currentSettings.synthAutoPlayHUD = this.autoStreamHUDCheckbox.checked;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.autoLoopCheckbox) {
      this.autoLoopCheckbox.checked = !!this.currentSettings.synthAutoLoop;
      this.autoLoopCheckbox.addEventListener('change', () => {
        this.currentSettings.synthAutoLoop = this.autoLoopCheckbox.checked;
        if (this.saveSettingsFile) this.saveSettingsFile();
        if (this.autoLoopCheckbox.checked) {
          this.startAutoLoop();
        } else {
          this.stopAutoLoop();
        }
      });
    }

    if (this.styleSelect && this.currentSettings.synthStyle) {
      this.styleSelect.value = this.currentSettings.synthStyle;
      this.styleSelect.addEventListener('change', () => {
        this.currentSettings.synthStyle = this.styleSelect.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    if (this.langSelect && this.currentSettings.synthLanguage) {
      this.langSelect.value = this.currentSettings.synthLanguage;
      this.langSelect.addEventListener('change', () => {
        this.currentSettings.synthLanguage = this.langSelect.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
      });
    }

    // Action button listeners
    if (this.btnGenerate) {
      this.btnGenerate.addEventListener('click', () => {
        this.handleGenerate({ isAuto: false });
      });
    }

    if (this.btnToggleLoop) {
      this.btnToggleLoop.addEventListener('click', () => {
        this.toggleAutoLoop();
      });
    }

    if (this.btnStreamSeq) {
      this.btnStreamSeq.addEventListener('click', () => {
        this.startSequentialStream();
      });
    }

    if (this.btnCopy) {
      this.btnCopy.addEventListener('click', () => {
        if (this.outputTextarea && this.outputTextarea.value) {
          navigator.clipboard.writeText(this.outputTextarea.value);
          this.updateStatus('📋 Captions copied to clipboard!');
        }
      });
    }

    if (this.btnSendCaption) {
      this.btnSendCaption.addEventListener('click', () => {
        this.handleSendToCaptionWindow();
      });
    }

    if (this.btnSendBubble) {
      this.btnSendBubble.addEventListener('click', () => {
        this.handleSendToMascotBubble();
      });
    }

    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => {
        this.clearOutput();
      });
    }

    // Auto-start loop if enabled in saved settings
    if (this.currentSettings.synthAutoLoop) {
      setTimeout(() => this.startAutoLoop(), 2000);
    }
  }

  /**
   * Starts hands-free continuous auto-capturing and caption synthesis loop.
   */
  startAutoLoop() {
    this.stopAutoLoop();
    this.isAutoLoopRunning = true;

    if (this.autoLoopCheckbox) this.autoLoopCheckbox.checked = true;
    if (this.btnToggleLoop) {
      this.btnToggleLoop.innerText = '⏹️ Stop Loop';
      this.btnToggleLoop.style.background = 'rgba(239, 68, 68, 0.2)';
      this.btnToggleLoop.style.color = '#ef4444';
      this.btnToggleLoop.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    }

    const intervalSec = parseInt(this.autoIntervalSelect?.value || this.currentSettings.synthAutoInterval || 15, 10);
    const intervalMs = Math.max(5000, intervalSec * 1000);

    this.updateStatus(`🔄 Auto-Loop active (Every ${intervalSec}s)`);

    // Run first generation immediately
    this.handleGenerate({ isAuto: true });

    // Schedule continuous recurring cycle
    this.loopTimerId = setInterval(() => {
      if (!this.isAutoLoopRunning) return;
      this.handleGenerate({ isAuto: true });
    }, intervalMs);
  }

  /**
   * Stops the continuous auto-capturing loop.
   */
  stopAutoLoop() {
    if (this.loopTimerId) {
      clearInterval(this.loopTimerId);
      this.loopTimerId = null;
    }
    this.isAutoLoopRunning = false;

    if (this.autoLoopCheckbox) this.autoLoopCheckbox.checked = false;
    if (this.btnToggleLoop) {
      this.btnToggleLoop.innerText = '▶ Start Loop';
      this.btnToggleLoop.style.background = '';
      this.btnToggleLoop.style.color = '';
      this.btnToggleLoop.style.borderColor = '';
    }
    this.updateStatus('⏸️ Auto-Loop paused');
  }

  toggleAutoLoop() {
    if (this.isAutoLoopRunning) {
      this.stopAutoLoop();
      this.currentSettings.synthAutoLoop = false;
    } else {
      this.startAutoLoop();
      this.currentSettings.synthAutoLoop = true;
    }
    if (this.saveSettingsFile) this.saveSettingsFile();
  }

  /**
   * Triggers the full synthesis pipeline.
   */
  async handleGenerate({ isAuto = false } = {}) {
    if (this.isGenerating || visionCaptionSynthesizerService.isProcessing) return;

    this.stopSequentialStream();
    this.isGenerating = true;
    if (this.btnGenerate && !isAuto) {
      this.btnGenerate.disabled = true;
      this.btnGenerate.innerText = '⏳ Synthesizing Captions...';
    }

    if (this.outputBox) this.outputBox.style.display = 'flex';
    this.updateStatus(isAuto ? '📸 Auto-Snapshot & Synthesizing...' : '📸 Capturing screen & analyzing neural vision...');
    if (this.outputTextarea) {
      this.outputTextarea.value = 'Step 1: Visual scene analysis in progress...\nStep 2: LLM caption synthesis queued...';
    }

    const visionModel = this.visionModelSelect ? this.visionModelSelect.value : 'moondream';
    const detail = this.detailSelect ? this.detailSelect.value : 'medium';
    const textModel = this.textModelSelect ? this.textModelSelect.value : 'llama3.2';
    const style = this.styleSelect ? this.styleSelect.value : 'streamer';
    const count = this.countSelect ? parseInt(this.countSelect.value, 10) || 3 : 3;
    const language = this.langSelect ? this.langSelect.value : 'auto';

    try {
      const result = await visionCaptionSynthesizerService.synthesize({
        visionModel,
        detail,
        textModel,
        style,
        count,
        language,
        onStatus: (status) => this.updateStatus(status)
      });

      if (result.success) {
        this.lastCaptionsList = result.captionsList || [];
        if (this.thumbnailImg && result.thumbnail) {
          this.thumbnailImg.src = result.thumbnail;
        }
        if (this.visionTextElem) {
          this.visionTextElem.innerText = result.visionDescription || 'Visual analysis complete.';
        }
        if (this.outputTextarea) {
          this.outputTextarea.value = result.captionText || result.visionDescription;
        }
        if (this.latencyTag) {
          this.latencyTag.innerText = `${result.durationMs}ms`;
        }
        if (this.statusTag) {
          this.statusTag.style.color = '#10b981';
          this.statusTag.innerText = `✅ Synthesized ${result.captionsList?.length || 1} caption(s)`;
        }

        // Auto-play captions sequentially into floating caption HUD if enabled
        const shouldAutoPlay = this.autoStreamHUDCheckbox ? this.autoStreamHUDCheckbox.checked : (this.currentSettings.synthAutoPlayHUD !== false);
        if (shouldAutoPlay && this.lastCaptionsList.length > 0) {
          this.startSequentialStream(this.lastCaptionsList);
        }
      } else {
        if (this.statusTag) {
          this.statusTag.style.color = '#ef4444';
          this.statusTag.innerText = '❌ Synthesis Failed';
        }
        if (this.outputTextarea) {
          this.outputTextarea.value = `Error: ${result.error || 'Unknown synthesis failure'}`;
        }
      }
    } catch (err) {
      if (this.statusTag) {
        this.statusTag.style.color = '#ef4444';
        this.statusTag.innerText = '❌ Error';
      }
      if (this.outputTextarea) {
        this.outputTextarea.value = `Error: ${err.message}`;
      }
    } finally {
      this.isGenerating = false;
      if (this.btnGenerate) {
        this.btnGenerate.disabled = false;
        this.btnGenerate.innerText = '📸 Generate Once';
      }
    }
  }

  /**
   * Sequentially streams caption sentences one-by-one to the independent floating window,
   * cleanly wiping out old captions at the user-configured speed/pacing.
   */
  startSequentialStream(explicitList = null) {
    this.stopSequentialStream();

    let list = explicitList;
    if (!list || list.length === 0) {
      if (this.outputTextarea && this.outputTextarea.value.trim()) {
        list = this.outputTextarea.value
          .split(/\r?\n\n+|\r?\n+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      } else {
        list = this.lastCaptionsList;
      }
    }

    if (!list || list.length === 0) {
      this.updateStatus('⚠️ No captions to stream');
      return;
    }

    const pacingSec = parseFloat(this.pacingSelect?.value || this.currentSettings.synthCaptionPacing || 3.0);
    const pacingMs = Math.max(800, Math.round(pacingSec * 1000));
    const model = this.textModelSelect ? this.textModelSelect.value : 'LLM Synth';
    const api = window.electronAPI;

    this.isStreamingSequence = true;

    if (this.btnStreamSeq) {
      this.btnStreamSeq.innerText = `⏹️ Streaming (1/${list.length})...`;
    }

    const isTTSEnabled = this.ttsEnableCheckbox ? this.ttsEnableCheckbox.checked : !!this.currentSettings.synthTTSEnabled;
    const lang = this.langSelect ? this.langSelect.value : (this.currentSettings.synthLanguage || 'auto');
    const pitch = parseFloat(this.ttsPitchInput?.value || this.currentSettings.synthTTSPitch || 1.15);
    const rate = parseFloat(this.ttsRateInput?.value || this.currentSettings.synthTTSRate || 1.05);
    const volume = (parseFloat(this.ttsVolInput?.value || 100)) / 100.0;

    list.forEach((sentence, idx) => {
      const timeoutId = setTimeout(() => {
        if (!this.isStreamingSequence) return;

        if (api && typeof api.send === 'function') {
          api.send('broadcast-live-caption', {
            text: sentence,
            index: idx,
            total: list.length,
            counter: `[${idx + 1}/${list.length}]`,
            model,
            source: 'SYNTHESIZER'
          });
        }

        // Trigger Voice Synthesis (TTS) if enabled
        if (isTTSEnabled) {
          speechSynthesisService.speak(sentence, { language: lang, pitch, rate, volume });
        }

        if (this.btnStreamSeq) {
          this.btnStreamSeq.innerText = `⏹️ Streaming (${idx + 1}/${list.length})...`;
        }
        this.updateStatus(`📡 Subtitle [${idx + 1}/${list.length}]: "${sentence.slice(0, 25)}..."`);

        // If this is the final caption in the sequence
        if (idx === list.length - 1) {
          const finishTimeout = setTimeout(() => {
            this.isStreamingSequence = false;
            if (this.btnStreamSeq) {
              this.btnStreamSeq.innerText = '▶ Stream Sequentially';
            }
            this.updateStatus('✅ Sequential stream completed');
          }, pacingMs);
          this.sequenceTimeouts.push(finishTimeout);
        }
      }, idx * pacingMs);

      this.sequenceTimeouts.push(timeoutId);
    });
  }

  stopSequentialStream() {
    this.sequenceTimeouts.forEach(t => clearTimeout(t));
    this.sequenceTimeouts = [];
    this.isStreamingSequence = false;
    speechSynthesisService.stop();
    if (this.btnStreamSeq) {
      this.btnStreamSeq.innerText = '▶ Stream Sequentially';
    }
  }

  handleTTSPreview() {
    const lang = this.langSelect ? this.langSelect.value : (this.currentSettings.synthLanguage || 'auto');
    const pitch = parseFloat(this.ttsPitchInput?.value || this.currentSettings.synthTTSPitch || 1.15);
    const rate = parseFloat(this.ttsRateInput?.value || this.currentSettings.synthTTSRate || 1.05);
    const volume = (parseFloat(this.ttsVolInput?.value || 100)) / 100.0;

    let sampleText = "Hello! Voice dubbing and mascot lip-sync are now active.";
    if (lang === 'zh-TW' || lang === 'zh_TW') {
      sampleText = "太神啦！即時語音旁白與桌寵同步講話已經開啟！";
    } else if (lang === 'zh' || lang === 'zh-CN') {
      sampleText = "你好！实时语音旁白与桌宠同步说话已经就绪！";
    } else if (lang === 'ja') {
      sampleText = "こんにちは！リアルタイム音声読み上げとマスコット同期が有効です。";
    } else if (lang === 'ko') {
      sampleText = "안녕하세요! 실시간 음성 더빙이 활성화되었습니다.";
    }

    this.updateStatus(`🔊 Playing voice test preview (${lang})...`);
    speechSynthesisService.speak(sampleText, {
      language: lang,
      pitch,
      rate,
      volume,
      onEnd: () => {
        this.updateStatus('✅ Voice preview completed');
      }
    });
  }

  handleSendToCaptionWindow() {
    if (!this.outputTextarea || !this.outputTextarea.value.trim()) return;
    const cleanText = this.outputTextarea.value.trim();
    const firstCaption = cleanText.split('\n\n')[0] || cleanText;

    const api = window.electronAPI;
    if (api && typeof api.send === 'function') {
      api.send('broadcast-live-caption', {
        text: firstCaption,
        model: this.textModelSelect ? this.textModelSelect.value : 'LLM Synth',
        source: 'SYNTHESIZER'
      });
      this.updateStatus('🪟 Single caption sent to floating window!');
    }
  }

  handleSendToMascotBubble() {
    if (!this.outputTextarea || !this.outputTextarea.value.trim()) return;
    const cleanText = this.outputTextarea.value.trim();
    const firstCaption = cleanText.split('\n\n')[0] || cleanText;

    showSpeechBubble(firstCaption, 5000);

    const isTTSEnabled = this.ttsEnableCheckbox ? this.ttsEnableCheckbox.checked : !!this.currentSettings.synthTTSEnabled;
    if (isTTSEnabled) {
      const lang = this.langSelect ? this.langSelect.value : (this.currentSettings.synthLanguage || 'auto');
      const pitch = parseFloat(this.ttsPitchInput?.value || this.currentSettings.synthTTSPitch || 1.15);
      const rate = parseFloat(this.ttsRateInput?.value || this.currentSettings.synthTTSRate || 1.05);
      const volume = (parseFloat(this.ttsVolInput?.value || 100)) / 100.0;
      speechSynthesisService.speak(firstCaption, { language: lang, pitch, rate, volume });
    }

    this.updateStatus('🐾 Displaying in mascot speech bubble!');
  }

  clearOutput() {
    this.stopSequentialStream();
    if (this.outputTextarea) this.outputTextarea.value = '';
    if (this.visionTextElem) this.visionTextElem.innerText = 'Awaiting generation...';
    if (this.thumbnailImg) this.thumbnailImg.src = '';
    this.lastCaptionsList = [];

    const api = window.electronAPI;
    if (api && typeof api.send === 'function') {
      api.send('clear-live-caption');
    }
    this.updateStatus('🧹 Output and caption HUD cleared');
  }

  updateStatus(msg) {
    if (this.statusTag) {
      this.statusTag.innerText = msg;
      this.statusTag.style.color = '#38bdf8';
    }
  }
}

export let visionCaptionSynthesizerBetaUI = null;

export function setupVisionCaptionSynthesizerBetaUI(deps = {}) {
  visionCaptionSynthesizerBetaUI = new VisionCaptionSynthesizerBetaUI(deps);
  visionCaptionSynthesizerBetaUI.init();
  return visionCaptionSynthesizerBetaUI;
}
