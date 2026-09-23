/**
 * DirectChatUI.js
 * 
 * Manages direct desktop typing & companion conversation without opening the Settings modal.
 * Coordinates 3D mail delivery animations and the mascot's auto-fading speech bubble.
 * 
 * Features:
 * - Direct floating chat input on desktop
 * - 3D mail flight animation to mascot upon message dispatch
 * - Mascot return mail flight upon AI response completion
 * - Envelope opening into a speech bubble with auto-fadeout timer
 * - Seamless Electron click-through focus tracking
 */

import { soundManager } from '../core/SoundManager.js';

export class DirectChatUI {
  constructor(options = {}) {
    this.directorEngine = options.directorEngine || null;
    this.mascotMailService = options.mascotMailService || null;
    this.camera = options.camera || null;
    this.characterGroup = options.characterGroup || null;
    this.currentSettings = options.currentSettings || {};
    this.speechSynthesisService = options.speechSynthesisService || null;
    this.onMascotReact = options.onMascotReact || null;
    this.chatFont = this.currentSettings.mascotChatFont || 'inherit';
    this.chatFontSize = parseInt(this.currentSettings.mascotChatFontSize, 10) || 14;

    this.container = null;
    this.input = null;
    this.btnSend = null;
    this.btnToggle = null;
    this.btnHistory = null;
    this.thinkingEl = null;

    this.bubbleEl = null;
    this.bubbleText = null;
    this.bubbleClose = null;
    this.bubbleSpeak = null;
    this.bubbleCopy = null;

    this.letterboxDrawer = null;
    this.letterboxList = null;
    this.letterboxClose = null;

    this.fadeTimeout = null;
    this.isProcessing = false;
    this.isChatOpen = true;
    this.isBubbleHovered = false;
    this.lettersHistory = [];
  }

  /**
   * Initializes DOM elements, event listeners, and focus tracking.
   */
  init() {
    if (typeof document === 'undefined') return;

    this.container = document.getElementById('desktop-direct-chat-container');
    this.input = document.getElementById('direct-chat-input');
    this.btnSend = document.getElementById('direct-chat-send');
    this.btnToggle = document.getElementById('direct-chat-toggle');
    this.btnHistory = document.getElementById('direct-chat-history');
    this.btnFont = document.getElementById('direct-chat-font-btn');
    this.fontMenu = document.getElementById('direct-chat-font-menu');
    this.btnOpenStudioFont = document.getElementById('btn-open-studio-font-settings');
    this.thinkingEl = document.getElementById('direct-chat-thinking');

    this.bubbleEl = document.getElementById('mascot-speech-bubble');
    this.bubbleText = document.getElementById('speech-bubble-text');
    this.bubbleClose = document.getElementById('speech-bubble-close');
    this.bubbleSpeak = document.getElementById('speech-bubble-speak');
    this.bubbleCopy = document.getElementById('speech-bubble-copy');

    this.letterboxDrawer = document.getElementById('mascot-letterbox-drawer');
    this.letterboxList = document.getElementById('letterbox-list');
    this.letterboxClose = document.getElementById('letterbox-close');

    // 1. Send Message Listeners
    if (this.btnSend && this.input) {
      this.btnSend.addEventListener('click', () => this.handleSendMessage());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // 2. Toggle Chat Bar Minimize / Expand
    if (this.btnToggle && this.container) {
      this.btnToggle.addEventListener('click', () => {
        this.isChatOpen = !this.isChatOpen;
        this.container.classList.toggle('minimized', !this.isChatOpen);
        if (this.isChatOpen && this.input) {
          this.input.focus();
        }
      });
    }

    // 2b. Quick Font Menu Toggle & Selection
    if (this.btnFont && this.fontMenu) {
      this.btnFont.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = this.fontMenu.classList.toggle('hidden');
        if (!isHidden) {
          const presets = this.fontMenu.querySelectorAll('.font-preset-btn');
          presets.forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-font') === (this.chatFont || 'inherit'));
          });
        }
      });

      const presets = this.fontMenu.querySelectorAll('.font-preset-btn');
      presets.forEach(p => {
        p.addEventListener('click', (e) => {
          e.stopPropagation();
          const font = p.getAttribute('data-font');
          this.applyFont(font);
          const mascotChatFontSelect = document.getElementById('mascot-chat-font');
          if (mascotChatFontSelect) {
            mascotChatFontSelect.value = font;
            mascotChatFontSelect.dispatchEvent(new Event('change'));
          }
          this.fontMenu.classList.add('hidden');
        });
      });

      document.addEventListener('click', (e) => {
        if (this.fontMenu && !this.fontMenu.contains(e.target) && e.target !== this.btnFont) {
          this.fontMenu.classList.add('hidden');
        }
      });
    }

    if (this.btnOpenStudioFont) {
      this.btnOpenStudioFont.addEventListener('click', () => {
        if (this.fontMenu) this.fontMenu.classList.add('hidden');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsPanel = document.getElementById('settings-panel');
        if (settingsPanel && settingsPanel.classList.contains('hidden') && settingsBtn) {
          settingsBtn.click();
        }
        const studioTabBtn = document.querySelector('.studio-tab-btn[data-tab="tab-display"]');
        if (studioTabBtn) studioTabBtn.click();
        const targetCard = document.getElementById('mascot-mail-chat-card');
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.7)';
          setTimeout(() => { targetCard.style.boxShadow = ''; }, 2500);
        }
      });
    }

    // 3. Mailbox / Letterbox Archive Toggle
    if (this.btnHistory && this.letterboxDrawer) {
      this.btnHistory.addEventListener('click', () => {
        this.toggleLetterbox();
      });
    }
    if (this.letterboxClose && this.letterboxDrawer) {
      this.letterboxClose.addEventListener('click', () => {
        this.closeLetterbox();
      });
    }

    // 4. Speech Bubble Action Buttons
    if (this.bubbleClose) {
      this.bubbleClose.addEventListener('click', () => {
        this.hideSpeechBubble();
      });
    }

    if (this.bubbleSpeak) {
      this.bubbleSpeak.addEventListener('click', () => {
        this.speakCurrentBubble();
      });
    }

    if (this.bubbleCopy) {
      this.bubbleCopy.addEventListener('click', () => {
        this.copyCurrentBubble();
      });
    }

    // 5. Hover Pause / Resume on Speech Bubble
    if (this.bubbleEl) {
      this.bubbleEl.addEventListener('mouseenter', () => {
        this.isBubbleHovered = true;
        if (this.fadeTimeout) {
          clearTimeout(this.fadeTimeout);
          this.fadeTimeout = null;
        }
      });

      this.bubbleEl.addEventListener('mouseleave', () => {
        this.isBubbleHovered = false;
        // Resume fadeout after 4 seconds of leaving
        this.scheduleFadeout(4500);
      });
    }

    // 6. Global Keyboard Shortcuts (<Enter> to focus, <Escape> to close overlays)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideSpeechBubble();
        this.closeLetterbox();
      } else if (e.key === 'Enter' && document.activeElement === document.body) {
        if (this.container && !this.isChatOpen) {
          this.isChatOpen = true;
          this.container.classList.remove('minimized');
        }
        if (this.input) {
          this.input.focus();
        }
      }
    });

    // 7. Electron Click-Through & Focus Tracking
    const setFocusState = (isFocused) => {
      if (typeof window !== 'undefined') {
        window.isHoveringDirectChat = isFocused;
        if (typeof window.updateIgnoreMouseState === 'function') {
          window.updateIgnoreMouseState();
        }
      }
    };

    if (this.container) {
      this.container.addEventListener('mouseenter', () => setFocusState(true));
      this.container.addEventListener('mouseleave', () => {
        if (!this.input || document.activeElement !== this.input) {
          setFocusState(false);
        }
      });
    }

    if (this.input) {
      this.input.addEventListener('focus', () => setFocusState(true));
      this.input.addEventListener('blur', () => setFocusState(false));
    }

    if (this.bubbleEl) {
      this.bubbleEl.addEventListener('mouseenter', () => setFocusState(true));
      this.bubbleEl.addEventListener('mouseleave', () => setFocusState(false));
    }

    if (this.letterboxDrawer) {
      this.letterboxDrawer.addEventListener('mouseenter', () => setFocusState(true));
      this.letterboxDrawer.addEventListener('mouseleave', () => setFocusState(false));
    }

    // 8. Apply Mascot Mail Chat Font & Size
    this.applyFont(this.currentSettings.mascotChatFont || this.chatFont || 'inherit', this.currentSettings.mascotChatFontSize || this.chatFontSize || 14);
  }

  /**
   * Dispatches user message, triggers 3D flight to mascot, and awaits AI response.
   */
  async handleSendMessage() {
    if (!this.input || this.isProcessing) return;

    const rawText = this.input.value.trim();
    if (!rawText) return;

    this.input.value = '';
    this.isProcessing = true;
    if (this.btnSend) this.btnSend.disabled = true;

    // Play synthesized airy flight swoosh
    soundManager.playMailWhoosh();

    // Calculate start screen position from input / send button
    let startScreenPos = { x: window.innerWidth / 2, y: window.innerHeight - 40 };
    if (this.btnSend) {
      const rect = this.btnSend.getBoundingClientRect();
      startScreenPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    // Hide any previous bubble while new message is in flight
    this.hideSpeechBubble();

    // 1. Send 3D Mail from User to Mascot
    if (this.mascotMailService) {
      this.mascotMailService.sendUserMail(startScreenPos, () => {
        // Mail arrived at mascot! Mascot acknowledges receipt with a joyful reaction
        if (typeof this.onMascotReact === 'function') {
          try { this.onMascotReact(); } catch (e) { console.warn('Mascot reaction error:', e); }
        }
      });
    }

    // Show thinking quill indicator while waiting for response
    if (this.thinkingEl) {
      this.thinkingEl.classList.remove('hidden');
    }

    try {
      // 2. Process message through LLM Director Engine
      let responseText = '✨ ...';
      if (this.directorEngine && typeof this.directorEngine.processUserMessage === 'function') {
        const res = await this.directorEngine.processUserMessage(rawText);
        if (res && res.content) {
          responseText = res.content;
        }
      }

      // Hide thinking quill
      if (this.thinkingEl) {
        this.thinkingEl.classList.add('hidden');
      }

      // 3. Mascot sends 3D Mail back toward user
      const targetPos = { x: window.innerWidth / 2, y: window.innerHeight - 80 };
      if (this.mascotMailService) {
        // Launch return mail whoosh sound
        soundManager.playMailWhoosh();

        this.mascotMailService.sendMascotMail(targetPos, () => {
          // Return mail arrives and opens: Play wax seal pop & crystal chime
          soundManager.playMailOpenChime();
          this.recordLetter(responseText);
          this.showSpeechBubble(responseText);
        });
      } else {
        soundManager.playMailOpenChime();
        this.recordLetter(responseText);
        this.showSpeechBubble(responseText);
      }
    } catch (err) {
      console.warn('Direct chat error:', err);
      if (this.thinkingEl) this.thinkingEl.classList.add('hidden');
      this.showSpeechBubble('⚠️ Something went wrong, please try again.');
    } finally {
      this.isProcessing = false;
      if (this.btnSend) this.btnSend.disabled = false;
    }
  }

  /**
   * Records a received letter into the mailbox archive.
   */
  recordLetter(text) {
    const d = new Date();
    const formattedTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const letter = { text, timestamp: Date.now(), formattedTime };
    this.lettersHistory.unshift(letter);
    if (this.lettersHistory.length > 20) {
      this.lettersHistory.pop();
    }
    this.renderLetterbox();
  }

  /**
   * Toggles the Letterbox drawer overlay.
   */
  toggleLetterbox() {
    if (!this.letterboxDrawer) return;
    const isHidden = this.letterboxDrawer.classList.contains('hidden');
    if (isHidden) {
      this.renderLetterbox();
      this.letterboxDrawer.classList.remove('hidden');
    } else {
      this.closeLetterbox();
    }
  }

  closeLetterbox() {
    if (this.letterboxDrawer) {
      this.letterboxDrawer.classList.add('hidden');
    }
  }

  /**
   * Renders recent letters in the Letterbox drawer.
   */
  renderLetterbox() {
    if (!this.letterboxList) return;
    if (!this.lettersHistory || this.lettersHistory.length === 0) {
      this.letterboxList.innerHTML = '<div class="letterbox-empty">No letters in your mailbox yet. Send a message to start!</div>';
      return;
    }

    this.letterboxList.innerHTML = '';
    this.lettersHistory.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'letter-card';
      card.innerHTML = `
        <div class="letter-card-time">💌 ${item.formattedTime}</div>
        <div class="letter-card-content">${item.text}</div>
      `;
      card.addEventListener('click', () => {
        this.showSpeechBubble(item.text, 8000);
        this.closeLetterbox();
      });
      this.letterboxList.appendChild(card);
    });
  }

  /**
   * Reads aloud current speech bubble content using SpeechSynthesis.
   */
  speakCurrentBubble() {
    if (!this.bubbleText) return;
    const text = this.bubbleText.innerText;
    if (!text) return;

    if (this.speechSynthesisService && typeof this.speechSynthesisService.speak === 'function') {
      this.speechSynthesisService.speak(text, {
        pitch: this.currentSettings ? this.currentSettings.mascotVoicePitch : null,
        rate: this.currentSettings ? this.currentSettings.mascotVoiceRate : null,
        voiceName: this.currentSettings ? this.currentSettings.mascotVoiceName : null,
        preset: this.currentSettings ? this.currentSettings.mascotVoicePreset : null
      });
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.currentSettings && this.currentSettings.mascotVoicePitch) {
        utterance.pitch = this.currentSettings.mascotVoicePitch;
      }
      if (this.currentSettings && this.currentSettings.mascotVoiceRate) {
        utterance.rate = this.currentSettings.mascotVoiceRate;
      }
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Copies current speech bubble content to clipboard.
   */
  async copyCurrentBubble() {
    if (!this.bubbleText || !this.bubbleCopy) return;
    const text = this.bubbleText.innerText;
    if (!text) return;

    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        const originalTitle = this.bubbleCopy.title;
        const originalText = this.bubbleCopy.innerText;
        this.bubbleCopy.innerText = '✓';
        this.bubbleCopy.title = 'Copied!';
        setTimeout(() => {
          this.bubbleCopy.innerText = originalText;
          this.bubbleCopy.title = originalTitle;
        }, 1500);
      }
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  }

  /**
   * Displays the speech bubble with auto-fadeout timer.
   * @param {string} text
   * @param {number} [duration]
   */
  showSpeechBubble(text, duration) {
    if (!this.bubbleEl || !this.bubbleText) return;

    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    this.bubbleText.innerText = text;
    this.bubbleEl.classList.remove('hidden', 'fade-out');
    this.bubbleEl.classList.add('pop-in');

    this.updatePosition();

    // Auto-fadeout duration: dynamic based on text length (minimum 5s, max 12s)
    const readDuration = duration || Math.min(12000, Math.max(5500, text.length * 85));
    this.scheduleFadeout(readDuration);
  }

  /**
   * Schedules a fadeout after a set delay unless hovered.
   */
  scheduleFadeout(delay) {
    if (this.isBubbleHovered) return;
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
    this.fadeTimeout = setTimeout(() => {
      this.hideSpeechBubble();
    }, delay);
  }

  /**
   * Fades out and hides the speech bubble.
   */
  hideSpeechBubble() {
    if (!this.bubbleEl) return;
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    this.bubbleEl.classList.remove('pop-in');
    this.bubbleEl.classList.add('fade-out');
    setTimeout(() => {
      if (this.bubbleEl.classList.contains('fade-out')) {
        this.bubbleEl.classList.add('hidden');
        this.bubbleEl.classList.remove('fade-out');
      }
    }, 400);
  }

  /**
   * Updates bubble position relative to mascot's projected 3D coordinates.
   */
  updatePosition() {
    if (!this.bubbleEl || this.bubbleEl.classList.contains('hidden') || !this.characterGroup || !this.camera || !this.THREE) {
      return;
    }

    try {
      const pos = this.characterGroup.position.clone();
      pos.y += 0.85; // Position above head

      pos.project(this.camera);

      const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;

      // Clamp within screen boundaries
      const clampedX = Math.max(16, Math.min(window.innerWidth - 260, x - 120));
      const clampedY = Math.max(16, Math.min(window.innerHeight - 130, y - 60));

      this.bubbleEl.style.left = `${clampedX}px`;
      this.bubbleEl.style.top = `${clampedY}px`;
    } catch (e) {
      // Fallback center top
    }
  }

  /**
   * Applies the chat font family and font size across speech bubble, direct chat input, preview box, and letterbox drawer.
   * @param {string} [fontFamily]
   * @param {number|string} [fontSize]
   */
  applyFont(fontFamily, fontSize) {
    if (fontFamily !== undefined && fontFamily !== null) {
      this.chatFont = (fontFamily && fontFamily !== 'default') ? fontFamily : 'inherit';
      if (this.currentSettings) {
        this.currentSettings.mascotChatFont = this.chatFont;
      }
    }
    if (fontSize !== undefined && fontSize !== null) {
      this.chatFontSize = parseInt(fontSize, 10) || 14;
      if (this.currentSettings) {
        this.currentSettings.mascotChatFontSize = this.chatFontSize;
      }
    }

    const effectiveFont = (this.chatFont && this.chatFont !== 'inherit') ? this.chatFont : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const effectiveSize = `${this.chatFontSize || 14}px`;

    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--mascot-chat-font', effectiveFont);
      document.documentElement.style.setProperty('--mascot-chat-font-size', effectiveSize);

      const elements = [
        this.bubbleEl,
        this.bubbleText,
        this.input,
        this.letterboxDrawer,
        document.getElementById('speech-bubble-text'),
        document.getElementById('direct-chat-input'),
        document.getElementById('mascot-font-preview-box')
      ];

      elements.forEach(el => {
        if (el) {
          el.style.setProperty('font-family', effectiveFont, 'important');
          el.style.setProperty('font-size', effectiveSize, 'important');
        }
      });

      const cards = document.querySelectorAll('.letter-card, .letter-card-content');
      cards.forEach(c => {
        c.style.setProperty('font-family', effectiveFont, 'important');
        c.style.setProperty('font-size', effectiveSize, 'important');
      });
    }
  }

  /**
   * Render loop tick update.
   */
  update() {
    this.updatePosition();
  }
}
