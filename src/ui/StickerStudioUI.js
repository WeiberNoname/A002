/**
 * StickerStudioUI.js (ImageStudioUI)
 * 
 * Clean, dedicated UI Controller for the Local Neural Image Studio.
 * Focuses purely on local offline image generation without sticker bloatware.
 * Features:
 * - 100% Offline text-to-image synthesis with painterly styles (Watercolor, Anime, Pixel Art, Landscape, Oil, Cyberpunk)
 * - Enter-to-generate responsive prompt bar
 * - One-click actions: Copy PNG to clipboard, Save PNG to disk, Post to chat
 */

export class ImageStudioUI {
  constructor(deps = {}) {
    this.imageGenService = deps.imageGenService || null;
    this.currentSettings = deps.currentSettings || {};
    this.onSendToChat = deps.onSendToChat || (() => {});

    this.state = {
      mode: 'txt2img',
      prompt: '',
      imageStyle: 'auto',
      imageProvider: 'auto',
      lastDataUrl: null
    };

    this.isGenerating = false;
  }

  /**
   * Initializes DOM event listeners and binds controls.
   */
  init() {
    if (typeof document === 'undefined') return;

    this.panel = document.getElementById('sticker-studio-panel');
    this.previewImg = document.getElementById('studio-preview-img');
    this.promptInput = document.getElementById('studio-prompt-input');
    this.statusBadge = document.getElementById('studio-status-badge');
    this.styleSelect = document.getElementById('studio-image-style');
    this.providerSelect = document.getElementById('studio-image-provider');

    // 1. Neural Prompt Input (Enter key triggers generation)
    if (this.promptInput) {
      this.promptInput.addEventListener('input', () => {
        this.state.prompt = this.promptInput.value;
      });
      this.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.generateTxt2Img();
        }
      });
    }

    // 2. Generate Button
    const btnGenerate = document.getElementById('btn-studio-generate-txt2img');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        this.generateTxt2Img();
      });
    }

    // 3. Style & Provider Selectors
    if (this.styleSelect) {
      this.styleSelect.addEventListener('change', () => {
        this.state.imageStyle = this.styleSelect.value;
      });
    }

    if (this.providerSelect) {
      this.providerSelect.addEventListener('change', () => {
        this.state.imageProvider = this.providerSelect.value;
      });
    }

    // 4. Action Bar Buttons
    const btnCopy = document.getElementById('btn-studio-copy');
    const btnSave = document.getElementById('btn-studio-save');
    const btnChat = document.getElementById('btn-studio-chat');

    const showToast = (msg) => {
      const toast = document.getElementById('studio-toast');
      if (toast) {
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2200);
      }
    };

    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        if (!this.state.lastDataUrl) {
          showToast('⚠️ Generate an image first!');
          return;
        }
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            const res = await fetch(this.state.lastDataUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('✓ Copied to clipboard!');
          }
        } catch (e) {
          showToast('⚠️ Copy failed');
        }
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        if (!this.state.lastDataUrl) {
          showToast('⚠️ Generate an image first!');
          return;
        }
        const a = document.createElement('a');
        a.href = this.state.lastDataUrl;
        const styleSlug = this.state.imageStyle || 'art';
        a.download = `local-image-${styleSlug}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('💾 PNG saved!');
      });
    }

    if (btnChat) {
      btnChat.addEventListener('click', () => {
        if (this.state.prompt) {
          this.onSendToChat(`/draw ${this.state.prompt}`);
        } else {
          this.onSendToChat('Draw me a lovely picture');
        }
        showToast('💬 Sent to chat!');
      });
    }

    // 5. Studio Open / Close Toggle Button
    const btnToggle = document.getElementById('btn-toggle-sticker-studio') || document.getElementById('btn-toggle-image-studio');
    const btnClose = document.getElementById('btn-close-sticker-studio');

    if (btnToggle && this.panel) {
      btnToggle.addEventListener('click', () => {
        const isHidden = this.panel.style.display === 'none' || !this.panel.style.display;
        this.panel.style.display = isHidden ? 'block' : 'none';
        if (isHidden && this.promptInput) {
          this.promptInput.focus();
        }
      });
    }

    if (btnClose && this.panel) {
      btnClose.addEventListener('click', () => {
        this.panel.style.display = 'none';
      });
    }
  }

  /**
   * Generates txt2img via LocalImageGenService.
   */
  async generateTxt2Img() {
    if (!this.imageGenService || this.isGenerating) return;

    const trimmedPrompt = (this.state.prompt || (this.promptInput ? this.promptInput.value : '')).trim();
    if (!trimmedPrompt) {
      if (this.statusBadge) this.statusBadge.innerHTML = '⚠️ Please enter an image prompt first!';
      if (this.promptInput) this.promptInput.focus();
      return;
    }
    this.state.prompt = trimmedPrompt;
    this.isGenerating = true;

    const btn = typeof document !== 'undefined' ? document.getElementById('btn-studio-generate-txt2img') : null;
    const provider = this.providerSelect ? this.providerSelect.value : (this.state.imageProvider || 'auto');
    const style = this.styleSelect ? this.styleSelect.value : (this.state.imageStyle || 'auto');

    if (btn) btn.innerHTML = '⏳ Generating...';
    if (this.statusBadge) this.statusBadge.innerHTML = '🔄 Synthesizing artistic image...';

    try {
      const res = await this.imageGenService.generateImage(trimmedPrompt, {
        width: 370,
        height: 320,
        provider,
        style
      });

      this.state.lastDataUrl = res.dataUrl;
      if (this.previewImg) {
        this.previewImg.src = res.dataUrl;
        this.previewImg.style.display = 'block';
      }

      const sourceLabels = {
        sd_webui: '🖥️ Local SD WebUI',
        comfyui: '⚙️ Local ComfyUI',
        procedural: '🎨 Built-in Offline Engine'
      };
      const label = sourceLabels[res.source] || res.source;
      const styleDisplay = res.style ? ` [${res.style}]` : '';
      if (this.statusBadge) {
        this.statusBadge.innerHTML = `🟢 <b>${label}${styleDisplay}</b>: "${res.prompt}"`;
      }
    } catch (err) {
      if (this.statusBadge) {
        this.statusBadge.innerHTML = `⚠️ Generation failed: ${err.message}`;
      }
    } finally {
      this.isGenerating = false;
      if (btn) btn.innerHTML = '⚡ Generate';
    }
  }
}

// Backward-compatible export alias
export const StickerStudioUI = ImageStudioUI;
